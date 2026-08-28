import React, { useCallback, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { NewFlockSheet, NewFlockSheetHandle } from '@/components/flocks/NewFlockSheet';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase, FlockSummary } from '@/lib/supabase';
import { formatPct, formatKES, daysBetween } from '@/lib/format';
import { space, radius } from '@/lib/theme';

const FILTERS = ['All', 'Active', 'Selling', 'Sold Out'] as const;

export default function FlocksListScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [flocks, setFlocks] = useState<FlockSummary[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [refreshing, setRefreshing] = useState(false);
  const sheetRef = useRef<NewFlockSheetHandle>(null);

  const load = useCallback(async () => {
    if (!farm) return;
    const { data } = await supabase.from('flock_summary').select('*').eq('farm_id', farm.id).order('date_arrived', { ascending: false });
    setFlocks((data as FlockSummary[]) ?? []);
  }, [farm?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const visible = (flocks ?? []).filter((f) => filter === 'All' || f.status === filter);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h1">Flocks</Text>
        <AnimatedPressable onPress={() => sheetRef.current?.open()} haptic="light" style={[styles.addBtn, { backgroundColor: colors.accent }]}>
          <Ionicons name="add" size={22} color={colors.accentText} />
        </AnimatedPressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.xl }}>
        {FILTERS.map((f) => <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />)}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}>
        {flocks === null ? (
          <View style={{ gap: space.md }}>{[0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={96} />)}</View>
        ) : visible.length === 0 ? (
          <EmptyState icon="egg-outline" title="No flocks here" body="Add your first batch of chicks to start tracking growth, feed and vaccines." actionLabel="Add a flock" onAction={() => sheetRef.current?.open()} />
        ) : (
          visible.map((f, i) => (
            <FadeInView key={f.flock_id} index={i}>
              <AnimatedPressable onPress={() => router.push(`/(tabs)/flocks/${f.flock_id}`)} haptic="selection" scaleTo={0.98}>
                <Card style={styles.card}>
                  <View style={styles.cardTop}>
                    <View>
                      <Text variant="h3">{f.flock_code}</Text>
                      <Text variant="caption" tone="tertiary">{daysBetween(f.date_arrived)} days old · {f.status}</Text>
                    </View>
                    <View style={[styles.statusDot, {
                      backgroundColor: f.status === 'Active' ? colors.successSoft : f.status === 'Selling' ? colors.warningSoft : colors.surfaceSunken,
                    }]}>
                      <Text variant="micro" tone={f.status === 'Active' ? 'success' : f.status === 'Selling' ? 'warning' : 'tertiary'}>
                        {f.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardStats}>
                    <MiniStat label="Remaining" value={String(f.birds_remaining)} />
                    <MiniStat label="Mortality" value={formatPct(f.mortality_rate)} tone={f.mortality_rate > 0.05 ? 'danger' : 'success'} />
                    <MiniStat label="FCR" value={f.fcr ? f.fcr.toFixed(2) : '—'} />
                    <MiniStat label="Profit" value={formatKES(f.net_profit)} tone={f.net_profit >= 0 ? 'success' : 'danger'} />
                  </View>
                </Card>
              </AnimatedPressable>
            </FadeInView>
          ))
        )}
        <View style={{ height: 140 }} />
      </ScrollView>

      <NewFlockSheet ref={sheetRef} onCreated={load} />
    </SafeAreaView>
  );
}

function MiniStat({ label, value, tone = 'primary' }: { label: string; value: string; tone?: 'primary' | 'success' | 'danger' }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="micro" tone="tertiary">{label.toUpperCase()}</Text>
      <Text variant="bodyMed" tone={tone} style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexGrow: 0, marginBottom: space.lg },
  list: { paddingHorizontal: space.xl, gap: space.md },
  card: {},
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusDot: { paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill },
  cardStats: { flexDirection: 'row', marginTop: space.lg, gap: space.sm },
});
