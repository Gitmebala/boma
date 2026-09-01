import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenList, capStaggerIndex } from '@/components/ui/VirtualList';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { useSync } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { formatKES } from '@/lib/format';
import { space } from '@/lib/theme';

const FEED_TYPES = ['Starter', 'Grower', 'Finisher', 'Other'];

export default function FeedStockScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const { enqueueInsert } = useSync();
  const [rows, setRows] = useState<any[]>([]);
  const [feedType, setFeedType] = useState(FEED_TYPES[0]);
  const [bagsIn, setBagsIn] = useState('');
  const [bagsOut, setBagsOut] = useState('');
  const [costPerBag, setCostPerBag] = useState('');
  const [saving, setSaving] = useState(false);

  const [kgLogged, setKgLogged] = useState(0);

  const load = useCallback(async () => {
    if (!farm) return;
    const [{ data }, { data: flocks }] = await Promise.all([
      supabase.from('feed_stock').select('*').eq('farm_id', farm.id).order('tx_date', { ascending: false }),
      supabase.from('flocks').select('id').eq('farm_id', farm.id),
    ]);
    setRows(data ?? []);

    // The store above is counted in bags; daily logs record kg eaten. They
    // were two unconnected worlds, so "in store" never matched reality. We
    // don't silently convert (bag weights vary) — we show the reconciliation
    // so the farmer can see whether the two stories agree.
    const ids = (flocks ?? []).map((f: any) => f.id);
    if (ids.length) {
      const { data: logs } = await supabase.from('daily_logs').select('feed_used_kg').in('flock_id', ids);
      setKgLogged((logs ?? []).reduce((s: number, l: any) => s + Number(l.feed_used_kg ?? 0), 0));
    }
  }, [farm?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stockByType = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.feed_type, (map.get(r.feed_type) ?? 0) + Number(r.bags_in) - Number(r.bags_out)));
    return Array.from(map.entries());
  }, [rows]);

  const save = async () => {
    if (!farm || (!bagsIn && !bagsOut)) return;
    setSaving(true);
    await enqueueInsert('feed_stock', {
      farm_id: farm.id, tx_date: new Date().toISOString().slice(0, 10), feed_type: feedType,
      bags_in: Number(bagsIn) || 0, bags_out: Number(bagsOut) || 0, cost_per_bag: costPerBag ? Number(costPerBag) : null,
    });
    setSaving(false); setBagsIn(''); setBagsOut(''); setCostPerBag('');
    load();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Feed stock</Text>
      </View>
      <ScreenList
        data={rows}
        keyExtractor={(r: any) => r.id}
        contentContainerStyle={{ padding: space.xl }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {stockByType.length > 0 && (
              <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.xl, flexWrap: 'wrap' }}>
                {stockByType.map(([type, bags]) => (
                  <Card key={type} style={{ flex: 1, minWidth: 140 }}>
                    <Text variant="micro" tone="tertiary">{type.toUpperCase()}</Text>
                    <Text variant="h2" tone={bags < 5 ? 'danger' : 'primary'}>{bags.toFixed(0)}</Text>
                    <Text variant="caption" tone="tertiary">bags in store</Text>
                  </Card>
                ))}
              </View>
            )}

            {kgLogged > 0 && (
              <Card sunken style={{ marginBottom: space.xl }}>
                <Text variant="caption" tone="secondary">
                  Your daily logs say the birds have eaten <Text variant="bodyMed">{Math.round(kgLogged)} kg</Text> so
                  far — about {Math.ceil(kgLogged / 50)} bags of 50 kg. If the store above shows more than what's
                  physically there, log the used bags out here.
                </Text>
              </Card>
            )}

            <Card style={{ marginBottom: space.xl }}>
              <Text variant="h3" style={{ marginBottom: space.md }}>Record movement</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
                {FEED_TYPES.map((t) => <Chip key={t} label={t} selected={feedType === t} onPress={() => setFeedType(t)} />)}
              </View>
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <View style={{ flex: 1 }}><Field label="Bags in" value={bagsIn} onChangeText={setBagsIn} keyboardType="decimal-pad" /></View>
                <View style={{ flex: 1 }}><Field label="Bags out" value={bagsOut} onChangeText={setBagsOut} keyboardType="decimal-pad" /></View>
              </View>
              <Field label="Cost per bag" value={costPerBag} onChangeText={setCostPerBag} keyboardType="decimal-pad" suffix="KES" placeholder="Optional" />
              <Button label="Save" onPress={save} loading={saving} disabled={!bagsIn && !bagsOut} />
            </Card>
          </>
        }
        ListEmptyComponent={
          <EmptyState icon="cube-outline" title="No feed movements yet" body="Log bags in when you buy feed, and bags out as it's used." />
        }
        renderItem={({ item: r, index }: { item: any; index: number }) => (
          <FadeInView index={capStaggerIndex(index)}>
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMed">{r.feed_type}</Text>
                <Text variant="caption" tone="tertiary">{new Date(r.tx_date).toLocaleDateString()}</Text>
              </View>
              <Text variant="bodyMed" tone={r.bags_in > 0 ? 'success' : 'danger'}>
                {r.bags_in > 0 ? `+${r.bags_in}` : `-${r.bags_out}`}
              </Text>
            </Card>
          </FadeInView>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
});
