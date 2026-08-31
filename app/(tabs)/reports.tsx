import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { HeroMetric, MetricRow } from '@/components/ui/Metric';
import { Segmented } from '@/components/ui/Segmented';
import { StackedBar, BulletTrack, Sparkline } from '@/components/ui/Charts';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase, FlockSummary, Expense } from '@/lib/supabase';
import { formatKES, formatCompactKES, formatPct } from '@/lib/format';
import { projectFlock, farmPosition, feedCostPerKg, costBreakdown, BROILER, FlockProjection } from '@/lib/insights';
import { space, radius } from '@/lib/theme';

const RANGES = ['3M', '6M', '1Y', 'All'] as const;
type Range = (typeof RANGES)[number];

const VIEWS = ['Overview', 'Batches', 'Costs'] as const;
type ViewName = (typeof VIEWS)[number];

const RANGE_MONTHS: Record<Range, number | null> = { '3M': 3, '6M': 6, '1Y': 12, All: null };

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { farm, canViewMoney } = useFarm();

  const [range, setRange] = useState<Range>('6M');
  const [view, setView] = useState<ViewName>('Overview');
  const [flocks, setFlocks] = useState<FlockSummary[] | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!farm) return;
    const [{ data: fs }, { data: exp }] = await Promise.all([
      supabase.from('flock_summary').select('*').eq('farm_id', farm.id).order('date_arrived', { ascending: false }),
      supabase.from('expenses').select('*').eq('farm_id', farm.id),
    ]);
    setFlocks((fs as FlockSummary[]) ?? []);
    setExpenses((exp as Expense[]) ?? []);
  }, [farm?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // -------------------------------------------------------------------------
  // Derive everything for the chosen window
  // -------------------------------------------------------------------------
  const { projections, position, costs, cutoff } = useMemo(() => {
    const months = RANGE_MONTHS[range];
    const cutoffDate = months ? new Date(Date.now() - months * 30 * 86400000) : null;

    const inRange = (flocks ?? []).filter(
      (f) => !cutoffDate || new Date(f.date_arrived) >= cutoffDate
    );
    const expInRange = expenses.filter(
      (e) => !cutoffDate || new Date(e.expense_date) >= cutoffDate
    );

    const totalFeedKg = inRange.reduce((s, f) => s + (f.feed_used_kg ?? 0), 0);
    const perKg = feedCostPerKg(expInRange, totalFeedKg);
    const projs = farm ? inRange.map((f) => projectFlock(f, farm, perKg)) : [];

    return {
      projections: projs,
      position: projs.length ? farmPosition(projs) : null,
      costs: costBreakdown(expInRange),
      cutoff: cutoffDate,
    };
  }, [flocks, expenses, range, farm]);

  const loading = flocks === null;

  // Per-bird economics — the numbers a farmer can actually compare between
  // batches and against what a neighbour tells them at the agrovet.
  const birdsSold = projections.reduce((s, p) => s + p.flock.birds_sold, 0);
  const chicksIn = projections.reduce((s, p) => s + p.flock.chicks_received, 0);
  const costPerBird = chicksIn > 0 ? (position?.totalCost ?? 0) / chicksIn : null;
  const revPerBird = birdsSold > 0 ? (position?.totalRevenue ?? 0) / birdsSold : null;
  const avgMortality = chicksIn > 0
    ? projections.reduce((s, p) => s + p.flock.deaths, 0) / chicksIn
    : 0;
  const withFcr = projections.filter((p) => p.flock.fcr > 0);
  const avgFcr = withFcr.length
    ? withFcr.reduce((s, p) => s + p.flock.fcr, 0) / withFcr.length
    : null;

  const closed = projections.filter((p) => p.flock.birds_sold > 0);
  const profitTrend = [...closed]
    .sort((a, b) => new Date(a.flock.date_arrived).getTime() - new Date(b.flock.date_arrived).getTime())
    .map((p) => p.realisedProfit);

  const onShare = async () => {
    const lines = [
      `${farm?.name ?? 'Farm'} — performance report`,
      `Period: ${range === 'All' ? 'All time' : `since ${cutoff?.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}`}`,
      '',
      `Batches: ${projections.length}`,
      `Chicks placed: ${chicksIn.toLocaleString()}`,
      `Birds sold: ${birdsSold.toLocaleString()}`,
      `Average mortality: ${formatPct(avgMortality)}`,
      avgFcr ? `Average FCR: ${avgFcr.toFixed(2)}` : null,
      '',
      canViewMoney ? `Revenue: ${formatKES(position?.totalRevenue ?? 0)}` : null,
      canViewMoney ? `Cost: ${formatKES(position?.totalCost ?? 0)}` : null,
      canViewMoney ? `Profit: ${formatKES(position?.realisedProfit ?? 0)}` : null,
      canViewMoney && revPerBird ? `Revenue per bird: ${formatKES(revPerBird)}` : null,
      canViewMoney && costPerBird ? `Cost per chick placed: ${formatKES(costPerBird)}` : null,
      '',
      'Generated by Boma',
    ].filter(Boolean);

    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      /* user dismissed the sheet — nothing to recover from */
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Reports</Text>
          <Text variant="caption" tone="tertiary">How the farm is really doing</Text>
        </View>
        <AnimatedPressable
          onPress={onShare}
          haptic="light"
          accessibilityLabel="Share report"
          style={[styles.iconBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="share-outline" size={19} color={colors.textPrimary} />
        </AnimatedPressable>
      </View>

      <View style={styles.controls}>
        <Segmented options={RANGES} value={range} onChange={setRange} size="sm" />
      </View>
      <View style={[styles.controls, { marginTop: space.sm, marginBottom: space.lg }]}>
        <Segmented options={VIEWS} value={view} onChange={setView} />
      </View>

      <ScreenScroll refreshing={refreshing} onRefresh={onRefresh}>
        {loading ? (
          <View style={{ gap: space.lg }}>
            <Skeleton width="100%" height={160} />
            <Skeleton width="100%" height={100} />
            <Skeleton width="100%" height={200} />
          </View>
        ) : projections.length === 0 ? (
          <EmptyState
            icon="stats-chart-outline"
            title="Nothing to report yet"
            body="Once you've run a batch, this is where you'll see what it earned, what it cost and how it compared."
            actionLabel="Go to batches"
            onAction={() => router.push('/(tabs)/flocks')}
          />
        ) : (
          <>
            {view === 'Overview' && (
              <OverviewTab
                position={position}
                canViewMoney={canViewMoney}
                chicksIn={chicksIn}
                birdsSold={birdsSold}
                avgMortality={avgMortality}
                avgFcr={avgFcr}
                costPerBird={costPerBird}
                revPerBird={revPerBird}
                profitTrend={profitTrend}
                batchCount={projections.length}
              />
            )}
            {view === 'Batches' && <BatchesTab projections={projections} canViewMoney={canViewMoney} />}
            {view === 'Costs' && <CostsTab costs={costs} canViewMoney={canViewMoney} chicksIn={chicksIn} />}
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
function OverviewTab({
  position,
  canViewMoney,
  chicksIn,
  birdsSold,
  avgMortality,
  avgFcr,
  costPerBird,
  revPerBird,
  profitTrend,
  batchCount,
}: any) {
  const { colors } = useTheme();
  const margin =
    position && position.totalRevenue > 0 ? position.realisedProfit / position.totalRevenue : null;

  return (
    <>
      {canViewMoney ? (
        <HeroMetric
          label="Profit banked"
          value={formatCompactKES(position?.realisedProfit ?? 0)}
          verdict={
            margin != null
              ? `${formatPct(margin, 0)} margin on ${formatCompactKES(position.totalRevenue)} of sales`
              : 'No completed sales in this period yet.'
          }
          tone={(position?.realisedProfit ?? 0) >= 0 ? 'success' : 'danger'}
          trend={profitTrend.length > 1 ? profitTrend : undefined}
        />
      ) : (
        <HeroMetric
          label="Birds raised"
          value={chicksIn.toLocaleString()}
          verdict={`${batchCount} batch${batchCount === 1 ? '' : 'es'} in this period`}
        />
      )}

      <View style={{ marginTop: space.md }}>
        <MetricRow
          items={[
            { label: 'Batches', value: String(batchCount) },
            { label: 'Chicks placed', value: chicksIn.toLocaleString() },
            { label: 'Birds sold', value: birdsSold.toLocaleString() },
          ]}
        />
      </View>

      {canViewMoney && (revPerBird || costPerBird) ? (
        <Card style={{ marginTop: space.md }}>
          <Text variant="h3">Per-bird economics</Text>
          <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
            The figures worth comparing between batches.
          </Text>

          {revPerBird ? (
            <PerBirdRow label="Revenue per bird sold" value={formatKES(revPerBird)} tone="success" />
          ) : null}
          {costPerBird ? (
            <PerBirdRow label="Cost per chick placed" value={formatKES(costPerBird)} tone="danger" />
          ) : null}
          {revPerBird && costPerBird ? (
            <PerBirdRow
              label="Left over per bird"
              value={formatKES(revPerBird - costPerBird)}
              tone={revPerBird - costPerBird >= 0 ? 'success' : 'danger'}
              emphasis
            />
          ) : null}
        </Card>
      ) : null}

      {/* Flock health against the standards that decide whether a batch is
          actually well run, not just profitable by luck of the market. */}
      <Card style={{ marginTop: space.md }}>
        <Text variant="h3">Flock performance</Text>

        <View style={{ marginTop: space.lg }}>
          <View style={styles.gaugeHead}>
            <Text variant="label" tone="secondary">Average mortality</Text>
            <Text variant="statSm" tone={avgMortality <= 0.05 ? 'success' : avgMortality <= 0.08 ? 'warning' : 'danger'}>
              {formatPct(avgMortality)}
            </Text>
          </View>
          <BulletTrack
            value={avgMortality}
            target={0.05}
            max={Math.max(0.15, avgMortality * 1.2)}
            tone={avgMortality <= 0.05 ? 'success' : avgMortality <= 0.08 ? 'warning' : 'danger'}
            style={{ marginTop: space.sm }}
          />
          <Text variant="micro" tone="quiet" style={{ marginTop: 6 }}>
            Marker shows the 5% target. Under it is a well-run house.
          </Text>
        </View>

        {avgFcr ? (
          <View style={{ marginTop: space.xl }}>
            <View style={styles.gaugeHead}>
              <Text variant="label" tone="secondary">Feed conversion (FCR)</Text>
              <Text
                variant="statSm"
                tone={avgFcr <= BROILER.goodFcr ? 'success' : avgFcr <= BROILER.poorFcr ? 'warning' : 'danger'}>
                {avgFcr.toFixed(2)}
              </Text>
            </View>
            <BulletTrack
              value={avgFcr}
              target={BROILER.goodFcr}
              max={Math.max(2.6, avgFcr * 1.15)}
              tone={avgFcr <= BROILER.goodFcr ? 'success' : avgFcr <= BROILER.poorFcr ? 'warning' : 'danger'}
              style={{ marginTop: space.sm }}
            />
            <Text variant="micro" tone="quiet" style={{ marginTop: 6 }}>
              Kg of feed per kg of bird. {BROILER.goodFcr} or under is good; over {BROILER.poorFcr} is costing you.
            </Text>
          </View>
        ) : null}
      </Card>
    </>
  );
}

function PerBirdRow({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string;
  value: string;
  tone: 'success' | 'danger';
  emphasis?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.perBirdRow,
        emphasis && { borderTopWidth: 1, borderTopColor: colors.borderFaint, marginTop: space.sm, paddingTop: space.md },
      ]}>
      <Text variant={emphasis ? 'bodyMed' : 'body'} tone={emphasis ? 'primary' : 'secondary'}>{label}</Text>
      <Text variant={emphasis ? 'statSm' : 'bodyMed'} tone={tone}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Batches — side-by-side comparison, which is where the real lessons are
// ---------------------------------------------------------------------------
function BatchesTab({ projections, canViewMoney }: { projections: FlockProjection[]; canViewMoney: boolean }) {
  const { colors } = useTheme();

  const ranked = [...projections].sort(
    (a, b) => new Date(b.flock.date_arrived).getTime() - new Date(a.flock.date_arrived).getTime()
  );
  const best = [...projections]
    .filter((p) => p.flock.birds_sold > 0)
    .sort((a, b) => b.realisedProfit - a.realisedProfit)[0];

  const maxProfit = Math.max(...projections.map((p) => Math.abs(p.realisedProfit)), 1);

  return (
    <>
      {best && canViewMoney ? (
        <Card style={{ backgroundColor: colors.successSoft, borderColor: 'transparent' }}>
          <Text variant="micro" tone="success">BEST BATCH SO FAR</Text>
          <Text variant="h2" style={{ marginTop: 4 }}>{best.flock.flock_code}</Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
            {formatKES(best.realisedProfit)} profit · {formatPct(best.flock.mortality_rate)} deaths
            {best.flock.fcr > 0 ? ` · FCR ${best.flock.fcr.toFixed(2)}` : ''}
          </Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: space.sm }}>
            Whatever you did on this batch, repeat it.
          </Text>
        </Card>
      ) : null}

      {ranked.map((p, i) => (
        <FadeInView key={p.flock.flock_id} index={i} style={{ marginTop: space.md }}>
          <AnimatedPressable
            onPress={() => router.push(`/(tabs)/flocks/${p.flock.flock_id}`)}
            haptic="selection"
            scaleTo={0.985}>
            <Card>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3">{p.flock.flock_code}</Text>
                  <Text variant="micro" tone="quiet" style={{ marginTop: 2 }}>
                    {new Date(p.flock.date_arrived).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{p.flock.status}
                  </Text>
                </View>
                {canViewMoney ? (
                  <Text variant="statSm" tone={p.realisedProfit >= 0 ? 'success' : 'danger'}>
                    {formatCompactKES(p.realisedProfit)}
                  </Text>
                ) : null}
              </View>

              {canViewMoney ? (
                <BulletTrack
                  value={Math.abs(p.realisedProfit)}
                  max={maxProfit}
                  tone={p.realisedProfit >= 0 ? 'success' : 'danger'}
                  height={6}
                  showTarget={false}
                  style={{ marginTop: space.md }}
                />
              ) : null}

              <View style={[styles.chipRow, { marginTop: space.md }]}>
                <MiniStat label="Placed" value={p.flock.chicks_received.toLocaleString()} />
                <MiniStat
                  label="Deaths"
                  value={formatPct(p.flock.mortality_rate)}
                  tone={p.mortalityHealth === 'good' ? 'success' : p.mortalityHealth === 'watch' ? 'warning' : 'danger'}
                />
                <MiniStat
                  label="FCR"
                  value={p.flock.fcr > 0 ? p.flock.fcr.toFixed(2) : '—'}
                  tone={p.fcrHealth === 'good' ? 'success' : p.fcrHealth === 'watch' ? 'warning' : p.fcrHealth === 'bad' ? 'danger' : undefined}
                />
                <MiniStat label="Sold" value={p.flock.birds_sold.toLocaleString()} />
              </View>
            </Card>
          </AnimatedPressable>
        </FadeInView>
      ))}
    </>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'warning' | 'danger' }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="micro" tone="quiet">{label.toUpperCase()}</Text>
      <Text variant="bodyMed" tone={tone ?? 'primary'} style={{ marginTop: 1 }}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Costs — where the money actually went
// ---------------------------------------------------------------------------
function CostsTab({
  costs,
  canViewMoney,
  chicksIn,
}: {
  costs: { slices: any[]; total: number; note: string | null };
  canViewMoney: boolean;
  chicksIn: number;
}) {
  const { colors } = useTheme();

  if (!canViewMoney) {
    return <EmptyState icon="lock-closed-outline" title="Costs are restricted" body="Ask the farm owner for access to money." />;
  }
  if (costs.total <= 0) {
    return <EmptyState icon="receipt-outline" title="No costs logged" body="Log expenses from the Log tab and they'll be broken down here." />;
  }

  const palette = [colors.accent, colors.terracotta, colors.warning, colors.info, colors.success, colors.danger];
  const segments = costs.slices.slice(0, 6).map((s, i) => ({
    value: s.total,
    color: palette[i % palette.length],
    label: s.category,
  }));

  return (
    <>
      <Card>
        <Text variant="micro" tone="tertiary">TOTAL LOGGED COST</Text>
        <Text variant="statNumberLg" style={{ marginTop: 2 }}>{formatKES(costs.total)}</Text>
        {chicksIn > 0 ? (
          <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
            {formatKES(costs.total / chicksIn)} per chick placed
          </Text>
        ) : null}

        <StackedBar segments={segments} height={14} />

        <View style={{ marginTop: space.lg, gap: space.md }}>
          {costs.slices.map((s, i) => (
            <View key={s.category} style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View
                  style={[styles.dot, { backgroundColor: palette[i % palette.length], opacity: i < 6 ? 1 : 0.35 }]}
                />
                <Text variant="body" style={{ marginLeft: space.sm, flex: 1 }} numberOfLines={1}>
                  {s.category}
                </Text>
              </View>
              <Text variant="micro" tone="quiet" style={{ marginRight: space.sm }}>
                {formatPct(s.share, 0)}
              </Text>
              <Text variant="bodyMed">{formatCompactKES(s.total)}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* An anomaly note is worth more than another chart: it tells the farmer
          their data itself may be wrong before they act on it. */}
      {costs.note ? (
        <Card style={{ marginTop: space.md, backgroundColor: colors.warningSoft, borderColor: 'transparent' }}>
          <View style={{ flexDirection: 'row' }}>
            <Ionicons name="information-circle" size={18} color={colors.warning} />
            <Text variant="caption" tone="secondary" style={{ flex: 1, marginLeft: space.sm }}>
              {costs.note}
            </Text>
          </View>
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: space.xs,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  controls: { paddingHorizontal: space.gutter, marginTop: space.lg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gaugeHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  perBirdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.md,
  },
  chipRow: { flexDirection: 'row', gap: space.sm },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
