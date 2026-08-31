import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { formatKES, daysBetween } from '@/lib/format';
import { space, radius, layout } from '@/lib/theme';

interface Deal {
  id: string; kind: 'buy' | 'sell'; title: string; description: string | null;
  county: string | null; unit_label: string | null;
  target_quantity: number | null; committed_quantity: number;
  unit_price: number | null; closes_on: string | null; status: string;
}

export default function GroupDealsScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [myCommits, setMyCommits] = useState<Record<string, number>>({});
  const [kind, setKind] = useState<'buy' | 'sell'>('buy');
  const [joining, setJoining] = useState<string | null>(null);
  const [qty, setQty] = useState('');

  const load = useCallback(async () => {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from('group_deals').select('*').eq('status', 'open').order('closes_on'),
      farm ? supabase.from('group_deal_commitments').select('deal_id, quantity').eq('farm_id', farm.id)
           : Promise.resolve({ data: [] as any[] }),
    ]);
    setDeals((d as Deal[]) ?? []);
    const map: Record<string, number> = {};
    (c ?? []).forEach((row: any) => { map[row.deal_id] = Number(row.quantity); });
    setMyCommits(map);
  }, [farm?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const commit = async (dealId: string) => {
    if (!farm || !qty) return;
    await supabase.from('group_deal_commitments').upsert(
      { deal_id: dealId, farm_id: farm.id, quantity: Number(qty) },
      { onConflict: 'deal_id,farm_id' }
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJoining(null); setQty('');
    load();
  };

  const visible = deals.filter((d) => d.kind === kind);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Group deals</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: layout.tabBarClearance }} showsVerticalScrollIndicator={false}>
        <Card style={{ backgroundColor: colors.accentSoft, borderColor: 'transparent', marginBottom: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="people" size={18} color={colors.accent} />
            <Text variant="caption" tone="secondary" style={{ flex: 1, marginLeft: space.sm }}>
              One farmer buying 10 bags pays retail. Twenty farmers buying 200 bags together get wholesale. Same idea when selling to a big buyer.
            </Text>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
          <Chip label="Buying together" selected={kind === 'buy'} onPress={() => setKind('buy')} />
          <Chip label="Selling together" selected={kind === 'sell'} onPress={() => setKind('sell')} />
        </View>

        {visible.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={kind === 'buy' ? 'No buying groups open' : 'No selling groups open'}
            body="When farmers near you open a group deal, it appears here. Joining is a commitment, not a payment — you pay the supplier directly."
          />
        ) : visible.map((d, i) => {
          const pct = d.target_quantity ? Math.min(100, (d.committed_quantity / d.target_quantity) * 100) : 0;
          const mine = myCommits[d.id];
          const daysLeft = d.closes_on ? -daysBetween(d.closes_on) : null;
          return (
            <FadeInView key={d.id} index={i} style={{ marginBottom: space.md }}>
              <Card>
                <View style={styles.rowBetween}>
                  <Text variant="h3" style={{ flex: 1 }}>{d.title}</Text>
                  {d.unit_price ? (
                    <Text variant="bodyMed" tone="accent">{formatKES(d.unit_price)}<Text variant="caption" tone="tertiary">/{d.unit_label}</Text></Text>
                  ) : null}
                </View>
                {d.description ? (
                  <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>{d.description}</Text>
                ) : null}

                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSunken }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
                </View>
                <View style={styles.rowBetween}>
                  <Text variant="caption" tone="secondary">
                    {Number(d.committed_quantity).toLocaleString()} of {Number(d.target_quantity ?? 0).toLocaleString()} {d.unit_label} committed
                  </Text>
                  {daysLeft !== null && (
                    <Text variant="caption" tone={daysLeft <= 3 ? 'warning' : 'tertiary'}>
                      {daysLeft <= 0 ? 'Closing today' : `${daysLeft}d left`}
                    </Text>
                  )}
                </View>

                {mine ? (
                  <View style={[styles.joined, { backgroundColor: colors.successSoft }]}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text variant="label" style={{ color: colors.success, marginLeft: space.sm }}>
                      You committed {mine} {d.unit_label}
                    </Text>
                  </View>
                ) : joining === d.id ? (
                  <View style={{ marginTop: space.md }}>
                    <Field
                      label={`How many ${d.unit_label}?`}
                      value={qty}
                      onChangeText={setQty}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    <View style={{ flexDirection: 'row', gap: space.sm }}>
                      <Button label="Cancel" variant="secondary" onPress={() => { setJoining(null); setQty(''); }} />
                      <Button label="Commit" onPress={() => commit(d.id)} disabled={!qty} />
                    </View>
                  </View>
                ) : (
                  <Button
                    label="Join this deal"
                    variant="secondary"
                    onPress={() => { Haptics.selectionAsync(); setJoining(d.id); }}
                    style={{ marginTop: space.md }}
                  />
                )}
              </Card>
            </FadeInView>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  progressTrack: { height: 6, borderRadius: 3, marginTop: space.lg, marginBottom: space.sm, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  joined: { flexDirection: 'row', alignItems: 'center', padding: space.md, borderRadius: radius.md, marginTop: space.md },
});
