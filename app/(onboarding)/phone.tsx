import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space, font } from '@/lib/theme';

export default function PhoneScreen() {
  const { colors } = useTheme();
  const { sendCode, devSignIn } = useAuth();
  const [digits, setDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDevSkip = async () => {
    setDevLoading(true);
    setError(null);
    const { error: err } = await devSignIn();
    setDevLoading(false);
    if (err) { setError(err); return; }
    router.replace('/'); // root index.tsx routes on to farm-type since there's no farm yet
  };

  const fullPhone = `+254${digits.replace(/^0+/, '')}`;
  const valid = digits.replace(/\D/g, '').length >= 9;

  const onContinue = async () => {
    if (!valid) return;
    setLoading(true);
    setError(null);
    const { error: err } = await sendCode(fullPhone);
    setLoading(false);
    if (err) { setError(err); return; }
    router.push({ pathname: '/(onboarding)/verify', params: { phone: fullPhone } });
  };

  return (
    <OnboardingScaffold
      step={2} totalSteps={5}
      eyebrow="No password needed"
      title="What's your phone number?"
      subtitle="We'll text you a 6-digit code to confirm it's you."
      footer={
        <Button label="Send code" onPress={onContinue} loading={loading} disabled={!valid} size="lg" />
      }>
      <View style={[styles.row, { backgroundColor: colors.surfaceSunken, borderColor: error ? colors.danger : colors.border }]}>
        <Text variant="h3" tone="secondary">🇰🇪 +254</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TextInput
          value={digits}
          onChangeText={(t) => setDigits(t.replace(/\D/g, '').slice(0, 9))}
          placeholder="712 345 678"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          style={[styles.input, { color: colors.textPrimary, fontFamily: font.displaySemi }]}
          autoFocus
        />
      </View>
      {error ? <Text variant="caption" tone="danger" style={{ marginTop: space.sm }}>{error}</Text> : null}

      {__DEV__ && (
        <View style={{ marginTop: space.xxl, alignItems: 'center' }}>
          <View style={[styles.devDivider, { backgroundColor: colors.border }]} />
          <Text variant="micro" tone="tertiary" style={{ marginTop: space.lg, marginBottom: space.sm }}>
            DEV ONLY — NO SMS PROVIDER CONFIGURED YET
          </Text>
          <Button
            label={devLoading ? 'Signing in…' : 'Skip — preview with a test account'}
            variant="secondary"
            fullWidth={false}
            loading={devLoading}
            onPress={onDevSkip}
          />
        </View>
      )}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1.5,
    paddingHorizontal: space.lg, minHeight: 64,
  },
  divider: { width: 1, height: 28, marginHorizontal: space.md },
  input: { flex: 1, fontSize: 20, letterSpacing: 0.5 },
  devDivider: { height: 1, width: '100%' },
});
