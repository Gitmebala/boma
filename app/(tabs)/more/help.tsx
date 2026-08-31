import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useTheme } from '@/lib/ThemeContext';
import { space, layout } from '@/lib/theme';

const FAQ = [
  { q: 'A formula or number looks wrong', a: 'Pull to refresh on Home. Numbers like FCR and mortality are calculated live from your Daily Log entries — check that deaths and feed were logged for every day.' },
  { q: '"Setup needed" or nothing loads', a: 'Check your connection — Boma saves everything on your phone first and syncs when you\'re back online, so nothing is lost.' },
  { q: 'I can\'t see the Money tab', a: 'Ask your farm owner to turn on money access for you under More → Farm team.' },
  { q: 'Birds counted don\'t match records', a: 'That\'s exactly what the Count Birds check is for — it means a death or sale wasn\'t logged, or birds are missing. Check the Growth and Sales history for that flock.' },
];

export default function HelpScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Help</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md, paddingBottom: layout.tabBarClearance }}>
        {FAQ.map((f) => (
          <Card key={f.q}>
            <Text variant="bodyMed">{f.q}</Text>
            <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>{f.a}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
