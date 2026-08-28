import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase, FlockSummary } from '@/lib/supabase';
import { formatCompactKES, formatPct, daysBetween } from '@/lib/format';
import { buildAlerts, BomaAlert } from '@/lib/alerts';
import { registerForPushNotifications } from '@/lib/notifications';
import { space, radius } from '@/lib/theme';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { farm, role } = useFarm();
  const { profile, session } = useAuth();
  const [flocks, setFlocks] = useState<FlockSummary[] | null>(null);
  const [alerts, setAlerts] = useState<BomaAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const pushAttempted = useRef(false);

  // Ask for notification permission once we know who's signed in and which
  // farm to attach alerts to — not before, so the prompt has real context.
  useEffect(() => {
    if (pushAttempted.current || !session?.user || !farm) return;
    pushAttempted.current = true;
    registerForPushNotifications(session.user.id, farm.id).catch(() => {});
  }, [session?.user?.id, farm?.id]);

  const load = useCallback(async () => {
    if (!farm) return;
    const [{ data: fs }, alertList] = await Promise.all([
      supabase.from('flock_summary').select('*').eq('farm_id', farm.id).order('date_arrived', { ascending: false }),
      buildAlerts(farm.id),
    ]);
    setFlocks((fs as FlockSummary[]) ?? []);
    setAlerts(alertList);
    setLoading(false);
  }, [farm?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const activeFlocks = (flocks ?? []).filter((f) => f.status === 'Active' || f.status === 'Selling');
  const birdsOnFarm = activeFlocks.reduce((s, f) => s + f.birds_remaining, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  // simplified "this week" using created flock_summary aggregate proxy (revenue/cost totals available; a dedicated
  // per-week query would hit sales/expenses directly — kept here for a fast first-paint dashboard)
  const totalRevenue = (flocks ?? []).reduce((s, f) => s + f.total_revenue, 0);
  const totalCost = (flocks ?? []).reduce((s, f) => s + f.total_cost, 0);

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}>
        <FadeInView>
          <Text variant="body" tone="secondary">{greeting}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</Text>
          <Text variant="h1" style={{ marginTop: 2 }}>{farm?.name ?? 'Your farm'}</Text>
        </FadeInView>

        {loading ? (
          <View style={{ marginTop: space.xl, gap: space.md }}>
            <Skeleton width="100%" height={80} />
            <Skeleton width="100%" height={200} />
          </View>
        ) : (
          <>
            {alerts.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertScroll} contentContainerStyle={{ gap: space.md, paddingRight: space.xl }}>
                {alerts.slice(0, 8).map((a, i) => (
                  <FadeInView key={a.id} index={i} delay={80}>
                    <AnimatedPressable onPress={() => a.href && router.push(a.href as any)} haptic="selection" scaleTo={0.97}>
                      <Card
                        style={[
                          styles.alertCard,
                          { borderColor: a.severity === 'overdue' ? colors.danger : colors.warning, backgroundColor: a.severity === 'overdue' ? colors.dangerSoft : colors.warningSoft },
                        ]}>
                        <View style={styles.alertHead}>
                          <Ionicons name={a.icon as any} size={16} color={a.severity === 'overdue' ? colors.danger : colors.warning} />
                          <Text variant="label" style={{ color: a.severity === 'overdue' ? colors.danger : colors.warning, marginLeft: 6 }}>
                            {a.title.toUpperCase()}
                          </Text>
                        </View>
                        <Text variant="body" style={{ marginTop: 6 }} numberOfLines={2}>{a.detail}</Text>
                        <Text variant="caption" tone="secondary" style={{ marginTop: 6 }} numberOfLines={1}>{a.action}</Text>
                      </Card>
                    </AnimatedPressable>
                  </FadeInView>
                ))}
              </ScrollView>
            )}

            <FadeInView index={0} delay={120}>
              <AnimatedPressable onPress={() => router.push('/(tabs)/hub' as any)} haptic="light" scaleTo={0.98}>
                <View style={[styles.hubBanner, { backgroundColor: colors.accentContainer }]}>
                  <View style={[styles.hubIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                    <Ionicons name="people" size={22} color={colors.onAccentContainer} />
                  </View>
                  <View style={{ flex: 1, marginLeft: space.md }}>
                    <Text variant="bodyMed" style={{ color: '#FFFFFF' }}>Your farming community</Text>
                    <Text variant="caption" style={{ color: colors.onAccentContainer, marginTop: 2 }}>
                      Symptom checker · agrovets · training
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.onAccentContainer} />
                </View>
              </AnimatedPressable>
            </FadeInView>

            <View style={styles.statGrid}>
              <StatTile label="Birds on farm" value={birdsOnFarm.toLocaleString()} index={0} />
              <StatTile label="Active flocks" value={String(activeFlocks.length)} index={1} onPress={() => router.push('/(tabs)/flocks')} />
              <StatTile label="Total revenue" value={formatCompactKES(totalRevenue)} tone="success" index={2} onPress={() => router.push('/(tabs)/money')} />
              <StatTile
                label="Net profit"
                value={formatCompactKES(totalRevenue - totalCost)}
                tone={totalRevenue - totalCost >= 0 ? 'success' : 'danger'}
                index={3}
                onPress={() => router.push('/(tabs)/money')}
              />
            </View>

            <View style={styles.sectionHead}>
              <Text variant="h3">Active flocks</Text>
              <AnimatedPressable onPress={() => router.push('/(tabs)/flocks')} haptic="selection">
                <Text variant="bodyMed" tone="accent">See all</Text>
              </AnimatedPressable>
            </View>

            {activeFlocks.length === 0 ? (
              <EmptyState
                icon="egg-outline"
                title="No active flocks yet"
                body="Start your first batch to see growth, mortality and FCR tracked automatically."
                actionLabel="Add a flock"
                onAction={() => router.push('/(tabs)/flocks')}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.xl }}>
                {activeFlocks.map((f, i) => {
                  const progress = Math.min(1, daysBetween(f.date_arrived) / ((f.status === 'Selling' ? 6 : 6) * 7));
                  return (
                    <FadeInView key={f.flock_id} index={i}>
                      <AnimatedPressable onPress={() => router.push(`/(tabs)/flocks/${f.flock_id}`)} haptic="selection" scaleTo={0.97}>
                        <Card style={styles.flockCard}>
                          <View style={styles.flockCardHead}>
                            <Text variant="h3">{f.flock_code}</Text>
                            <Text variant="micro" tone={f.mortality_rate > 0.05 ? 'danger' : 'success'}>
                              {formatPct(f.mortality_rate)} MORT
                            </Text>
                          </View>
                          <Text variant="statNumber" style={{ marginTop: space.sm }}>{f.birds_remaining}</Text>
                          <Text variant="caption" tone="tertiary">birds remaining</Text>
                          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSunken }]}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
                          </View>
                          <Text variant="caption" tone="secondary" style={{ marginTop: 6 }}>{daysBetween(f.date_arrived)} days old</Text>
                        </Card>
                      </AnimatedPressable>
                    </FadeInView>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.sm },
  alertScroll: { marginTop: space.xl },
  alertCard: { width: 240, borderWidth: 1 },
  alertHead: { flexDirection: 'row', alignItems: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.xl },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xxl, marginBottom: space.md },
  flockCard: { width: 168 },
  flockCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  progressTrack: { height: 4, borderRadius: 2, marginTop: space.md, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  hubBanner: { flexDirection: 'row', alignItems: 'center', padding: space.lg, borderRadius: radius.lg, marginTop: space.xl },
  hubIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
