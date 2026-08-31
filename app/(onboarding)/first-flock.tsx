import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { space, radius } from '@/lib/theme';

/**
 * The activation moment — the last onboarding step, and the one that matters.
 *
 * Until a flock exists, every screen in Boma is empty: Home shows zeros,
 * Reports shows nothing, and there is no reason to open the app tomorrow.
 * The moment this saves, the database trigger seeds the vaccination
 * schedule, the 42-day cycle clock starts, and the farmer lands on a Home
 * screen that is already alive. Skippable — a trapped user abandons — but
 * skipping is the exception path, not the default.
 */

const AGE_CHOICES = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'A week ago', days: 7 },
  { label: '2 weeks ago', days: 14 },
] as const;

export default function FirstFlockScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();

  const [chicks, setChicks] = useState('');
  const [cost, setCost] = useState('100');
  const [agoDays, setAgoDays] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!farm || !chicks) return;
    setSaving(true);
    setError(null);

    const arrived = new Date(Date.now() - agoDays * 86400000).toISOString().slice(0, 10);
    const { error: err } = await supabase.from('flocks').insert({
      farm_id: farm.id,
      flock_code: '', // trigger fills this in
      date_arrived: arrived,
      chicks_received: Number(chicks),
      breed: 'Cobb 500',
      cost_per_chick: Number(cost) || 0,
      weeks_to_market: farm.default_weeks_to_market ?? 6,
    });
    setSaving(false);

    if (err) { setError(err.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/');
  };

  return (
    <OnboardingScaffold
      step={6} totalSteps={6}
      eyebrow="Last step"
      title="Add the birds you have now"
      subtitle="From this one entry Boma builds your vaccination schedule, growth clock and profit forecast."
      footer={
        <View style={{ gap: space.sm }}>
          <Button label="Start tracking this batch" onPress={create} loading={saving} disabled={!chicks} size="lg" />
          <AnimatedPressable onPress={() => router.replace('/')} haptic="selection" style={styles.skip}>
            <Text variant="bodyMed" tone="tertiary">I don't have birds yet — skip</Text>
          </AnimatedPressable>
        </View>
      }>
      <Field label="How many chicks?" value={chicks} onChangeText={setChicks} keyboardType="number-pad" placeholder="e.g. 300" autoFocus />
      <Field label="Cost per chick" value={cost} onChangeText={setCost} keyboardType="decimal-pad" suffix="KES" />

      <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>WHEN DID THEY ARRIVE?</Text>
      <View style={styles.chips}>
        {AGE_CHOICES.map((c) => {
          const active = agoDays === c.days;
          return (
            <AnimatedPressable
              key={c.label}
              onPress={() => setAgoDays(c.days)}
              haptic="selection"
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.accent : colors.surfaceSunken,
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}>
              <Text variant="bodyMed" tone={active ? 'inverse' : 'secondary'}>{c.label}</Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {error ? <Text variant="caption" tone="danger" style={{ marginTop: space.md }}>{error}</Text> : null}
      <Text variant="caption" tone="tertiary" style={{ marginTop: space.lg }}>
        You can change any of this later, and add more batches any time.
      </Text>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: space.lg, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1 },
  skip: { alignItems: 'center', paddingVertical: 10 },
});
