import React, { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { Sheet } from '@/components/ui/Sheet';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { EntityAutocomplete } from '@/components/ui/EntityAutocomplete';
import { FlockPicker } from '@/components/shared/FlockPicker';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/lib/supabase';
import { space, radius } from '@/lib/theme';

const ACTIONS = [
  { key: 'deaths', label: 'Deaths', icon: 'skull-outline', color: 'danger' },
  { key: 'feed', label: 'Feed', icon: 'nutrition-outline', color: 'primary' },
  { key: 'weigh', label: 'Weigh', icon: 'scale-outline', color: 'primary' },
  { key: 'expense', label: 'Expense', icon: 'card-outline', color: 'warning' },
  { key: 'sale', label: 'Sale', icon: 'pricetag-outline', color: 'success' },
] as const;

export default function LogScreen() {
  const { colors } = useTheme();
  const dailyRef = useRef<BottomSheet>(null);
  const expenseRef = useRef<BottomSheet>(null);
  const saleRef = useRef<BottomSheet>(null);
  const [dailyMode, setDailyMode] = useState<'deaths' | 'feed' | 'weigh'>('deaths');

  const open = (key: (typeof ACTIONS)[number]['key']) => {
    Haptics.selectionAsync();
    if (key === 'expense') expenseRef.current?.expand();
    else if (key === 'sale') saleRef.current?.expand();
    else { setDailyMode(key); dailyRef.current?.expand(); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="h1">Quick log</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 4, marginBottom: space.xxl }}>
          Log something in seconds. The flock, date and category you last used stay put.
        </Text>

        <View style={styles.grid}>
          {ACTIONS.map((a, i) => (
            <FadeInView key={a.key} index={i} style={styles.gridItem}>
              <AnimatedPressable onPress={() => open(a.key)} haptic="medium" scaleTo={0.95}>
                <Card style={styles.actionCard}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSunken }]}>
                    <Ionicons name={a.icon as any} size={26} color={colors.accent} />
                  </View>
                  <Text variant="h3" style={{ marginTop: space.md }}>{a.label}</Text>
                </Card>
              </AnimatedPressable>
            </FadeInView>
          ))}
        </View>
      </ScrollView>

      <DailySheet ref={dailyRef} mode={dailyMode} />
      <ExpenseSheet ref={expenseRef} />
      <SaleSheet ref={saleRef} />
    </SafeAreaView>
  );
}

const DailySheet = React.forwardRef<BottomSheet, { mode: 'deaths' | 'feed' | 'weigh' }>(({ mode }, ref) => {
  const { farm } = useFarm();
  const [flockId, setFlockId] = useState<string | null>(null);
  const [deaths, setDeaths] = useState('');
  const [feed, setFeed] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const titles = { deaths: 'Log deaths', feed: 'Log feed used', weigh: 'Log a weigh-in' };

  const save = async () => {
    if (!flockId) return;
    setSaving(true);
    await supabase.from('daily_logs').insert({
      flock_id: flockId,
      log_date: new Date().toISOString().slice(0, 10),
      birds_died: mode === 'deaths' ? Number(deaths) || 0 : 0,
      feed_used_kg: mode === 'feed' && feed ? Number(feed) : null,
      avg_weight_sample_kg: mode === 'weigh' && weight ? Number(weight) : null,
    });
    setSaving(false);
    setDeaths(''); setFeed(''); setWeight('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    (ref as any)?.current?.close();
  };

  return (
    <Sheet ref={ref} title={titles[mode]} snapPoints={['55%']}>
      <FlockPicker value={flockId} onChange={setFlockId} />
      {mode === 'deaths' && <Field label="Birds died today" value={deaths} onChangeText={setDeaths} keyboardType="number-pad" autoFocus />}
      {mode === 'feed' && <Field label="Feed used (kg)" value={feed} onChangeText={setFeed} keyboardType="decimal-pad" autoFocus />}
      {mode === 'weigh' && <Field label="Average sample weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" autoFocus />}
      <Button label="Save entry" onPress={save} loading={saving} disabled={!flockId} size="lg" />
    </Sheet>
  );
});
DailySheet.displayName = 'DailySheet';

const ExpenseSheet = React.forwardRef<BottomSheet>((_, ref) => {
  const { farm } = useFarm();
  const [flockId, setFlockId] = useState<string | null>(null);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [supplier, setSupplier] = useState<{ id: string; name: string } | null>(null);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [saving, setSaving] = useState(false);

  const total = (Number(qty) || 1) * (Number(cost) || 0);

  const save = async () => {
    if (!farm || !cost) return;
    setSaving(true);
    await supabase.from('expenses').insert({
      farm_id: farm.id, flock_id: flockId, expense_date: new Date().toISOString().slice(0, 10),
      category, item: item || null, quantity: qty ? Number(qty) : null, cost_per_unit: Number(cost),
      supplier_id: supplier?.id ?? null, payment_method: method,
    });
    setSaving(false);
    setItem(''); setQty(''); setCost(''); setSupplier(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    (ref as any)?.current?.close();
  };

  return (
    <Sheet ref={ref} title="Log expense" snapPoints={['90%']}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FlockPicker value={flockId} onChange={setFlockId} allowGeneral />
        <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>CATEGORY</Text>
        <View style={styles.chipWrap}>
          {EXPENSE_CATEGORIES.map((c) => <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />)}
        </View>
        <Field label="Item / description" value={item} onChangeText={setItem} placeholder="Optional" style={{ marginTop: space.lg }} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}><Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="decimal-pad" placeholder="1" /></View>
          <View style={{ flex: 1 }}><Field label="Cost per unit" value={cost} onChangeText={setCost} keyboardType="decimal-pad" suffix="KES" /></View>
        </View>
        <EntityAutocomplete label="Supplier" table="suppliers" value={supplier} onChange={setSupplier} />
        <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>PAYMENT METHOD</Text>
        <View style={styles.chipWrap}>
          {PAYMENT_METHODS.map((m) => <Chip key={m} label={m} selected={method === m} onPress={() => setMethod(m)} />)}
        </View>
        <Card style={{ marginTop: space.lg, marginBottom: space.lg }}>
          <Text variant="micro" tone="tertiary">TOTAL</Text>
          <Text variant="statNumber">KES {total.toLocaleString()}</Text>
        </Card>
        <Button label="Save expense" onPress={save} loading={saving} disabled={!cost} size="lg" />
        <View style={{ height: 40 }} />
      </ScrollView>
    </Sheet>
  );
});
ExpenseSheet.displayName = 'ExpenseSheet';

const SaleSheet = React.forwardRef<BottomSheet>((_, ref) => {
  const { farm } = useFarm();
  const [flockId, setFlockId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [basis, setBasis] = useState<'Per Bird' | 'Per Kg'>('Per Bird');
  const [birds, setBirds] = useState('');
  const [avgWeight, setAvgWeight] = useState('');
  const [price, setPrice] = useState(String(farm?.standard_bird_price ?? 500));
  const [paid, setPaid] = useState('');
  const [saving, setSaving] = useState(false);

  const total = basis === 'Per Kg'
    ? (Number(birds) || 0) * (Number(avgWeight) || 0) * (Number(price) || 0)
    : (Number(birds) || 0) * (Number(price) || 0);
  const balance = total - (Number(paid) || 0);

  const save = async () => {
    if (!farm || !flockId || !customer || !birds) return;
    setSaving(true);
    await supabase.from('sales').insert({
      farm_id: farm.id, flock_id: flockId, customer_id: customer.id,
      sale_date: new Date().toISOString().slice(0, 10), birds_sold: Number(birds),
      avg_weight_per_bird: avgWeight ? Number(avgWeight) : null, price_basis: basis,
      price: Number(price), amount_paid: Number(paid) || 0,
    });
    setSaving(false);
    setBirds(''); setAvgWeight(''); setPaid(''); setCustomer(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    (ref as any)?.current?.close();
  };

  return (
    <Sheet ref={ref} title="Log sale" snapPoints={['90%']}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FlockPicker value={flockId} onChange={setFlockId} />
        <EntityAutocomplete label="Customer" table="customers" value={customer} onChange={setCustomer} />
        <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>PRICE BASIS</Text>
        <View style={[styles.chipWrap, { marginBottom: space.lg }]}>
          <Chip label="Per Bird" selected={basis === 'Per Bird'} onPress={() => setBasis('Per Bird')} />
          <Chip label="Per Kg" selected={basis === 'Per Kg'} onPress={() => setBasis('Per Kg')} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}><Field label="Birds sold" value={birds} onChangeText={setBirds} keyboardType="number-pad" /></View>
          {basis === 'Per Kg' && <View style={{ flex: 1 }}><Field label="Avg weight/bird" value={avgWeight} onChangeText={setAvgWeight} keyboardType="decimal-pad" suffix="kg" /></View>}
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}><Field label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" suffix="KES" /></View>
          <View style={{ flex: 1 }}><Field label="Amount paid now" value={paid} onChangeText={setPaid} keyboardType="decimal-pad" suffix="KES" /></View>
        </View>
        <Card style={{ marginBottom: space.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text variant="micro" tone="tertiary">TOTAL</Text>
              <Text variant="h2">KES {total.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="micro" tone="tertiary">BALANCE</Text>
              <Text variant="h2" tone={balance > 0 ? 'warning' : 'success'}>KES {balance.toLocaleString()}</Text>
            </View>
          </View>
        </Card>
        <Button label="Save sale" onPress={save} loading={saving} disabled={!flockId || !customer || !birds} size="lg" />
        <View style={{ height: 40 }} />
      </ScrollView>
    </Sheet>
  );
});
SaleSheet.displayName = 'SaleSheet';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: space.xl, paddingBottom: 140 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  gridItem: { width: '31%' },
  actionCard: { alignItems: 'center', paddingVertical: space.xl },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
