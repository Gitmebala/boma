import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useFarm } from '@/lib/FarmContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase, FarmType } from '@/lib/supabase';
import { space } from '@/lib/theme';

export default function FarmSetupScreen() {
  const { types } = useLocalSearchParams<{ types: string }>();
  const selectedTypes = (types?.split(',').filter(Boolean) ?? ['broiler']) as FarmType[];
  const { createFarm } = useFarm();
  const { session, refreshProfile } = useAuth();

  const [yourName, setYourName] = useState('');
  const [name, setName] = useState('');
  const [county, setCounty] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async () => {
    if (!name.trim()) { setError('Give your farm a name.'); return; }
    setSaving(true);
    setError(null);
    try {
      // The greeting on Home is "Good morning, <name>" — without this the
      // comma hangs there forever. Saved before the farm so the app knows
      // who it's talking to from the very first screen.
      if (yourName.trim() && session?.user) {
        await supabase.from('profiles').update({ full_name: yourName.trim() }).eq('id', session.user.id);
        await refreshProfile();
      }
      await createFarm(name.trim(), county.trim(), selectedTypes);
      // Onboarding is NOT done at "farm created" — an empty Home is the
      // moment most new users quit. The activating action is the first batch.
      router.replace('/(onboarding)/first-flock' as any);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingScaffold
      step={5} totalSteps={6}
      eyebrow="Almost there"
      title="Name your farm"
      subtitle="This is what you and your team will see everywhere in Boma."
      footer={<Button label="Continue" onPress={onFinish} loading={saving} size="lg" />}>
      <Field label="Your name" value={yourName} onChangeText={setYourName} placeholder="e.g. Michael" autoFocus />
      <Field label="Farm name" value={name} onChangeText={setName} placeholder="e.g. Wanjiru Farm" />
      <Field label="County" value={county} onChangeText={setCounty} placeholder="Optional — e.g. Kiambu" />
      {error ? <Text variant="caption" tone="danger">{error}</Text> : null}
      <Text variant="caption" tone="tertiary" style={{ marginTop: space.md }}>
        You'll set your standard bird price and other details once you're inside — nothing here is final.
      </Text>
    </OnboardingScaffold>
  );
}
