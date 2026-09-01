import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { useSync } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { formatKES, daysBetween } from '@/lib/format';
import { space, layout } from '@/lib/theme';

export default function EquipmentScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const { enqueueInsert } = useSync();
  const [rows, setRows] = useState<any[]>([]);
  const [item, setItem] = useState('');
  const [cost, setCost] = useState('');
  const [life, setLife] = useState('3');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!farm) return;
    const { data } = await supabase.from('equipment').select('*').eq('farm_id', farm.id).order('date_bought', { ascending: false });
    setRows(data ?? []);
  }, [farm?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!farm || !item.trim() || !cost) return;
    setSaving(true);
    await enqueueInsert('equipment', { farm_id: farm.id, date_bought: new Date().toISOString().slice(0, 10), item: item.trim(), cost: Number(cost), useful_life_years: Number(life) || 3 });
    setSaving(false); setItem(''); setCost(''); setLife('3');
    load();
  };

  const currentValue = (r: any) => {
    const yearsOld = daysBetween(r.date_bought) / 365;
    const v = r.cost - (r.cost / r.useful_life_years) * yearsOld;
    return Math.max(0, v);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Equipment</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: layout.tabBarClearance }} keyboardShouldPersistTaps="handled">
        <Card style={{ marginBottom: space.xl }}>
          <Text variant="h3" style={{ marginBottom: space.md }}>Add equipment</Text>
          <Field label="Item" value={item} onChangeText={setItem} placeholder="e.g. Brooder, water tank" />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}><Field label="What you paid" value={cost} onChangeText={setCost} keyboardType="decimal-pad" suffix="KES" /></View>
            <View style={{ flex: 1 }}><Field label="Years it lasts" value={life} onChangeText={setLife} keyboardType="number-pad" /></View>
          </View>
          <Text variant="caption" tone="tertiary" style={{ marginBottom: space.lg }}>
            Kept separate from flock costs — so one batch doesn't carry the whole cost of something that lasts for years.
          </Text>
          <Button label="Add" onPress={save} loading={saving} disabled={!item.trim() || !cost} />
        </Card>

        {rows.length === 0 ? (
          <EmptyState icon="construct-outline" title="No equipment logged" body="Big one-time purchases like brooders and tanks go here, not in Expenses." />
        ) : (
          rows.map((r) => (
            <Card key={r.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMed">{r.item}</Text>
                <Text variant="caption" tone="tertiary">Bought for {formatKES(r.cost)} · {r.useful_life_years}yr life</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="micro" tone="tertiary">WORTH NOW</Text>
                <Text variant="bodyMed">{formatKES(currentValue(r))}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
});
