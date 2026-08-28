import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Share } from 'react-native';
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
import { supabase, FlockSummary } from '@/lib/supabase';
import { formatKES, formatPct } from '@/lib/format';
import { space, radius } from '@/lib/theme';

export default function CreditProfileScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [flocks, setFlocks] = useState<FlockSummary[] | null>(null);

  useFocusEffect(useCallback(() => {
    if (!farm) return;
    supabase.from('flock_summary').select('*').eq('farm_id', farm.id).order('date_arrived')
      .then(({ data }) => setFlocks((data as FlockSummary[]) ?? []));
  }, [farm?.id]));

  const completed = (flocks ?? []).filter((f) => f.status === 'Sold Out' || f.status === 'Closed');
  const batches = flocks?.length ?? 0;
  const totalBirds = (flocks ?? []).reduce((s, f) => s + f.chicks_received, 0);
  const totalRevenue = (flocks ?? []).reduce((s, f) => s + Number(f.total_revenue), 0);
  const totalProfit = (flocks ?? []).reduce((s, f) => s + Number(f.net_profit), 0);
  const avgMortality = batches ? (flocks ?? []).reduce((s, f) => s + Number(f.mortality_rate), 0) / batches : 0;
  const fcrValues = (flocks ?? []).map((f) => Number(f.fcr)).filter((v) => v > 0);
  const avgFcr = fcrValues.length ? fcrValues.reduce((a, b) => a + b, 0) / fcrValues.length : 0;

  // A transparent, explainable score — no black box. Each component is
  // something the farmer can actually improve, and we show the working.
  const components = [
    { label: 'Record-keeping history', value: Math.min(25, batches * 8), max: 25,
      note: `${batches} batch${batches === 1 ? '' : 'es'} tracked` },
    { label: 'Flock survival', value: avgMortality > 0 && avgMortality <= 0.05 ? 25 : avgMortality <= 0.08 ? 18 : avgMortality > 0 ? 10 : 0, max: 25,
      note: avgMortality > 0 ? `${formatPct(avgMortality)} average mortality` : 'No data yet' },
    { label: 'Feed efficiency', value: avgFcr > 0 && avgFcr <= 1.8 ? 25 : avgFcr <= 2.0 ? 18 : avgFcr > 0 ? 10 : 0, max: 25,
      note: avgFcr > 0 ? `FCR ${avgFcr.toFixed(2)}` : 'Log feed and weights to score this' },
    { label: 'Profitability', value: totalProfit > 0 ? 25 : totalRevenue > 0 ? 12 : 0, max: 25,
      note: totalProfit > 0 ? 'Profitable across batches' : totalRevenue > 0 ? 'Trading, not yet net positive' : 'No sales yet' },
  ];
  const score = components.reduce((s, c) => s + c.value, 0);
  const band = score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Building' : 'Early';
  const bandColor = score >= 80 ? colors.success : score >= 60 ? colors.accent : score >= 40 ? colors.warning : colors.textTertiary;

  const shareProfile = async () => {
    const lines = [
      `${farm?.name ?? 'Farm'} — Boma production record`,
      farm?.county ? `${farm.county} County` : '',
      '',
      `Boma score: ${score}/100 (${band})`,
      `Batches tracked: ${batches}`,
      `Birds raised: ${totalBirds.toLocaleString()}`,
      avgMortality > 0 ? `Average mortality: ${formatPct(avgMortality)}` : '',
      avgFcr > 0 ? `Average FCR: ${avgFcr.toFixed(2)}` : '',
      `Total revenue recorded: ${formatKES(totalRevenue)}`,
      '',
      'Generated from continuous daily records kept in Boma.',
    ].filter(Boolean);
    await Share.share({ message: lines.join('\n') });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Credit profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl }} showsVerticalScrollIndicator={false}>
        {batches === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Nothing to show yet"
            body="Track a batch or two and this becomes a record you can hand to a SACCO or microfinance lender as proof of a working farm."
          />
        ) : (
          <>
            <FadeInView>
              <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
                <Text variant="micro" tone="tertiary">BOMA SCORE</Text>
                <Text variant="statNumberLg" style={{ color: bandColor, marginTop: space.sm }}>{score}</Text>
                <Text variant="label" style={{ color: bandColor }}>{band.toUpperCase()}</Text>
                <View style={[styles.scoreTrack, { backgroundColor: colors.surfaceSunken }]}>
                  <View style={[styles.scoreFill, { width: `${score}%`, backgroundColor: bandColor }]} />
                </View>
                <Text variant="caption" tone="tertiary" style={{ marginTop: space.md, textAlign: 'center' }}>
                  Built from your own records — not a credit bureau rating
                </Text>
              </Card>
            </FadeInView>

            <Text variant="label" tone="tertiary" style={styles.sectionLabel}>HOW IT'S CALCULATED</Text>
            {components.map((c, i) => (
              <FadeInView key={c.label} index={i} style={{ marginBottom: space.sm }}>
                <Card>
                  <View style={styles.rowBetween}>
                    <Text variant="bodyMed" style={{ flex: 1 }}>{c.label}</Text>
                    <Text variant="bodyMed" tone={c.value === c.max ? 'success' : 'secondary'}>{c.value}/{c.max}</Text>
                  </View>
                  <View style={[styles.miniTrack, { backgroundColor: colors.surfaceSunken }]}>
                    <View style={[styles.miniFill, { width: `${(c.value / c.max) * 100}%`, backgroundColor: c.value === c.max ? colors.success : colors.accent }]} />
                  </View>
                  <Text variant="caption" tone="tertiary" style={{ marginTop: 6 }}>{c.note}</Text>
                </Card>
              </FadeInView>
            ))}

            <Text variant="label" tone="tertiary" style={styles.sectionLabel}>PRODUCTION RECORD</Text>
            <Card>
              <Row label="Batches tracked" value={String(batches)} />
              <Row label="Completed batches" value={String(completed.length)} />
              <Row label="Birds raised" value={totalBirds.toLocaleString()} />
              {avgMortality > 0 && <Row label="Average mortality" value={formatPct(avgMortality)} />}
              {avgFcr > 0 && <Row label="Average FCR" value={avgFcr.toFixed(2)} />}
              <Row label="Revenue recorded" value={formatKES(totalRevenue)} />
              <Row label="Net profit" value={formatKES(totalProfit)} last />
            </Card>

            <Button label="Share this record" onPress={shareProfile} style={{ marginTop: space.xl }} />

            <Card style={{ marginTop: space.md, backgroundColor: colors.surfaceSunken, borderColor: 'transparent' }}>
              <Text variant="caption" tone="secondary">
                Lack of access to credit is one of the biggest barriers small farmers face — usually because there is no record to show. Continuous daily records are exactly that evidence.
              </Text>
            </Card>
          </>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.dataRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text variant="body" tone="secondary">{label}</Text>
      <Text variant="bodyMed">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { marginTop: space.xxl, marginBottom: space.sm, marginLeft: 4 },
  scoreTrack: { height: 8, borderRadius: 4, width: '80%', marginTop: space.lg, overflow: 'hidden' },
  scoreFill: { height: 8, borderRadius: 4 },
  miniTrack: { height: 5, borderRadius: 3, marginTop: space.sm, overflow: 'hidden' },
  miniFill: { height: 5, borderRadius: 3 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
});
