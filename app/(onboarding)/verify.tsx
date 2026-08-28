import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { radius, font } from '@/lib/theme';

const LEN = 6;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyCode, sendCode } = useAuth();
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(30);
  const inputRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);

  useEffect(() => {
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (code.length === LEN) submit();
  }, [code]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const submit = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await verifyCode(phone, code);
    setLoading(false);
    if (err) {
      setError('That code didn\'t match. Try again.');
      setCode('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 }));
      return;
    }
    // Root index.tsx will redirect once session is set (no farm yet -> farm-type)
    router.replace('/');
  };

  const resend = async () => {
    setResendIn(30);
    await sendCode(phone);
    Haptics.selectionAsync();
  };

  return (
    <OnboardingScaffold
      step={3} totalSteps={5}
      eyebrow="Check your messages"
      title="Enter the code"
      subtitle={`We sent a 6-digit code to ${phone}`}
      footer={
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Button label="Confirm" onPress={submit} loading={loading} disabled={code.length < LEN} size="lg" />
          <Button
            label={resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            onPress={resend} variant="ghost" fullWidth={false} disabled={resendIn > 0}
          />
        </View>
      }>
      <Animated.View style={shakeStyle}>
        <View style={styles.boxRow}>
          {Array.from({ length: LEN }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.box,
                {
                  backgroundColor: colors.surfaceSunken,
                  borderColor: error ? colors.danger : code.length === i ? colors.accent : colors.border,
                },
              ]}>
              <Text variant="h1" style={{ fontFamily: font.display }}>{code[i] ?? ''}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, LEN))}
        keyboardType="number-pad"
        autoFocus
        style={styles.hiddenInput}
        maxLength={LEN}
      />
      {error ? <Text variant="caption" tone="danger" style={{ marginTop: 12, textAlign: 'center' }}>{error}</Text> : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  boxRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box: { width: 46, height: 56, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
