import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useFarm } from '@/lib/FarmContext';
import { FarmType } from '@/lib/supabase';
import { space } from '@/lib/theme';

export default function FarmSetupScreen() {
  const { types } = useLocalSearchParams<{ types: string }>();
  const selectedTypes = (types?.split(',').filter(Boolean) ?? ['broiler']) as FarmType[];
  const { createFarm } = useFarm();

  const [name, setName] = useState('');
  const [county, setCounty] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async () => {
    if (!name.trim()) { setError('Give your farm a name.'); return; }
    setSaving(true);
    setError(null);
    try {
      await createFarm(name.trim(), county.trim(), selectedTypes);
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingScaffold
      step={5} totalSteps={5}
      eyebrow="Almost there"
      title="Name your farm"
      subtitle="This is what you and your team will see everywhere in Boma."
      footer={<Button label="Create my farm" onPress={onFinish} loading={saving} size="lg" />}>
      <Field label="Farm name" value={name} onChangeText={setName} placeholder="e.g. Wanjiru Farm" autoFocus />
      <Field label="County" value={county} onChangeText={setCounty} placeholder="e.g. Kiambu" />
      {error ? <Text variant="caption" tone="danger">{error}</Text> : null}
      <Text variant="caption" tone="tertiary" style={{ marginTop: space.md }}>
        You'll set your standard bird price and other details once you're inside — nothing here is final.
      </Text>
    </OnboardingScaffold>
  );
}
