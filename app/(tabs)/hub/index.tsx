import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { space, radius } from '@/lib/theme';

export default function HubScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [nearbyReports, setNearbyReports] = useState(0);
  const [training, setTraining] = useState<any[]>([]);
  const [openDeals, setOpenDeals] = useState(0);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ count }, { data: t }, { count: deals }] = await Promise.all([
      supabase.from('disease_reports').select('id', { count: 'exact', head: true })
        .gte('reported_at', since)
        .eq('county', farm?.county ?? ''),
      supabase.from('training_content').select('*').order('sort_order').limit(4),
      supabase.from('group_deals').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    setNearbyReports(count ?? 0);
    setTraining(t ?? []);
    setOpenDeals(deals ?? 0);
  }, [farm?.county]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeInView>
          <Text variant="h1">Your farming community</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
            Connect, learn, and protect your flock together.
          </Text>
        </FadeInView>

        {/* Symptom checker — the hero action */}
        <FadeInView index={1} style={{ marginTop: space.xxl }}>
          <AnimatedPressable onPress={() => router.push('/(tabs)/hub/symptom-checker')} haptic="medium" scaleTo={0.98}>
            <View style={[styles.heroCard, { backgroundColor: colors.accentContainer }]}>
              <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Ionicons name="pulse" size={26} color={colors.onAccentContainer} />
              </View>
              <View style={{ flex: 1, marginLeft: space.md }}>
                <Text variant="h3" style={{ color: '#FFFFFF' }}>Symptom checker</Text>
                <Text variant="caption" style={{ color: colors.onAccentContainer, marginTop: 2 }}>
                  Sick birds? Get help deciding what to do
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.onAccentContainer} />
            </View>
          </AnimatedPressable>
        </FadeInView>

        {/* Disease radar */}
        <FadeInView index={2} style={{ marginTop: space.xl }}>
          <AnimatedPressable onPress={() => router.push('/(tabs)/hub/disease-radar')} haptic="selection" scaleTo={0.99}>
            <Card>
              <View style={styles.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="radio-outline" size={20} color={colors.terracotta} />
                  <Text variant="h3" style={{ marginLeft: space.sm }}>Disease radar</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </View>
              <View style={[styles.radarStrip, { backgroundColor: nearbyReports > 0 ? colors.warningSoft : colors.successSoft }]}>
                <Ionicons
                  name={nearbyReports > 0 ? 'warning' : 'shield-checkmark'}
                  size={16}
                  color={nearbyReports > 0 ? colors.warning : colors.success}
                />
                <Text variant="label" style={{ marginLeft: space.sm, color: nearbyReports > 0 ? colors.warning : colors.success }}>
                  {nearbyReports > 0
                    ? `${nearbyReports} report${nearbyReports === 1 ? '' : 's'} near you in the last 30 days`
                    : 'No outbreaks reported near you'}
                </Text>
              </View>
            </Card>
          </AnimatedPressable>
        </FadeInView>

        {/* Training */}
        <View style={styles.sectionHead}>
          <Text variant="h3">Mafunzo · Training</Text>
          <AnimatedPressable onPress={() => router.push('/(tabs)/hub/training' as any)} haptic="selection">
            <Text variant="label" tone="accent">See all</Text>
          </AnimatedPressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.xl }}>
          {training.map((t, i) => (
            <FadeInView key={t.id} index={i}>
              <AnimatedPressable onPress={() => router.push(`/(tabs)/hub/training/${t.id}` as any)} haptic="selection" scaleTo={0.97}>
                <Card style={styles.trainingCard}>
                  <View style={[styles.trainingThumb, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name="play" size={20} color={colors.accent} />
                  </View>
                  <Text variant="label" style={{ marginTop: space.md }} numberOfLines={2}>{t.title_en}</Text>
                  <Text variant="caption" tone="tertiary" numberOfLines={1} style={{ marginTop: 2 }}>{t.title_sw}</Text>
                </Card>
              </AnimatedPressable>
            </FadeInView>
          ))}
        </ScrollView>

        {/* Directory + group deals */}
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <HubRow
            icon="storefront-outline"
            title="Verified agrovets"
            subtitle="Trusted suppliers near you"
            onPress={() => router.push('/(tabs)/hub/agrovets')}
          />
          <HubRow
            icon="people-outline"
            title="Group buying & selling"
            subtitle={openDeals > 0 ? `${openDeals} open deal${openDeals === 1 ? '' : 's'}` : 'Better prices, together'}
            onPress={() => router.push('/(tabs)/hub/group-deals')}
          />
          <HubRow
            icon="document-text-outline"
            title="Farm credit profile"
            subtitle="Your production record, for lenders"
            onPress={() => router.push('/(tabs)/hub/credit-profile')}
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HubRow({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} haptic="selection" scaleTo={0.99}>
      <Card style={styles.hubRow}>
        <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1, marginLeft: space.md }}>
          <Text variant="bodyMed">{title}</Text>
          <Text variant="caption" tone="tertiary">{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Card>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.sm },
  heroCard: { flexDirection: 'row', alignItems: 'center', padding: space.xl, borderRadius: radius.xl },
  heroIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  radarStrip: { flexDirection: 'row', alignItems: 'center', padding: space.md, borderRadius: radius.md, marginTop: space.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xxl, marginBottom: space.md },
  trainingCard: { width: 176 },
  trainingThumb: { height: 72, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  hubRow: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
