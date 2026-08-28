import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { space } from '@/lib/theme';

interface Props {
  step: number;
  totalSteps: number;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBack?: boolean;
}

export function OnboardingScaffold({ step, totalSteps, eyebrow, title, subtitle, children, footer, showBack = true }: Props) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          {showBack && router.canGoBack() ? (
            <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </AnimatedPressable>
          ) : <View style={styles.backBtn} />}
          <View style={styles.progressTrack}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  { backgroundColor: i < step ? colors.accent : colors.border, flex: i === step - 1 ? 2 : 1 },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.content}>
          <FadeInView>
            <Text variant="label" tone="accent">{eyebrow.toUpperCase()}</Text>
            <Text variant="hero" style={{ marginTop: space.sm }}>{title}</Text>
            {subtitle ? <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>{subtitle}</Text> : null}
          </FadeInView>
          <View style={{ marginTop: space.xxl, flex: 1 }}>{children}</View>
        </View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, flexDirection: 'row', gap: 6, height: 4 },
  progressDot: { height: 4, borderRadius: 2 },
  content: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xl },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.lg, paddingTop: space.md },
});
