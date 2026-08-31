import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
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

// ---------------------------------------------------------------------------
// GrowthCurve — logged weigh-ins against a breed target, two-series line
// ---------------------------------------------------------------------------
// No SVG dependency in this project, so a two-series line chart is built from
// plain Views: each segment between two points is a 2px-tall View sized to
// the distance between them and rotated to the angle between them — a
// standard RN technique for a "line" without a drawing surface. At this data
// density (a handful of weigh-ins over a 6-week cycle) it renders crisply on
// any Android device and costs nothing extra to ship.
export interface CurvePoint { day: number; kg: number; }

export function GrowthCurve({
  actual,
  target,
  height = 160,
  maxDay,
}: {
  /** The flock's own logged weigh-ins, sorted by day. */
  actual: CurvePoint[];
  /** Breed performance-objective curve for the same day range. */
  target: CurvePoint[];
  height?: number;
  maxDay: number;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const allKg = [...actual, ...target].map((p) => p.kg);
  const maxKg = Math.max(...allKg, 0.1) * 1.12; // headroom so the top point isn't clipped

  const toXY = (p: CurvePoint) => ({
    x: (p.day / Math.max(1, maxDay)) * width,
    y: height - (p.kg / maxKg) * height,
  });

  function Line({ points, color, thickness, dashed }: { points: CurvePoint[]; color: string; thickness: number; dashed?: boolean }) {
    if (points.length < 2 || width === 0) return null;
    const xy = points.map(toXY);
    return (
      <>
        {xy.slice(0, -1).map((a, i) => {
          const b = xy[i + 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          // Center-pivot rotation rather than transformOrigin (broader RN
          // version support): position the segment by its own midpoint,
          // where the default rotation origin already sits.
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: midX - dist / 2,
                top: midY - thickness / 2,
                width: dist,
                height: thickness,
                backgroundColor: color,
                opacity: dashed ? 0.4 : 1,
                borderRadius: thickness / 2,
                transform: [{ rotate: `${angle}rad` }],
              }}
            />
          );
        })}
      </>
    );
  }

  return (
    <View onLayout={onLayout} style={{ height, width: '100%' }}>
      {/* Baseline grid — a single mid-line is enough context at this size
          without turning the chart into a spreadsheet. */}
      <View style={[styles.curveGrid, { top: height / 2, backgroundColor: colors.borderFaint }]} />

      <Line points={target} color={colors.textQuiet} thickness={2} dashed />
      <Line points={actual} color={colors.accent} thickness={3} />

      {width > 0 &&
        actual.map((p, i) => {
          const { x, y } = toXY(p);
          return (
            <View
              key={i}
              style={[
                styles.curveDot,
                { left: x - 4, top: y - 4, backgroundColor: colors.accent, borderColor: colors.surface },
              ]}
            />
          );
        })}
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
  curveGrid: { position: 'absolute', left: 0, right: 0, height: 1 },
  curveDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
});
