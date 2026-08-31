import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from './Text';
import { useTheme } from '@/lib/ThemeContext';
import { space, radius } from '@/lib/theme';

/**
 * Small, honest charts.
 *
 * Deliberately built from plain Views rather than pulling in a chart library:
 * at this size a bar sparkline and a bullet track carry more meaning per pixel
 * than a smoothed line would, and they stay crisp on cheap Android screens.
 */

// ---------------------------------------------------------------------------
// Sparkline — shape of a trend, not exact values
// ---------------------------------------------------------------------------
export function Sparkline({
  data,
  height = 34,
  tone = 'accent',
  highlightLast = true,
  style,
}: {
  data: number[];
  height?: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'quiet';
  highlightLast?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const toneColor = {
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    quiet: colors.textQuiet,
  }[tone];

  if (!data.length) return <View style={[{ height }, style]} />;

  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const span = max - min || 1;

  return (
    <View style={[styles.sparkRow, { height }, style]}>
      {data.map((v, i) => {
        const isLast = i === data.length - 1;
        // Floor at 3px so a zero day still reads as "a day with no value"
        // rather than vanishing — absence of data and a value of zero are
        // different facts and shouldn't look identical.
        const h = Math.max(3, ((v - min) / span) * height);
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: h,
              marginHorizontal: 1,
              borderRadius: 2,
              backgroundColor: toneColor,
              opacity: highlightLast && !isLast ? 0.28 : 1,
            }}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// BulletTrack — actual against a target, in one line (Tufte's bullet graph)
// ---------------------------------------------------------------------------
export function BulletTrack({
  value,
  target,
  max,
  tone = 'accent',
  height = 8,
  showTarget = true,
  style,
}: {
  value: number;
  /** Where the acceptable threshold sits, in the same unit as `value`. */
  target?: number;
  max: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  height?: number;
  showTarget?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const toneColor = {
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  const safeMax = max || 1;
  const pct = Math.max(0, Math.min(1, value / safeMax));
  const targetPct = target != null ? Math.max(0, Math.min(1, target / safeMax)) : null;

  return (
    <View style={[{ height, backgroundColor: colors.surfaceSunken, borderRadius: height / 2 }, styles.bulletTrack, style]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          backgroundColor: toneColor,
          borderRadius: height / 2,
        }}
      />
      {showTarget && targetPct != null && (
        <View
          style={[
            styles.targetMark,
            { left: `${targetPct * 100}%`, backgroundColor: colors.textPrimary, height: height + 6, top: -3 },
          ]}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// TrendPill — a delta, with direction and meaning
// ---------------------------------------------------------------------------
export function TrendPill({
  delta,
  suffix = '%',
  /** Set false where a rise is bad (mortality, cost). */
  upIsGood = true,
  label,
}: {
  delta: number;
  suffix?: string;
  upIsGood?: boolean;
  label?: string;
}) {
  const { colors } = useTheme();
  const flat = Math.abs(delta) < 0.05;
  const good = flat ? null : delta > 0 === upIsGood;

  const fg = flat ? colors.textTertiary : good ? colors.success : colors.danger;
  const bg = flat ? colors.surfaceSunken : good ? colors.successSoft : colors.dangerSoft;

  return (
    <View style={[styles.trendPill, { backgroundColor: bg }]}>
      <Ionicons
        name={flat ? 'remove' : delta > 0 ? 'arrow-up' : 'arrow-down'}
        size={11}
        color={fg}
      />
      <Text variant="micro" style={{ color: fg, marginLeft: 3 }}>
        {flat ? '—' : `${Math.abs(delta).toFixed(1)}${suffix}`}
      </Text>
      {label ? (
        <Text variant="micro" style={{ color: fg, marginLeft: 4, opacity: 0.75 }}>{label}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// StackedBar — composition of a total (cost breakdown)
// ---------------------------------------------------------------------------
export function StackedBar({
  segments,
  height = 12,
}: {
  segments: { value: number; color: string; label: string }[];
  height?: number;
}) {
  const { colors } = useTheme();
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return <View style={{ height, borderRadius: height / 2, backgroundColor: colors.surfaceSunken }} />;
  }
  return (
    <View style={{ height, borderRadius: height / 2, overflow: 'hidden', flexDirection: 'row' }}>
      {segments.map((s, i) =>
        s.value > 0 ? (
          <View key={i} style={{ flex: s.value, backgroundColor: s.color }} />
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bulletTrack: { overflow: 'visible', justifyContent: 'center' },
  targetMark: { position: 'absolute', width: 2, borderRadius: 1, opacity: 0.55 },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
