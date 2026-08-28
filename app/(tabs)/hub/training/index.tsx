import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { space, radius } from '@/lib/theme';

const CATEGORIES = ['all', 'brooding', 'feeding', 'biosecurity', 'disease', 'business'] as const;
const CAT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  brooding: 'thermometer-outline',
  feeding: 'nutrition-outline',
  biosecurity: 'shield-checkmark-outline',
  disease: 'medkit-outline',
  business: 'trending-up-outline',
  housing: 'home-outline',
};

export default function TrainingListScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const sw = profile?.language === 'sw';
  const [items, setItems] = useState<any[]>([]);
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('all');

  useFocusEffect(useCallback(() => {
    supabase.from('training_content').select('*').order('sort_order')
      .then(({ data }) => setItems(data ?? []));
  }, []));

  const visible = cat === 'all' ? items : items.filter((i) => i.category === cat);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <View style={{ marginLeft: space.md }}>
          <Text variant="h2">Mafunzo</Text>
          <Text variant="caption" tone="tertiary">Training</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: space.lg }}
        contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.xl }}>
        {CATEGORIES.map((c) => <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />)}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl }} showsVerticalScrollIndicator={false}>
        {visible.map((t, i) => (
          <FadeInView key={t.id} index={i} style={{ marginBottom: space.md }}>
            <AnimatedPressable onPress={() => router.push(`/(tabs)/hub/training/${t.id}` as any)} haptic="selection" scaleTo={0.99}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.thumb, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name={CAT_ICON[t.category] ?? 'book-outline'} size={22} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, marginLeft: space.md }}>
                    <Text variant="bodyMed">{sw && t.title_sw ? t.title_sw : t.title_en}</Text>
                    <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                      {sw ? t.title_en : t.title_sw}
                    </Text>
                    <Text variant="caption" tone="secondary" style={{ marginTop: 6 }} numberOfLines={2}>
                      {sw && t.summary_sw ? t.summary_sw : t.summary_en}
                    </Text>
                  </View>
                </View>
              </Card>
            </AnimatedPressable>
          </FadeInView>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
