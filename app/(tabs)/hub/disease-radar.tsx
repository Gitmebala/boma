import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { daysBetween } from '@/lib/format';
import { space, radius, layout } from '@/lib/theme';

interface Report { id: string; county: string | null; disease: string; severity: string; reported_at: string }

export default function DiseaseRadarScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [reports, setReports] = useState<Report[]>([]);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 60 * 86400000).toISOString();
    const { data } = await supabase.from('disease_reports')
      .select('id, county, disease, severity, reported_at')
      .gte('reported_at', since)
      .order('reported_at', { ascending: false })
      .limit(50);
    setReports((data as Report[]) ?? []);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const nearby = reports.filter((r) => r.county && r.county === farm?.county);
  const elsewhere = reports.filter((r) => !r.county || r.county !== farm?.county);

  // Group nearby by disease so repeated reports read as one signal, not noise
  const byDisease = nearby.reduce<Record<string, Report[]>>((acc, r) => {
    (acc[r.disease] ||= []).push(r);
    return acc;
  }, {});

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Disease radar</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: layout.tabBarClearance }} showsVerticalScrollIndicator={false}>
        <View style={[
          styles.banner,
          { backgroundColor: nearby.length > 0 ? colors.warningSoft : colors.successSoft },
        ]}>
          <Ionicons
            name={nearby.length > 0 ? 'warning' : 'shield-checkmark'}
            size={22}
            color={nearby.length > 0 ? colors.warning : colors.success}
          />
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Text variant="bodyMed" style={{ color: nearby.length > 0 ? colors.warning : colors.success }}>
              {nearby.length > 0
                ? `${nearby.length} report${nearby.length === 1 ? '' : 's'} in ${farm?.county ?? 'your area'}`
                : `Nothing reported in ${farm?.county ?? 'your area'}`}
            </Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
              Last 60 days · anonymised farmer reports
            </Text>
          </View>
        </View>

        {Object.keys(byDisease).length > 0 && (
          <>
            <Text variant="label" tone="tertiary" style={styles.sectionLabel}>NEAR YOU</Text>
            {Object.entries(byDisease).map(([disease, rows], i) => (
              <FadeInView key={disease} index={i} style={{ marginBottom: space.md }}>
                <Card style={{ borderColor: colors.warning, borderWidth: 1.5 }}>
                  <View style={styles.rowBetween}>
                    <Text variant="h3">{disease}</Text>
                    <View style={[styles.countPill, { backgroundColor: colors.warningSoft }]}>
                      <Text variant="micro" style={{ color: colors.warning }}>{rows.length} REPORT{rows.length === 1 ? '' : 'S'}</Text>
                    </View>
                  </View>
                  <Text variant="caption" tone="secondary" style={{ marginTop: space.sm }}>
                    Most recent {daysBetween(rows[0].reported_at)} day(s) ago in {rows[0].county}.
                  </Text>
                  <View style={[styles.adviceBox, { backgroundColor: colors.surfaceSunken }]}>
                    <Text variant="micro" tone="tertiary">WHAT TO DO</Text>
                    <Text variant="body" style={{ marginTop: 4 }}>
                      Tighten biosecurity now: refresh foot dips, keep visitors out, and check your vaccination schedule is up to date.
                    </Text>
                  </View>
                  <Button
                    label="Check my vaccine schedule"
                    variant="secondary"
                    onPress={() => router.push('/(tabs)/flocks')}
                    style={{ marginTop: space.md }}
                  />
                </Card>
              </FadeInView>
            ))}
          </>
        )}

        {elsewhere.length > 0 && (
          <>
            <Text variant="label" tone="tertiary" style={styles.sectionLabel}>ELSEWHERE IN KENYA</Text>
            {elsewhere.slice(0, 12).map((r, i) => (
              <FadeInView key={r.id} index={i}>
                <Card style={styles.compactRow}>
                  <View style={[styles.dot, { backgroundColor: r.severity === 'confirmed' ? colors.danger : colors.warning }]} />
                  <View style={{ flex: 1, marginLeft: space.md }}>
                    <Text variant="bodyMed">{r.disease}</Text>
                    <Text variant="caption" tone="tertiary">
                      {r.county ?? 'Unknown county'} · {daysBetween(r.reported_at)}d ago · {r.severity}
                    </Text>
                  </View>
                </Card>
              </FadeInView>
            ))}
          </>
        )}

        {reports.length === 0 && (
          <EmptyState
            icon="radio-outline"
            title="No reports yet"
            body="When farmers report outbreaks through the symptom checker, they show up here as an early warning for everyone nearby."
          />
        )}

        <Card style={{ marginTop: space.lg, backgroundColor: colors.surfaceSunken, borderColor: 'transparent' }}>
          <Text variant="caption" tone="secondary">
            Reports are anonymous — your farm name is never shown to other farmers. Newcastle disease can wipe out a flock in about three days, which is why a neighbour's early warning matters.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', padding: space.lg, borderRadius: radius.lg, marginBottom: space.xl },
  sectionLabel: { marginBottom: space.sm, marginTop: space.md, marginLeft: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countPill: { paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill },
  adviceBox: { padding: space.md, borderRadius: radius.md, marginTop: space.md },
  compactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
