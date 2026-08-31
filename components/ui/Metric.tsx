import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from './Text';
import { Card } from './Card';
import { AnimatedPressable } from './AnimatedPressable';
import { Sparkline, BulletTrack } from './Charts';
import { useTheme } from '@/lib/ThemeContext';
import { space, radius, elevation } from '@/lib/theme';

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'accent';

/**
 * HeroMetric — the single most important number on a screen.
 *
 * v1 gave four metrics identical tiles, so the eye had nothing to land on
 * (Von Restorff: if everything is emphasised, nothing is). A screen now gets
 * exactly one of these, and it carries a plain-language verdict so the farmer
 * reads a conclusion, not just a figure.
 */
export function HeroMetric({
  label,
  value,
  verdict,
  tone = 'primary',
  trend,
  footer,
  onPress,
  style,
}: {
  label: string;
  value: string;
  /** One line telling the farmer what the number means for them. */
  verdict?: string;
  tone?: Tone;
  trend?: number[];
  footer?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  const accentFor: Record<Tone, string> = {
    primary: colors.textPrimary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };
  const softFor: Record<Tone, string> = {
    primary: colors.surfaceSunken,
    accent: colors.accentSoft,
    success: colors.successSoft,
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
  };

  const body = (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          ...elevation(1, colors.shadow),
        },
        style,
      ]}>
      <View style={styles.heroHead}>
        <Text variant="micro" tone="tertiary">{label.toUpperCase()}</Text>
        {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textQuiet} /> : null}
      </View>

      <Text variant="statHero" style={{ color: accentFor[tone], marginTop: space.sm }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>

      {verdict ? (
        <View style={[styles.verdict, { backgroundColor: softFor[tone] }]}>
          <Text variant="caption" style={{ color: tone === 'primary' ? colors.textSecondary : accentFor[tone] }}>
            {verdict}
          </Text>
        </View>
      ) : null}

      {trend && trend.length > 1 ? (
        <Sparkline
          data={trend}
          tone={tone === 'primary' ? 'quiet' : (tone as any)}
          height={30}
          style={{ marginTop: space.lg }}
        />
      ) : null}

      {footer ? <View style={{ marginTop: space.lg }}>{footer}</View> : null}
    </View>
  );

  return onPress ? (
    <AnimatedPressable onPress={onPress} haptic="selection" scaleTo={0.985}>
      {body}
    </AnimatedPressable>
  ) : (
    body
  );
}

/**
 * MetricRow — supporting figures, grouped inside one bounded region.
 *
 * Gestalt (common region + proximity): related numbers belong in a single
 * container with dividers, not scattered as four free-floating cards that
 * each shout for equal attention.
 */
export function MetricRow({
  items,
  style,
}: {
  items: {
    label: string;
    value: string;
    tone?: Tone;
    sub?: string;
    onPress?: () => void;
  }[];
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const toneColor: Record<Tone, string> = {
    primary: colors.textPrimary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };

  return (
    <Card padded={false} style={[styles.rowCard, style]}>
      {items.map((it, i) => {
        const inner = (
          <View style={styles.rowItem}>
            <Text variant="micro" tone="tertiary" numberOfLines={1}>{it.label.toUpperCase()}</Text>
            <Text
              variant="statSm"
              style={{ color: toneColor[it.tone ?? 'primary'], marginTop: 4 }}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {it.value}
            </Text>
            {it.sub ? (
              <Text variant="micro" tone="quiet" numberOfLines={1} style={{ marginTop: 2 }}>{it.sub}</Text>
            ) : null}
          </View>
        );

        return (
          <React.Fragment key={it.label}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.borderFaint }]} /> : null}
            {it.onPress ? (
              <AnimatedPressable onPress={it.onPress} haptic="selection" scaleTo={0.97} style={{ flex: 1 }}>
                {inner}
              </AnimatedPressable>
            ) : (
              inner
            )}
          </React.Fragment>
        );
      })}
    </Card>
  );
}

/**
 * GaugeMetric — a value read against the threshold that makes it good or bad.
 * Used for mortality vs target, FCR vs breed standard, cycle progress.
 */
export function GaugeMetric({
  label,
  value,
  valueText,
  target,
  targetText,
  max,
  tone,
  invert = false,
}: {
  label: string;
  value: number;
  valueText: string;
  target?: number;
  targetText?: string;
  max: number;
  tone?: Tone;
  /** True when lower is better (mortality, FCR, cost). */
  invert?: boolean;
}) {
  const { colors } = useTheme();

  const resolved: Tone =
    tone ??
    (target == null
      ? 'accent'
      : invert
        ? value <= target
          ? 'success'
          : value <= target * 1.5
            ? 'warning'
            : 'danger'
        : value >= target
          ? 'success'
          : 'warning');

  const toneColor: Record<Tone, string> = {
    primary: colors.textPrimary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };

  return (
    <View style={styles.gauge}>
      <View style={styles.gaugeHead}>
        <Text variant="label" tone="secondary">{label}</Text>
        <Text variant="statSm" style={{ color: toneColor[resolved] }}>{valueText}</Text>
      </View>
      <BulletTrack
        value={value}
        target={target}
        max={max}
        tone={resolved === 'primary' ? 'accent' : (resolved as any)}
        style={{ marginTop: space.sm }}
      />
      {targetText ? (
        <Text variant="micro" tone="quiet" style={{ marginTop: 6 }}>{targetText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, borderWidth: 1, padding: space.xl },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verdict: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginTop: space.md,
  },
  rowCard: { flexDirection: 'row', alignItems: 'stretch' },
  rowItem: { flex: 1, paddingVertical: space.lg, paddingHorizontal: space.md, justifyContent: 'center' },
  divider: { width: 1, marginVertical: space.md },
  gauge: { marginTop: space.lg },
  gaugeHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
