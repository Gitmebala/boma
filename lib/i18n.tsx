import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import { en } from './locales/en';
import { sw } from './locales/sw';

/**
 * i18n.
 *
 * The language picker stored `profiles.language` from day one, but nothing
 * ever read it back — every string in the app was hardcoded English, so the
 * toggle was a lie. This is a small, dependency-free layer built for exactly
 * what Boma needs: two flat dictionaries and a lookup, not a general-purpose
 * i18n framework the app doesn't have room for.
 *
 * Source of truth by moment:
 *  - Before sign-in (language.tsx, during onboarding): AsyncStorage only,
 *    since there is no profile row yet.
 *  - After sign-in: `profiles.language` is authoritative and is mirrored
 *    into AsyncStorage so the choice survives a cold start before the
 *    profile has loaded.
 */

export type Locale = 'en' | 'sw';
export type Dict = typeof en;

const DICTS: Record<Locale, Dict> = { en, sw };
const STORAGE_KEY = 'boma.locale';

interface I18nCtx {
  locale: Locale;
  /** Change the language. Persists to the profile when signed in. */
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

// Every leaf value in en.ts, dot-joined — gives autocomplete + a compile
// error on a typo'd key instead of a silently blank label at runtime.
type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : K) : never;
type Leaves<T> = {
  [K in keyof T]: T[K] extends string ? K : Join<K, Leaves<T[K]>>;
}[keyof T];
export type TranslationKey = Leaves<Dict> & string;

const I18nContext = createContext<I18nCtx>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

function lookup(dict: Dict, key: string): string | undefined {
  let node: any = dict;
  for (const part of key.split('.')) {
    node = node?.[part];
    if (node === undefined) return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => (name in vars ? String(vars[name]) : `{{${name}}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [locale, setLocaleState] = useState<Locale>('en');
  const [hydrated, setHydrated] = useState(false);

  // Cold start: read whatever was chosen last, before the profile (if any)
  // has loaded, so there's no flash of the wrong language.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'en' || v === 'sw') setLocaleState(v);
      })
      .finally(() => setHydrated(true));
  }, []);

  // Once signed in, the profile is authoritative — e.g. switching phones.
  useEffect(() => {
    if (profile?.language && profile.language !== locale) {
      setLocaleState(profile.language);
      AsyncStorage.setItem(STORAGE_KEY, profile.language).catch(() => {});
    }
    // Only react to the profile changing, not to local `locale` writes below —
    // otherwise this would immediately stomp a just-made local selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.language]);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
      if (profile?.id) {
        supabase.from('profiles').update({ language: l }).eq('id', profile.id).then(() => {});
      }
    },
    [profile?.id]
  );

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const value = lookup(DICTS[locale], key) ?? lookup(en, key) ?? key;
      return interpolate(value, vars);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  // Render immediately with the default rather than blocking the tree on
  // AsyncStorage — a one-frame flash of English is preferable to a blank
  // screen, and `hydrated` is only needed if a caller wants to gate on it.
  void hydrated;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useTranslation = () => useContext(I18nContext);

/**
 * Display label for a value stored in English in the database (expense
 * categories, payment methods, customer types). The stored value is the
 * canonical one queries and cost-breakdown logic match against — only the
 * label shown to the farmer changes with locale.
 */
export function useConstantLabel() {
  const { locale } = useTranslation();
  return useCallback(
    (value: string) => {
      const dict = DICTS[locale].constants as Record<string, string>;
      return dict[value] ?? value;
    },
    [locale]
  );
}
