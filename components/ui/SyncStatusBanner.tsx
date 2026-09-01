import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from './Text';
import { AnimatedPressable } from './AnimatedPressable';
import { useTheme } from '@/lib/ThemeContext';
import { useSync } from '@/lib/sync';
import { useTranslation } from '@/lib/i18n';
import { space, radius } from '@/lib/theme';

/**
 * The honest half of the offline-write contract.
 *
 * enqueueInsert() lets a farmer feel instant success the moment an entry is
 * durably on their phone — but that's only honest if the app also tells them,
 * plainly, when something hasn't reached the server yet. This is that
 * telling: silent when the queue is empty, otherwise a calm status line
 * naming exactly what's pending and why, never alarming (amber, not red —
 * "waiting for signal" is normal, not a failure).
 */
export function SyncStatusBanner() {
  const { colors } = useTheme();
  const { pendingCount, isOnline, isSyncing, lastFatalError, retryNow } = useSync();
  const { t } = useTranslation();

  if (pendingCount === 0 && !lastFatalError) return null;

  const fatal = !!lastFatalError;
  const bg = fatal ? colors.dangerSoft : colors.warningSoft;
  const fg = fatal ? colors.danger : colors.warning;

  const label = fatal
    ? t('sync.couldNotSave')
    : pendingCount === 1
      ? t('sync.onePending')
      : t('sync.manyPending', { count: pendingCount });

  const sub = fatal
    ? lastFatalError
    : isSyncing
      ? t('sync.syncing')
      : isOnline
        ? t('sync.willSync')
        : t('sync.savedOnPhone');

  return (
    <AnimatedPressable onPress={retryNow} haptic="light" scaleTo={0.99}>
      <View style={[styles.wrap, { backgroundColor: bg }]}>
        <Ionicons
          name={fatal ? 'alert-circle' : isSyncing ? 'sync' : 'cloud-offline-outline'}
          size={16}
          color={fg}
        />
        <View style={{ flex: 1, marginLeft: space.sm }}>
          <Text variant="caption" style={{ color: fg }} numberOfLines={1}>{label}</Text>
          {sub ? (
            <Text variant="micro" style={{ color: fg, opacity: 0.8, marginTop: 1 }} numberOfLines={1}>{sub}</Text>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingVertical: space.sm,
    marginHorizontal: space.gutter,
    marginTop: space.sm,
    borderRadius: radius.md,
  },
});
