import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { FadeInView } from '@/components/ui/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { useTranslation } from '@/lib/i18n';
import { radius, space } from '@/lib/theme';

const OPTIONS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'sw', label: 'Kiswahili', native: 'Kiswahili' },
] as const;

export default function LanguageScreen() {
  const { colors } = useTheme();
  const { setLocale } = useTranslation();
  const [selected, setSelected] = useState<'en' | 'sw'>('en');

  const onContinue = async () => {
    // Goes through the provider so the rest of onboarding is already in the
    // chosen language — there is no profile row yet to read it from.
    setLocale(selected);
    await AsyncStorage.setItem('boma_language', selected);
    router.push('/(onboarding)/phone');
  };

  return (
    <OnboardingScaffold
      step={1} totalSteps={5} showBack={false}
      eyebrow="Welcome to Boma"
      title="Choose your language"
      subtitle="You can change this any time in Settings."
      footer={<Button label="Continue" onPress={onContinue} size="lg" />}>
      <View style={{ gap: space.md }}>
        {OPTIONS.map((opt, i) => (
          <FadeInView key={opt.code} index={i}>
            <AnimatedPressable
              onPress={() => setSelected(opt.code)}
              haptic="selection"
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: selected === opt.code ? colors.accent : colors.border },
              ]}>
              <View>
                <Text variant="h2">{opt.native}</Text>
                <Text variant="caption" tone="tertiary">{opt.label}</Text>
              </View>
              <View style={[styles.radio, { borderColor: selected === opt.code ? colors.accent : colors.border }]}>
                {selected === opt.code && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
              </View>
            </AnimatedPressable>
          </FadeInView>
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: space.xl, borderRadius: radius.lg, borderWidth: 1.5,
  },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
});
