import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Screen, ScreenScroll, ScreenHeader } from '@/components/ui/Screen';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { useTheme, ThemePreference } from '@/lib/ThemeContext';
import { palettes, space, radius } from '@/lib/theme';

const OPTIONS: { key: ThemePreference; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', label: 'Light', hint: 'Easier to read in a bright house or outdoors', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', hint: 'Kinder at night and easier on the battery', icon: 'moon-outline' },
  { key: 'system', label: 'Match my phone', hint: 'Follows your phone’s own light/dark setting', icon: 'phone-portrait-outline' },
];

export default function AppearanceScreen() {
  const { colors, preference, setPreference, scheme } = useTheme();

  return (
    <Screen>
      <ScreenHeader title="Appearance" subtitle="How Boma looks on this phone" />
      <ScreenScroll>
        {/* A live sample so the choice is judged by what it looks like, not
            by the name of the option. */}
        <View style={styles.previewRow}>
          <Preview mode="light" active={scheme === 'light'} />
          <Preview mode="dark" active={scheme === 'dark'} />
        </View>

        <Card padded={false} style={{ marginTop: space.xl }}>
          {OPTIONS.map((opt, i) => {
            const active = preference === opt.key;
            return (
              <FadeInView key={opt.key} index={i}>
                <AnimatedPressable
                  onPress={() => setPreference(opt.key)}
                  haptic="selection"
                  scaleTo={0.99}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}>
                  <View
                    style={[
                      styles.row,
                      i < OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderFaint },
                    ]}>
                    <View style={[styles.iconWrap, { backgroundColor: active ? colors.accentSoft : colors.surfaceSunken }]}>
                      <Ionicons name={opt.icon} size={19} color={active ? colors.accent : colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: space.md }}>
                      <Text variant="bodyMed">{opt.label}</Text>
                      <Text variant="caption" tone="tertiary" style={{ marginTop: 1 }}>{opt.hint}</Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                    ) : (
                      <View style={[styles.radio, { borderColor: colors.borderStrong }]} />
                    )}
                  </View>
                </AnimatedPressable>
              </FadeInView>
            );
          })}
        </Card>

        <Text variant="caption" tone="tertiary" style={{ marginTop: space.lg }}>
          Your choice is saved on this phone and stays put next time you open Boma.
        </Text>
      </ScreenScroll>
    </Screen>
  );
}

/** Miniature of a Boma screen rendered in the opposite palette, so both
 *  options can be compared side by side without switching. */
function Preview({ mode, active }: { mode: 'light' | 'dark'; active: boolean }) {
  const { colors } = useTheme();
  const p = palettes[mode];

  return (
    <View style={{ flex: 1 }}>
      <View
        style={[
          styles.preview,
          {
            backgroundColor: p.bg,
            borderColor: active ? colors.accent : colors.border,
            borderWidth: active ? 2 : 1,
          },
        ]}>
        <View style={[styles.pvBar, { backgroundColor: p.surface, borderColor: p.border }]}>
          <View style={[styles.pvDot, { backgroundColor: p.accent }]} />
          <View style={[styles.pvLine, { backgroundColor: p.textTertiary, width: 26 }]} />
        </View>
        <View style={[styles.pvCard, { backgroundColor: p.surface, borderColor: p.border }]}>
          <View style={[styles.pvLine, { backgroundColor: p.textTertiary, width: 22 }]} />
          <View style={[styles.pvLine, { backgroundColor: p.accent, width: 46, height: 9, marginTop: 5 }]} />
        </View>
        <View style={[styles.pvCard, { backgroundColor: p.surface, borderColor: p.border, marginTop: 6 }]}>
          <View style={[styles.pvLine, { backgroundColor: p.textTertiary, width: 34 }]} />
        </View>
      </View>
      <Text variant="micro" tone={active ? 'accent' : 'tertiary'} style={{ textAlign: 'center', marginTop: 6 }}>
        {mode === 'light' ? 'LIGHT' : 'DARK'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  previewRow: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  preview: { height: 132, borderRadius: radius.lg, padding: space.sm, justifyContent: 'flex-start' },
  pvBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 5,
    borderRadius: radius.xs,
    borderWidth: 1,
    marginBottom: 8,
  },
  pvDot: { width: 10, height: 10, borderRadius: 5 },
  pvCard: { padding: 7, borderRadius: radius.xs, borderWidth: 1 },
  pvLine: { height: 5, borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.lg },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 2 },
});
