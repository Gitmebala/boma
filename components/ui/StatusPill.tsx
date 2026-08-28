import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space } from '@/lib/theme';

export type Status = 'overdue' | 'attention' | 'fine' | 'neutral';

const LABEL: Record<Status, string> = {
  overdue: 'Overdue',
  attention: 'Due soon',
  fine: 'On track',
  neutral: '',
};

/** Semantic color, never decorative — these three colors mean the same thing everywhere in Boma. */
export function StatusPill({ status, label }: { status: Status; label?: string }) {
  const { colors } = useTheme();
  const map = {
    overdue: { bg: colors.dangerSoft, fg: colors.danger },
    attention: { bg: colors.warningSoft, fg: colors.warning },
    fine: { bg: colors.successSoft, fg: colors.success },
    neutral: { bg: colors.surfaceSunken, fg: colors.textSecondary },
  }[status];

  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <View style={[styles.dot, { backgroundColor: map.fg }]} />
      <Text variant="micro" style={{ color: map.fg }}>{(label ?? LABEL[status]).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
