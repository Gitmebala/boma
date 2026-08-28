import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { FadeInView } from '@/components/ui/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space } from '@/lib/theme';
import { FarmType } from '@/lib/supabase';

const TYPES: { code: FarmType; label: string; icon: keyof typeof Ionicons.glyphMap; ready: boolean }[] = [
  { code: 'broiler', label: 'Broilers', icon: 'nutrition', ready: true },
  { code: 'layers', label: 'Layers (eggs)', icon: 'egg', ready: false },
  { code: 'dairy', label: 'Dairy cattle', icon: 'water', ready: false },
  { code: 'goats_sheep', label: 'Goats & sheep', icon: 'paw', ready: false },
  { code: 'crops', label: 'Crops', icon: 'leaf', ready: false },
  { code: 'fish', label: 'Fish farming', icon: 'fish', ready: false },
];

export default function FarmTypeScreen() {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<Set<FarmType>>(new Set(['broiler']));

  const toggle = (code: FarmType) => {
    const next = new Set(selected);
    next.has(code) ? next.delete(code) : next.add(code);
    setSelected(next);
  };

  const onContinue = () => {
    router.push({ pathname: '/(onboarding)/farm-setup', params: { types: Array.from(selected).join(',') } });
  };

  return (
    <OnboardingScaffold
      step={4} totalSteps={5}
      eyebrow="Your farm"
      title="What do you farm?"
      subtitle="Pick everything that applies — you can add more later."
      footer={<Button label={`Continue with ${selected.size} type${selected.size === 1 ? '' : 's'}`} onPress={onContinue} disabled={selected.size === 0} size="lg" />}>
      <View style={styles.grid}>
        {TYPES.map((t, i) => {
          const active = selected.has(t.code);
          return (
            <FadeInView key={t.code} index={i} style={styles.gridItem}>
              <AnimatedPressable
                onPress={() => toggle(t.code)}
                haptic="selection"
                scaleTo={0.96}
                style={[
                  styles.tile,
                  { backgroundColor: colors.surface, borderColor: active ? colors.accent : colors.border },
                ]}>
                <View style={[styles.iconCircle, { backgroundColor: active ? colors.accentSoft : colors.surfaceSunken }]}>
                  <Ionicons name={t.icon} size={22} color={active ? colors.accent : colors.textSecondary} />
                </View>
                <Text variant="bodyMed" style={{ marginTop: space.md, textAlign: 'center' }}>{t.label}</Text>
                {!t.ready && <Text variant="micro" tone="tertiary" style={{ marginTop: 2 }}>COMING SOON</Text>}
                {active && (
                  <View style={[styles.check, { backgroundColor: colors.accent }]}>
                    <Ionicons name="checkmark" size={12} color={colors.accentText} />
                  </View>
                )}
              </AnimatedPressable>
            </FadeInView>
          );
        })}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  gridItem: { width: '47%' },
  tile: {
    borderRadius: radius.lg, borderWidth: 1.5, padding: space.lg, alignItems: 'center',
    minHeight: 128, justifyContent: 'center',
  },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  check: {
    position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
