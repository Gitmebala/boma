import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useTheme } from '@/lib/ThemeContext';
import { space, radius, layout } from '@/lib/theme';

export default function PlanScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Your plan</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md, paddingBottom: layout.tabBarClearance }}>
        <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
          <Text variant="label" tone="accent">CURRENT PLAN</Text>
          <Text variant="h1" style={{ marginTop: space.sm }}>Free</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
            Full flock tracking, money, and one active flock at a time.
          </Text>
        </Card>
        <Card style={{ opacity: 0.6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="h2">Pro</Text>
            <Text variant="h3" tone="secondary">KES 300/mo</Text>
          </View>
          <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
            Unlimited flocks, team members, automatic WhatsApp debt reminders, and benchmarking against nearby farms.
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.surfaceSunken }]}>
            <Text variant="micro" tone="tertiary">COMING SOON — PAYMENTS NOT YET SET UP</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, marginTop: space.lg },
});
