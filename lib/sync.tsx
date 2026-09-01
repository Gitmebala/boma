import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

/**
 * The offline-write layer.
 *
 * The single largest defect an audit found in this app: every write followed
 * `await supabase.from(...).insert(...)` with the returned error discarded,
 * then a success haptic fired and the sheet closed regardless of whether
 * anything actually reached the server. There was no NetInfo, no queue, no
 * retry — on weak signal, a farmer's whole day of logging could vanish while
 * the app told them it worked.
 *
 * The fix is local-write-first: `enqueueWrite` durably persists to
 * AsyncStorage BEFORE returning. That local, immediate persistence — not a
 * server round trip — is what "saved" now means to the UI. A caller gets its
 * id back and fires its success haptic right away; syncing to Supabase
 * happens in the background, and the queue length is the one honest signal
 * of what hasn't reached the server yet.
 *
 * Scope: the three highest-value daily-habit writes (daily_logs, expenses,
 * sales) go through this. Everything else in the app still writes directly —
 * converting the rest is real, but separate, work.
 */

type QueueTable = 'daily_logs' | 'expenses' | 'sales';

interface QueuedWrite {
  /** Client-generated — also becomes the row's real primary key, so a
   *  caller that needs the id (e.g. to attach a receipt to an expense)
   *  has it immediately, before the row has even reached the server. */
  id: string;
  table: QueueTable;
  payload: Record<string, any>;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

const STORAGE_KEY = 'boma.sync-queue.v1';

/** RFC4122 v4. No dependency for this — it only has to be unique among
 *  Boma's own rows, not globally, and this is a dozen lines. */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function loadQueue(): Promise<QueuedWrite[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function persist(items: QueuedWrite[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // If the device can't even persist to AsyncStorage there is nothing
    // better to fall back to here — the in-memory copy for this session
    // still has it, which beats throwing the entry away outright.
  }
}

interface SyncCtx {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  /** The failure a farmer actually needs to know about — not "no signal"
   *  (that's normal and handled by the queue) but the server rejecting a
   *  write outright, which no amount of retrying will fix. */
  lastFatalError: string | null;
  enqueueWrite: (table: QueueTable, payload: Record<string, any>) => Promise<string>;
  /**
   * Amend a write that may not have reached the server yet (e.g. attaching
   * a receipt URL to an expense after the fact). If the row is still
   * queued, the patch is folded into its payload before it ever syncs —
   * issuing a plain `.update()` in that case would silently touch zero
   * rows, since the row wouldn't exist on the server yet. Returns true if
   * it patched the queue; false means the row has already synced and the
   * caller should update it directly.
   */
  patchQueuedIfPending: (id: string, patch: Record<string, any>) => Promise<boolean>;
  retryNow: () => void;
}

const SyncContext = createContext<SyncCtx>({
  pendingCount: 0,
  isOnline: true,
  isSyncing: false,
  lastFatalError: null,
  enqueueWrite: async () => '',
  patchQueuedIfPending: async () => false,
  retryNow: () => {},
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  // The ref is the single source of truth, mutated synchronously — `queue`
  // (state) exists only to trigger re-renders for `pendingCount`. Reading
  // React state for a value that three different async functions
  // (enqueue/flush/patch) all need to agree on in the same tick is exactly
  // the kind of stale-closure trap that caused this app's original bug;
  // a ref sidesteps it entirely.
  const queueRef = useRef<QueuedWrite[]>([]);
  const [, bumpVersion] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [lastFatalError, setLastFatalError] = useState<string | null>(null);
  const flushingRef = useRef(false);

  const commit = useCallback((next: QueuedWrite[]) => {
    queueRef.current = next;
    bumpVersion((v) => v + 1);
    return persist(next);
  }, []);

  // Cold start: recover whatever didn't make it out last session.
  useEffect(() => {
    loadQueue().then((q) => {
      queueRef.current = q;
      bumpVersion((v) => v + 1);
      setHydrated(true);
    });
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    setIsSyncing(true);
    try {
      const current = queueRef.current;
      const remaining: QueuedWrite[] = [];
      let stopEarly = false;
      let fatal: string | null = null;

      for (const item of current) {
        if (stopEarly) {
          remaining.push(item);
          continue;
        }

        try {
          const { error } = await supabase.from(item.table).insert({ id: item.id, ...item.payload });

          if (!error) continue; // reached the server — drop from the queue

          // 23505 = unique_violation. An earlier attempt actually landed and
          // only the local acknowledgement was lost (e.g. the app was
          // killed mid-request) — a success, not a failure.
          if (error.code === '23505') continue;

          // A rejection with a Postgres error code (RLS denial, a check
          // constraint, a bad foreign key) fails identically forever — no
          // amount of retrying fixes it, and it must not be presented as
          // "no signal, hang tight" or the farmer never learns their entry
          // is stuck. No code at all (a network-level failure) is the
          // ordinary, expected, silently-retried case.
          if (error.code) fatal = error.message;

          remaining.push({ ...item, attempts: item.attempts + 1, lastError: error.message });
        } catch (e: any) {
          // A thrown exception (e.g. aborted mid-request) is treated the
          // same as a network-level failure: retry later, no fatal banner.
          remaining.push({ ...item, attempts: item.attempts + 1, lastError: e?.message ?? 'Network error' });
        }
        // Stop at the first failure in a batch: if it's connectivity, every
        // later item will fail identically, and there's no reason to burn
        // through the rest of the farmer's data bundle finding that out N
        // more times.
        stopEarly = true;
      }

      await commit(remaining);
      setLastFatalError(fatal);
    } finally {
      flushingRef.current = false;
      setIsSyncing(false);
    }
  }, [commit]);

  // Sync on cold start, whenever connectivity returns, and on a slow
  // fallback timer in case a NetInfo event is ever missed.
  useEffect(() => {
    if (!hydrated) return;
    flush();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online) flush();
    });
    const interval = setInterval(flush, 45_000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [hydrated, flush]);

  const enqueueWrite = useCallback(
    async (table: QueueTable, payload: Record<string, any>) => {
      const item: QueuedWrite = { id: randomUUID(), table, payload, createdAt: Date.now(), attempts: 0 };
      // Durable BEFORE returning — this line is what "saved" now means.
      await commit([...queueRef.current, item]);
      flush(); // opportunistic; the caller's success does not wait on this
      return item.id;
    },
    [commit, flush]
  );

  const patchQueuedIfPending = useCallback(
    async (id: string, patch: Record<string, any>) => {
      const idx = queueRef.current.findIndex((i) => i.id === id);
      if (idx === -1) return false;
      const next = [...queueRef.current];
      next[idx] = { ...next[idx], payload: { ...next[idx].payload, ...patch } };
      await commit(next);
      return true;
    },
    [commit]
  );

  const value: SyncCtx = {
    pendingCount: queueRef.current.length,
    isOnline,
    isSyncing,
    lastFatalError,
    enqueueWrite,
    patchQueuedIfPending,
    retryNow: flush,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export const useSync = () => useContext(SyncContext);
