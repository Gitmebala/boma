import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { HeroMetric, MetricRow, GaugeMetric } from '@/components/ui/Metric';
import { Sparkline } from '@/components/ui/Charts';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase, FlockSummary, Expense } from '@/lib/supabase';
import { formatCompactKES, formatKES, formatPct } from '@/lib/format';
import { buildAlerts, BomaAlert } from '@/lib/alerts';
import { registerForPushNotifications } from '@/lib/notifications';
import { projectFlock, farmPosition, feedCostPerKg, dailySeries, FlockProjection } from '@/lib/insights';
import { space, radius, elevation } from '@/lib/theme';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { farm, canViewMoney } = useFarm();
  const { profile, session } = useAuth();

  const [projections, setProjections] = useState<FlockProjection[] | null>(null);
  const [alerts, setAlerts] = useState<BomaAlert[]>([]);
  const [deathSeries, setDeathSeries] = useState<number[]>([]);
  const [owed, setOwed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pushAttempted = useRef(false);

  useEffect(() => {
    if (pushAttempted.current || !session?.user || !farm) return;
    pushAttempted.current = true;
    registerForPushNotifications(session.user.id, farm.id).catch(() => {});
  }, [session?.user?.id, farm?.id]);

  const load = useCallback(async () => {
    if (!farm) return;
    const [{ data: fs }, { data: exp }, { data: logs }, { data: bal }, alertList] = await Promise.all([
      supabase.from('flock_summary').select('*').eq('farm_id', farm.id).order('date_arrived', { ascending: false }),
      supabase.from('expenses').select('*').eq('farm_id', farm.id),
      supabase.from('daily_logs').select('log_date, birds_died, feed_used_kg').order('log_date', { ascending: false }).limit(400),
      canViewMoney
        ? supabase.from('customer_balances').select('balance').eq('farm_id', farm.id).gt('balance', 0)
        : Promise.resolve({ data: [] as any[] }),
      buildAlerts(farm.id),
    ]);

    const flocks = (fs as FlockSummary[]) ?? [];
    const expenses = (exp as Expense[]) ?? [];
    const totalFeedKg = flocks.reduce((s, f) => s + (f.feed_used_kg ?? 0), 0);
    const perKg = feedCostPerKg(expenses, totalFeedKg);

    setProjections(flocks.map((f) => projectFlock(f, farm, perKg)));
    setDeathSeries(dailySeries((logs as any[]) ?? [], 'birds_died', 14));
    setOwed(((bal as any[]) ?? []).reduce((s, b) => s + Number(b.balance || 0), 0));
    setAlerts(alertList);
  }, [farm?.id, canViewMoney]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loading = projections === null;
  const position = projections ? farmPosition(projections) : null;
  const active = (projections ?? []).filter(
    (p) => p.flock.status === 'Active' || p.flock.status === 'Selling'
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0];

  const topAlert = alerts[0];

  return (
    <Screen>
      <ScreenScroll refreshing={refreshing} onRefresh={onRefresh}>
        {/* ---------------------------------------------------------------
            Header. The account affordance lives here rather than in the tab
            bar so the bar can hold the five things a farmer does daily.
        --------------------------------------------------------------- */}
        <FadeInView style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="tertiary">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </Text>
            <Text variant="h1" numberOfLines={1} style={{ marginTop: 1 }}>
              {farm?.name ?? 'Your farm'}
            </Text>
          </View>
          <AnimatedPressable
            onPress={() => router.push('/(tabs)/more')}
            haptic="selection"
            accessibilityLabel="Account and settings"
            style={[styles.avatar, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
            <Text variant="bodyMed" tone="accent">
              {(profile?.full_name || farm?.name || 'B')[0].toUpperCase()}
            </Text>
          </AnimatedPressable>
        </FadeInView>

        {loading ? (
          <View style={{ gap: space.lg, marginTop: space.lg }}>
            <Skeleton width="100%" height={168} />
            <Skeleton width="100%" height={86} />
            <Skeleton width="100%" height={140} />
          </View>
        ) : (
          <>
            {/* -----------------------------------------------------------
                Needs-attention. v1 put these in a horizontal scroller whose
                cards were visibly sliced by the screen edge, so you couldn't
                tell how many there were or read any of them fully. One card
                that states the count and leads with the worst item is both
                calmer and more honest.
            ----------------------------------------------------------- */}
            {topAlert ? (
              <FadeInView delay={40}>
                <AnimatedPressable
                  onPress={() => (topAlert.href ? router.push(topAlert.href as any) : undefined)}
                  haptic="light"
                  scaleTo={0.985}>
                  <View
                    style={[
                      styles.alert,
                      {
                        backgroundColor: topAlert.severity === 'overdue' ? colors.dangerSoft : colors.warningSoft,
                        borderColor: topAlert.severity === 'overdue' ? colors.danger : colors.warning,
                      },
                    ]}>
                    <View style={styles.alertHead}>
                      <Ionicons
                        name={topAlert.icon as any}
                        size={15}
                        color={topAlert.severity === 'overdue' ? colors.danger : colors.warning}
                      />
                      <Text
                        variant="micro"
                        style={{
                          color: topAlert.severity === 'overdue' ? colors.danger : colors.warning,
                          marginLeft: 6,
                          flex: 1,
                        }}>
                        {topAlert.title.toUpperCase()}
                      </Text>
                      {alerts.length > 1 ? (
                        <View style={[styles.countChip, { backgroundColor: colors.surface }]}>
                          <Text variant="micro" tone="secondary">+{alerts.length - 1} more</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text variant="bodyMed" style={{ marginTop: space.sm }}>{topAlert.detail}</Text>
                    <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>{topAlert.action}</Text>
                  </View>
                </AnimatedPressable>
              </FadeInView>
            ) : null}

            {/* -----------------------------------------------------------
                The hero. One number, one verdict — the answer to "am I
                making money on this batch?" rather than four equal tiles
                that leave the farmer to do the arithmetic.
            ----------------------------------------------------------- */}
            <FadeInView delay={80} style={{ marginTop: space.lg }}>
              {position && canViewMoney ? (
                <HeroMetric
                  label={position.projectedProfit != null ? 'Expected profit this cycle' : 'Profit so far'}
                  value={formatCompactKES(position.projectedProfit ?? position.realisedProfit)}
                  verdict={position.headline}
                  tone={position.headlineTone === 'primary' ? 'primary' : position.headlineTone}
                  onPress={() => router.push('/(tabs)/reports' as any)}
                  footer={
                    position.projectedProfit != null ? (
                      <View style={styles.heroFooter}>
                        <View style={{ flex: 1 }}>
                          <Text variant="micro" tone="tertiary">BANKED SO FAR</Text>
                          <Text variant="statSm" tone={position.realisedProfit >= 0 ? 'primary' : 'danger'}>
                            {formatCompactKES(position.realisedProfit)}
                          </Text>
                        </View>
                        <View style={[styles.footDivider, { backgroundColor: colors.borderFaint }]} />
                        <View style={{ flex: 1 }}>
                          <Text variant="micro" tone="tertiary">STILL TO SELL</Text>
                          <Text variant="statSm">{position.birdsOnFarm.toLocaleString()} birds</Text>
                        </View>
                      </View>
                    ) : undefined
                  }
                />
              ) : (
                <HeroMetric
                  label="Birds on the farm"
                  value={position ? position.birdsOnFarm.toLocaleString() : '0'}
                  verdict={position?.headline}
                  tone={position?.headlineTone === 'primary' ? 'primary' : position?.headlineTone}
                />
              )}
            </FadeInView>

            {/* Supporting figures — grouped in one region, subordinate in
                size and weight to the hero above. */}
            <FadeInView delay={120} style={{ marginTop: space.md }}>
              <MetricRow
                items={[
                  {
                    label: 'Birds on farm',
                    value: position ? position.birdsOnFarm.toLocaleString() : '0',
                    sub: `${position?.activeCount ?? 0} active batch${position?.activeCount === 1 ? '' : 'es'}`,
                    onPress: () => router.push('/(tabs)/flocks'),
                  },
                  ...(canViewMoney
                    ? [
                        {
                          label: 'Owed to you',
                          value: formatCompactKES(owed),
                          tone: (owed > 0 ? 'warning' : 'primary') as any,
                          sub: owed > 0 ? 'chase it' : 'all paid up',
                          onPress: () => router.push('/(tabs)/money'),
                        },
                      ]
                    : []),
                  {
                    label: 'Deaths, 14d',
                    value: String(deathSeries.reduce((s, n) => s + n, 0)),
                    tone: 'primary' as any,
                    sub: 'tap for detail',
                    onPress: () => router.push('/(tabs)/reports' as any),
                  },
                ]}
              />
            </FadeInView>

            {/* 14-day mortality shape. A trend answers "is it getting worse?"
                which a single total never can. */}
            {deathSeries.some((n) => n > 0) ? (
              <FadeInView delay={160} style={{ marginTop: space.md }}>
                <Card>
                  <View style={styles.rowBetween}>
                    <Text variant="label" tone="secondary">Deaths, last 14 days</Text>
                    <Text variant="micro" tone="quiet">
                      {deathSeries.reduce((s, n) => s + n, 0)} birds
                    </Text>
                  </View>
                  <Sparkline
                    data={deathSeries}
                    tone={deathSeries.slice(-3).reduce((s, n) => s + n, 0) > deathSeries.slice(0, 3).reduce((s, n) => s + n, 0) ? 'danger' : 'success'}
                    height={38}
                    style={{ marginTop: space.md }}
                  />
                </Card>
              </FadeInView>
            ) : null}

            {/* -----------------------------------------------------------
                Active batches. Full-width rows instead of 168px cards in a
                sideways scroller: each one now has room to show the gauge
                that says whether the batch is actually healthy.
            ----------------------------------------------------------- */}
            <View style={styles.sectionHead}>
              <Text variant="h3">Active batches</Text>
              {active.length > 0 ? (
                <AnimatedPressable onPress={() => router.push('/(tabs)/flocks')} haptic="selection">
                  <Text variant="label" tone="accent">See all</Text>
                </AnimatedPressable>
              ) : null}
            </View>

            {active.length === 0 ? (
              <EmptyState
                icon="egg-outline"
                title="No active batches"
                body="Start a batch and Boma tracks growth, deaths, feed and profit for you."
                actionLabel="Add a batch"
                onAction={() => router.push('/(tabs)/flocks')}
              />
            ) : (
              active.map((p, i) => <FlockRow key={p.flock.flock_id} p={p} index={i} />)
            )}

            <FadeInView delay={220} style={{ marginTop: space.xl }}>
              <AnimatedPressable
                onPress={() => router.push('/(tabs)/hub' as any)}
                haptic="light"
                scaleTo={0.985}>
                <View style={[styles.hubBanner, { backgroundColor: colors.accentContainer }]}>
                  <View style={[styles.hubIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                    <Ionicons name="people" size={20} color={colors.onAccentContainer} />
                  </View>
                  <View style={{ flex: 1, marginLeft: space.md }}>
                    <Text variant="bodyMed" style={{ color: '#FFFFFF' }}>Your farming community</Text>
                    <Text variant="caption" style={{ color: colors.onAccentContainer, marginTop: 1 }}>
                      Symptom checker · agrovets · training
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.onAccentContainer} />
                </View>
              </AnimatedPressable>
            </FadeInView>
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}

/** One active batch, with the two numbers that decide its fate. */
function FlockRow({ p, index }: { p: FlockProjection; index: number }) {
  const { colors } = useTheme();
  const f = p.flock;

  const toneMap = { good: 'success', watch: 'warning', bad: 'danger', unknown: 'primary' } as const;

  return (
    <FadeInView index={index} delay={60} style={{ marginTop: space.md }}>
      <AnimatedPressable
        onPress={() => router.push(`/(tabs)/flocks/${f.flock_id}`)}
        haptic="selection"
        scaleTo={0.985}>
        <View
          style={[
            styles.flockCard,
            { backgroundColor: colors.surface, borderColor: colors.border, ...elevation(1, colors.shadow) },
          ]}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flex: 1 }}>
              <Text variant="h3">{f.flock_code}</Text>
              <Text variant="caption" tone="tertiary" style={{ marginLeft: space.sm }}>
                day {p.dayAge} of {p.cycleDays}
              </Text>
            </View>
            <Text variant="statSm">{f.birds_remaining.toLocaleString()}</Text>
          </View>

          <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
            {p.verdict}
          </Text>

          {/* Cycle position: a track with the market marker reads better than
              a ring — it shows where the batch is AND how far is left. */}
          <GaugeMetric
            label="Cycle"
            value={p.dayAge}
            valueText={p.daysToMarket > 0 ? `${p.daysToMarket}d to market` : 'At market weight'}
            max={p.cycleDays}
            tone="accent"
          />

          <GaugeMetric
            label="Deaths"
            value={f.mortality_rate}
            valueText={formatPct(f.mortality_rate)}
            target={0.05}
            targetText={`${f.deaths} of ${f.chicks_received} birds · target 5%`}
            max={Math.max(0.15, f.mortality_rate * 1.2)}
            invert
            tone={toneMap[p.mortalityHealth] as any}
          />
        </View>
      </AnimatedPressable>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: space.xs, marginBottom: space.lg },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  alert: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg },
  alertHead: { flexDirection: 'row', alignItems: 'center' },
  countChip: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  heroFooter: { flexDirection: 'row', alignItems: 'center' },
  footDivider: { width: 1, height: 30, marginHorizontal: space.lg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.xxl,
    marginBottom: space.xs,
  },
  flockCard: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg },
  hubBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: space.lg,
  },
  hubIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
