import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { Sheet } from '@/components/ui/Sheet';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { EntityAutocomplete } from '@/components/ui/EntityAutocomplete';
import { FlockPicker } from '@/components/shared/FlockPicker';
import { PaymentSheet, CashSheet } from '@/components/money/MoneySheets';
import { ReceiptAttach } from '@/components/receipts/ReceiptAttach';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { useAuth } from '@/lib/AuthContext';
import { uploadReceipt, ReceiptAsset } from '@/lib/receipts';
import { supabase, EXPENSE_CATEGORIES, PAYMENT_METHODS, FlockSummary } from '@/lib/supabase';
import { formatKES } from '@/lib/format';
import { space, radius, elevation } from '@/lib/theme';

type ActionKey = 'deaths' | 'feed' | 'weigh' | 'expense' | 'sale' | 'payment' | 'cash';

const GROUPS: {
  title: string;
  hint: string;
  actions: { key: ActionKey; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap; tone: 'danger' | 'accent' | 'warning' | 'success' }[];
}[] = [
  {
    title: 'Every day',
    hint: 'Thirty seconds in the house, and the rest of the app stays accurate.',
    actions: [
      { key: 'deaths', label: 'Deaths', hint: 'Birds lost today', icon: 'alert-circle-outline', tone: 'danger' },
      { key: 'feed', label: 'Feed', hint: 'Bags or kg used', icon: 'nutrition-outline', tone: 'accent' },
      { key: 'weigh', label: 'Weigh-in', hint: 'Sample weight', icon: 'speedometer-outline', tone: 'accent' },
    ],
  },
  {
    title: 'Money',
    hint: 'Log these as they happen and your profit stays honest.',
    actions: [
      { key: 'sale', label: 'Sale', hint: 'Birds sold to a buyer', icon: 'pricetag-outline', tone: 'success' },
      { key: 'expense', label: 'Expense', hint: 'Something you paid for', icon: 'card-outline', tone: 'warning' },
      { key: 'payment', label: 'Payment received', hint: 'A customer clearing what they owe', icon: 'cash-outline', tone: 'success' },
      { key: 'cash', label: 'Cash in or out', hint: 'Your own money, a loan, household cash', icon: 'swap-vertical-outline', tone: 'accent' },
    ],
  },
];

export default function LogScreen() {
  const dailyRef = useRef<BottomSheet>(null);
  const expenseRef = useRef<BottomSheet>(null);
  const saleRef = useRef<BottomSheet>(null);
  const paymentRef = useRef<BottomSheet>(null);
  const cashRef = useRef<BottomSheet>(null);
  const [dailyMode, setDailyMode] = useState<'deaths' | 'feed' | 'weigh'>('deaths');

  const open = (key: ActionKey) => {
    Haptics.selectionAsync();
    if (key === 'expense') expenseRef.current?.expand();
    else if (key === 'sale') saleRef.current?.expand();
    else if (key === 'payment') paymentRef.current?.expand();
    else if (key === 'cash') cashRef.current?.expand();
    else {
      setDailyMode(key);
      dailyRef.current?.expand();
    }
  };

  return (
    <Screen>
      <ScreenScroll>
        <Text variant="h1" style={{ paddingTop: space.xs }}>Quick log</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>
          The batch, date and category you used last time stay put.
        </Text>

        {GROUPS.map((group, gi) => (
          <View key={group.title} style={{ marginTop: space.xxl }}>
            <Text variant="label" tone="tertiary">{group.title.toUpperCase()}</Text>
            <Text variant="caption" tone="quiet" style={{ marginTop: 2, marginBottom: space.md }}>
              {group.hint}
            </Text>

            {group.actions.map((a, i) => (
              <ActionRow key={a.key} action={a} index={gi * 3 + i} onPress={() => open(a.key)} />
            ))}
          </View>
        ))}
      </ScreenScroll>

      <DailySheet ref={dailyRef} mode={dailyMode} />
      <ExpenseSheet ref={expenseRef} />
      <SaleSheet ref={saleRef} />
      <PaymentSheet ref={paymentRef} />
      <CashSheet ref={cashRef} />
    </Screen>
  );
}

/**
 * Full-width rows rather than a 3-across grid of small squares: the label and
 * a line of explanation both fit, and the target is the width of the screen —
 * far easier to hit one-handed than a 31%-wide tile (Fitts's law).
 */
function ActionRow({
  action,
  index,
  onPress,
}: {
  action: { label: string; hint: string; icon: keyof typeof Ionicons.glyphMap; tone: 'danger' | 'accent' | 'warning' | 'success' };
  index: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const toneColor = {
    danger: colors.danger,
    accent: colors.accent,
    warning: colors.warning,
    success: colors.success,
  }[action.tone];
  const softColor = {
    danger: colors.dangerSoft,
    accent: colors.accentSoft,
    warning: colors.warningSoft,
    success: colors.successSoft,
  }[action.tone];

  return (
    <FadeInView index={index} style={{ marginBottom: space.sm }}>
      <AnimatedPressable onPress={onPress} haptic="medium" scaleTo={0.985}>
        <View
          style={[
            styles.actionRow,
            { backgroundColor: colors.surface, borderColor: colors.border, ...elevation(1, colors.shadow) },
          ]}>
          <View style={[styles.iconWrap, { backgroundColor: softColor }]}>
            <Ionicons name={action.icon} size={22} color={toneColor} />
          </View>
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Text variant="h3">{action.label}</Text>
            <Text variant="caption" tone="tertiary" style={{ marginTop: 1 }}>{action.hint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textQuiet} />
        </View>
      </AnimatedPressable>
    </FadeInView>
  );
}

// ---------------------------------------------------------------------------
// Daily log
// ---------------------------------------------------------------------------
const DailySheet = React.forwardRef<BottomSheet, { mode: 'deaths' | 'feed' | 'weigh' }>(({ mode }, ref) => {
  const { colors } = useTheme();
  const [flockId, setFlockId] = useState<string | null>(null);
  const [deaths, setDeaths] = useState('');
  const [feed, setFeed] = useState('');
  const [weight, setWeight] = useState('');
  // A farmer often opens the app the morning after — v1 could only record
  // "today", which silently mis-dated every one of those entries.
  const [agoDays, setAgoDays] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titles = { deaths: 'Log deaths', feed: 'Log feed used', weigh: 'Log a weigh-in' };
  const subtitles = {
    deaths: 'Leave it at zero if none died.',
    feed: 'Total eaten by this batch that day.',
    weigh: 'Weigh a handful of birds and enter the average.',
  };

  const save = async () => {
    if (!flockId) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('daily_logs').insert({
      flock_id: flockId,
      log_date: new Date(Date.now() - agoDays * 86400000).toISOString().slice(0, 10),
      birds_died: mode === 'deaths' ? Number(deaths) || 0 : 0,
      feed_used_kg: mode === 'feed' && feed ? Number(feed) : null,
      avg_weight_sample_kg: mode === 'weigh' && weight ? Number(weight) : null,
    });
    setSaving(false);
    if (err) { setError('Not saved — check your signal and try again.'); return; }
    setDeaths(''); setFeed(''); setWeight(''); setAgoDays(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    (ref as any)?.current?.close();
  };

  return (
    <Sheet
      ref={ref}
      title={titles[mode]}
      subtitle={subtitles[mode]}
      snapPoints={['68%']}
      footer={
        <View>
          {error ? (
            <Text variant="caption" tone="danger" style={{ marginBottom: space.sm }}>{error}</Text>
          ) : null}
          <Button label="Save entry" onPress={save} loading={saving} disabled={!flockId} size="lg" />
        </View>
      }>
      <FlockPicker value={flockId} onChange={setFlockId} />

      <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>WHICH DAY?</Text>
      <View style={[styles.chipWrap, { marginBottom: space.lg }]}>
        {(['Today', 'Yesterday'] as const).map((label, i) => (
          <Chip key={label} label={label} selected={agoDays === i} onPress={() => setAgoDays(i)} />
        ))}
      </View>

      {mode === 'deaths' && <Field label="Birds died" value={deaths} onChangeText={setDeaths} keyboardType="number-pad" />}
      {mode === 'feed' && <Field label="Feed used (kg)" value={feed} onChangeText={setFeed} keyboardType="decimal-pad" suffix="kg" />}
      {mode === 'weigh' && <Field label="Average sample weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix="kg" />}
    </Sheet>
  );
});
DailySheet.displayName = 'DailySheet';

// ---------------------------------------------------------------------------
// Expense
// ---------------------------------------------------------------------------
const ExpenseSheet = React.forwardRef<BottomSheet>((_, ref) => {
  const { farm } = useFarm();
  const { session } = useAuth();
  const [flockId, setFlockId] = useState<string | null>(null);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [supplier, setSupplier] = useState<{ id: string; name: string } | null>(null);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [receipt, setReceipt] = useState<ReceiptAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const total = (Number(qty) || 1) * (Number(cost) || 0);

  const save = async () => {
    if (!farm || !cost) return;
    setSaving(true);

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        farm_id: farm.id,
        flock_id: flockId,
        expense_date: new Date().toISOString().slice(0, 10),
        category,
        item: item || null,
        quantity: qty ? Number(qty) : null,
        cost_per_unit: Number(cost),
        supplier_id: supplier?.id ?? null,
        payment_method: method,
      })
      .select('id')
      .single();

    // Upload the photo only once the expense exists, so the receipt can point
    // at a real row. A failed upload must not lose the expense itself — the
    // cost is the important record, the photo is the evidence.
    if (!error && expense && receipt) {
      const uploaded = await uploadReceipt({
        farmId: farm.id,
        userId: session?.user?.id,
        asset: receipt,
        relatedTable: 'expenses',
        relatedId: expense.id,
        description: `${category}${item ? ` · ${item}` : ''}`,
        amount: total,
      });
      if (uploaded.ok) {
        await supabase.from('expenses').update({ receipt_url: uploaded.path }).eq('id', expense.id);
      }
    }

    setSaving(false);
    setItem(''); setQty(''); setCost(''); setSupplier(null); setReceipt(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    (ref as any)?.current?.close();
  };

  return (
    <Sheet
      ref={ref}
      title="Log expense"
      snapPoints={['92%']}
      footer={
        <View>
          <View style={styles.footerTotal}>
            <Text variant="caption" tone="tertiary">Total</Text>
            <Text variant="statSm">{formatKES(total)}</Text>
          </View>
          <Button label="Save expense" onPress={save} loading={saving} disabled={!cost} size="lg" />
        </View>
      }>
      <FlockPicker value={flockId} onChange={setFlockId} allowGeneral />

      <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>CATEGORY</Text>
      <View style={styles.chipWrap}>
        {EXPENSE_CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>

      <Field label="Item / description" value={item} onChangeText={setItem} placeholder="Optional" style={{ marginTop: space.lg }} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="decimal-pad" placeholder="1" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Cost per unit" value={cost} onChangeText={setCost} keyboardType="decimal-pad" suffix="KES" />
        </View>
      </View>

      <EntityAutocomplete label="Supplier" table="suppliers" value={supplier} onChange={setSupplier} />

      <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>PAYMENT METHOD</Text>
      <View style={[styles.chipWrap, { marginBottom: space.lg }]}>
        {PAYMENT_METHODS.map((m) => (
          <Chip key={m} label={m} selected={method === m} onPress={() => setMethod(m)} />
        ))}
      </View>

      <ReceiptAttach value={receipt} onChange={setReceipt} />
    </Sheet>
  );
});
ExpenseSheet.displayName = 'ExpenseSheet';

// ---------------------------------------------------------------------------
// Sale
// ---------------------------------------------------------------------------
const SaleSheet = React.forwardRef<BottomSheet>((_, ref) => {
  const { farm } = useFarm();
  const { colors } = useTheme();
  const [flockId, setFlockId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [basis, setBasis] = useState<'Per Bird' | 'Per Kg'>('Per Bird');
  const [birds, setBirds] = useState('');
  const [avgWeight, setAvgWeight] = useState('');
  const [price, setPrice] = useState(String(farm?.standard_bird_price ?? 500));
  const [paid, setPaid] = useState('');
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<FlockSummary | null>(null);

  // Pull the selected batch's break-even so it can be shown right beside the
  // price field. Recognition over recall: the farmer should never have to
  // remember what this batch cost them in order to price it.
  useEffect(() => {
    if (!flockId) { setSummary(null); return; }
    let cancelled = false;
    supabase
      .from('flock_summary')
      .select('*')
      .eq('flock_id', flockId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSummary((data as FlockSummary) ?? null);
      });
    return () => { cancelled = true; };
  }, [flockId]);

  const total = basis === 'Per Kg'
    ? (Number(birds) || 0) * (Number(avgWeight) || 0) * (Number(price) || 0)
    : (Number(birds) || 0) * (Number(price) || 0);
  const balance = total - (Number(paid) || 0);

  const breakEven = summary?.break_even_price ?? null;
  const priceNum = Number(price) || 0;
  const belowBreakEven = breakEven != null && breakEven > 0 && basis === 'Per Bird' && priceNum < breakEven;

  const overSelling = summary != null && Number(birds) > summary.birds_remaining;

  const save = async () => {
    if (!farm || !flockId || !customer || !birds) return;
    setSaving(true);
    await supabase.from('sales').insert({
      farm_id: farm.id,
      flock_id: flockId,
      customer_id: customer.id,
      sale_date: new Date().toISOString().slice(0, 10),
      birds_sold: Number(birds),
      avg_weight_per_bird: avgWeight ? Number(avgWeight) : null,
      price_basis: basis,
      price: Number(price),
      amount_paid: Number(paid) || 0,
    });
    setSaving(false);
    setBirds(''); setAvgWeight(''); setPaid(''); setCustomer(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    (ref as any)?.current?.close();
  };

  return (
    <Sheet
      ref={ref}
      title="Log sale"
      snapPoints={['92%']}
      footer={
        <View>
          <View style={styles.footerTotal}>
            <View>
              <Text variant="caption" tone="tertiary">Total</Text>
              <Text variant="statSm">{formatKES(total)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" tone="tertiary">Balance</Text>
              <Text variant="statSm" tone={balance > 0 ? 'warning' : 'success'}>{formatKES(balance)}</Text>
            </View>
          </View>
          <Button
            label="Save sale"
            onPress={save}
            loading={saving}
            disabled={!flockId || !customer || !birds}
            size="lg"
          />
        </View>
      }>
      <FlockPicker value={flockId} onChange={setFlockId} />
      <EntityAutocomplete label="Customer" table="customers" value={customer} onChange={setCustomer} />

      <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>PRICE BASIS</Text>
      <View style={[styles.chipWrap, { marginBottom: space.lg }]}>
        <Chip label="Per Bird" selected={basis === 'Per Bird'} onPress={() => setBasis('Per Bird')} />
        <Chip label="Per Kg" selected={basis === 'Per Kg'} onPress={() => setBasis('Per Kg')} />
      </View>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Birds sold" value={birds} onChangeText={setBirds} keyboardType="number-pad" />
        </View>
        {basis === 'Per Kg' && (
          <View style={{ flex: 1 }}>
            <Field label="Avg weight/bird" value={avgWeight} onChangeText={setAvgWeight} keyboardType="decimal-pad" suffix="kg" />
          </View>
        )}
      </View>

      {/* Guard rails, shown only when they apply, so they read as help rather
          than noise. */}
      {overSelling && summary ? (
        <Note tone="danger" icon="alert-circle">
          This batch only has {summary.birds_remaining} birds left. Check the number before saving.
        </Note>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" suffix="KES" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Amount paid now" value={paid} onChangeText={setPaid} keyboardType="decimal-pad" suffix="KES" />
        </View>
      </View>

      {breakEven != null && breakEven > 0 && basis === 'Per Bird' ? (
        <Note tone={belowBreakEven ? 'danger' : 'success'} icon={belowBreakEven ? 'trending-down' : 'checkmark-circle'}>
          {belowBreakEven
            ? `Below break-even. This batch cost ${formatKES(breakEven)} a bird — you'd lose ${formatKES(breakEven - priceNum)} on each one.`
            : `Break-even is ${formatKES(breakEven)} a bird, so you're making ${formatKES(priceNum - breakEven)} on each.`}
        </Note>
      ) : null}
    </Sheet>
  );
});
SaleSheet.displayName = 'SaleSheet';

function Note({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: 'danger' | 'success' | 'warning';
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  const fg = { danger: colors.danger, success: colors.success, warning: colors.warning }[tone];
  const bg = { danger: colors.dangerSoft, success: colors.successSoft, warning: colors.warningSoft }[tone];
  return (
    <View style={[styles.note, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={fg} />
      <Text variant="caption" style={{ flex: 1, marginLeft: space.sm, color: fg }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
  },
  iconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: space.md,
    borderRadius: radius.md,
    marginBottom: space.lg,
  },
  footerTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
});
