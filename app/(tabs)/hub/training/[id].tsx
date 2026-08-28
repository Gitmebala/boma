import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { space, radius } from '@/lib/theme';

/** Minimal markdown renderer — headings, bold, bullets. Enough for lesson text. */
function LessonBody({ md }: { md: string }) {
  const { colors } = useTheme();
  const blocks = md.split('\n').filter((l) => l.trim().length > 0);

  return (
    <View style={{ gap: space.md }}>
      {blocks.map((line, i) => {
        const t = line.trim();
        if (t.startsWith('## ')) {
          return <Text key={i} variant="h3" style={{ marginTop: i === 0 ? 0 : space.md }}>{t.slice(3)}</Text>;
        }
        if (t.startsWith('**') && t.endsWith('**')) {
          return <Text key={i} variant="bodyMed" style={{ marginTop: space.sm }}>{t.slice(2, -2)}</Text>;
        }
        if (t.startsWith('- ')) {
          return (
            <View key={i} style={styles.bullet}>
              <View style={[styles.bulletDot, { backgroundColor: colors.accent }]} />
              <Text variant="body" tone="secondary" style={{ flex: 1 }}>{t.slice(2)}</Text>
            </View>
          );
        }
        return <Text key={i} variant="body" tone="secondary">{t}</Text>;
      })}
    </View>
  );
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const sw = profile?.language === 'sw';
  const [item, setItem] = useState<any | null>(null);

  useFocusEffect(useCallback(() => {
    supabase.from('training_content').select('*').eq('id', id).single()
      .then(({ data }) => setItem(data));
  }, [id]));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl }} showsVerticalScrollIndicator={false}>
        {!item ? (
          <View style={{ gap: space.md }}>
            <Skeleton width="80%" height={32} />
            <Skeleton width="100%" height={200} />
          </View>
        ) : (
          <FadeInView>
            <Text variant="h1">{sw && item.title_sw ? item.title_sw : item.title_en}</Text>
            <Text variant="body" tone="tertiary" style={{ marginTop: 4 }}>
              {sw ? item.title_en : item.title_sw}
            </Text>

            <View style={[styles.metaRow, { borderColor: colors.border }]}>
              <View style={[styles.catPill, { backgroundColor: colors.accentSoft }]}>
                <Text variant="micro" tone="accent">{String(item.category).toUpperCase()}</Text>
              </View>
              {item.duration_seconds ? (
                <Text variant="caption" tone="tertiary">
                  ~{Math.round(item.duration_seconds / 60)} min read
                </Text>
              ) : null}
            </View>

            <View style={{ marginTop: space.xl }}>
              {item.body_md ? <LessonBody md={item.body_md} /> : (
                <Text variant="body" tone="secondary">{item.summary_en}</Text>
              )}
            </View>

            <Card style={{ marginTop: space.xxl, backgroundColor: colors.accentSoft, borderColor: 'transparent' }}>
              <Text variant="micro" tone="accent">USE IT NOW</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
                Everything in this lesson is tracked in Boma — log it as you go and the numbers work themselves out.
              </Text>
            </Card>
          </FadeInView>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, marginTop: space.lg },
  catPill: { paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  bulletDot: { width: 5, height: 5, borderRadius: 3, marginTop: 9 },
});
