import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/components/ui/Sheet';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EntityAutocomplete } from '@/components/ui/EntityAutocomplete';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase, RECEIPT_METHODS, MONEY_TX, MoneyTxType } from '@/lib/supabase';
import { formatKES } from '@/lib/format';
import { space, radius } from '@/lib/theme';

/**
 * Recording a payment against a debt.
 *
 * This was missing entirely: the Debt tab could show who owed you and send a
 * WhatsApp reminder, but nothing in the app ever wrote to `payments`. A debt
 * book whose balances can only go up isn't a debt book, so this closes the
 * loop — and it's why "cash on hand" never reconciled either.
 */
export const PaymentSheet = React.forwardRef<
  BottomSheet,
  {
    /** Pre-selected customer when opened from a specific debt row. */
    customer?: { id: string; name: string } | null;
    /** What they currently owe, so the farmer can settle it in one tap. */
    outstanding?: number | null;
    onSaved?: () => void;
  }
>(({ customer: initialCustomer, outstanding, onSaved }, ref) => {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const { session } = useAuth();

  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(initialCustomer ?? null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(RECEIPT_METHODS[0]);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCustomer(initialCustomer ?? null);
  }, [initialCustomer?.id]);

  const amountNum = Number(amount) || 0;
  const remaining = outstanding != null ? outstanding - amountNum : null;

  const save = async () => {
    if (!farm || !customer || amountNum <= 0) return;
    setSaving(true);
    const { error } = await supabase.from('payments').insert({
      farm_id: farm.id,
      customer_id: customer.id,
      payment_date: new Date().toISOString().slice(0, 10),
      amount: amountNum,
      payment_method: method,
      reference: reference || null,
      recorded_by: session?.user?.id ?? null,
    });
    setSaving(false);
    if (error) return;

    setAmount('');
    setReference('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaved?.();
    (ref as any)?.current?.close();
  };

  return (
    <Sheet
      ref={ref}
      title="Record a payment"
      subtitle="Money a customer has handed over"
      snapPoints={['80%']}
      footer={
        <View>
          {remaining != null ? (
            <View style={styles.footerRow}>
              <Text variant="caption" tone="tertiary">
                {remaining <= 0 ? 'Clears their balance' : 'Still owing after this'}
              </Text>
              <Text variant="statSm" tone={remaining <= 0 ? 'success' : 'warning'}>
                {formatKES(Math.max(0, remaining))}
              </Text>
            </View>
          ) : null}
          <Button
            label="Save payment"
            onPress={save}
            loading={saving}
            disabled={!customer || amountNum <= 0}
            size="lg"
          />
        </View>
      }>
      {initialCustomer ? (
        <View style={[styles.lockedCustomer, { backgroundColor: colors.surfaceSunken }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
            <Text variant="bodyMed" tone="accent">{initialCustomer.name[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Text variant="bodyMed">{initialCustomer.name}</Text>
            {outstanding != null ? (
              <Text variant="caption" tone="tertiary">Owes {formatKES(outstanding)}</Text>
            ) : null}
          </View>
        </View>
      ) : (
        <EntityAutocomplete label="Customer" table="customers" value={customer} onChange={setCustomer} />
      )}

      <Field
        label="Amount received"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        suffix="KES"
      />

      {/* Paying the whole balance is the common case, so it gets one tap
          rather than making the farmer key the figure in from the row above. */}
      {outstanding != null && outstanding > 0 ? (
        <AnimatedPressable
          onPress={() => setAmount(String(Math.round(outstanding)))}
          haptic="selection"
          style={[styles.quickFill, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="checkmark-done" size={15} color={colors.accent} />
          <Text variant="caption" tone="accent" style={{ marginLeft: 6 }}>
            Paying it all — {formatKES(outstanding)}
          </Text>
        </AnimatedPressable>
      ) : null}

      <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>HOW THEY PAID</Text>
      <View style={styles.chipWrap}>
        {RECEIPT_METHODS.map((m) => (
          <Chip key={m} label={m} selected={method === m} onPress={() => setMethod(m)} />
        ))}
      </View>

      <Field
        label="Reference"
        value={reference}
        onChangeText={setReference}
        placeholder={method === 'M-Pesa' ? 'M-Pesa code, e.g. SFF7GH2K1L' : 'Optional'}
        style={{ marginTop: space.lg }}
      />
    </Sheet>
  );
});
PaymentSheet.displayName = 'PaymentSheet';

/**
 * Cash that moves without a bird changing hands — capital in, loans, and
 * household drawings. The Money tab already *read* these to work out cash on
 * hand; nothing ever wrote them, so the figure could never reconcile against
 * the actual till.
 */
export const CashSheet = React.forwardRef<BottomSheet, { onSaved?: () => void }>(({ onSaved }, ref) => {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const { session } = useAuth();

  const [type, setType] = useState<MoneyTxType>('own_money_added');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = MONEY_TX.find((t) => t.type === type)!;
  const amountNum = Number(amount) || 0;

  const save = async () => {
    if (!farm || amountNum <= 0) return;
    setSaving(true);
    const { error } = await supabase.from('money_transactions').insert({
      farm_id: farm.id,
      tx_date: new Date().toISOString().slice(0, 10),
      tx_type: type,
      amount: amountNum,
      notes: notes || null,
      recorded_by: session?.user?.id ?? null,
    });
    setSaving(false);
    if (error) return;

    setAmount('');
    setNotes('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaved?.();
    (ref as any)?.current?.close();
  };

  return (
    <Sheet
      ref={ref}
      title="Cash in or out"
      subtitle="Money that isn't a sale or a farm expense"
      snapPoints={['85%']}
      footer={
        <View>
          <View style={styles.footerRow}>
            <Text variant="caption" tone="tertiary">
              {selected.direction === 'in' ? 'Adds to your cash' : 'Takes from your cash'}
            </Text>
            <Text variant="statSm" tone={selected.direction === 'in' ? 'success' : 'danger'}>
              {selected.direction === 'in' ? '+' : '−'}{formatKES(amountNum)}
            </Text>
          </View>
          <Button label="Save" onPress={save} loading={saving} disabled={amountNum <= 0} size="lg" />
        </View>
      }>
      {(['in', 'out'] as const).map((dir) => (
        <View key={dir} style={{ marginBottom: space.lg }}>
          <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>
            {dir === 'in' ? 'MONEY COMING IN' : 'MONEY GOING OUT'}
          </Text>
          {MONEY_TX.filter((t) => t.direction === dir).map((t) => {
            const active = type === t.type;
            return (
              <AnimatedPressable key={t.type} onPress={() => setType(t.type)} haptic="selection" scaleTo={0.99}>
                <View
                  style={[
                    styles.txRow,
                    {
                      backgroundColor: active ? colors.accentSoft : colors.surface,
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}>
                  <Ionicons
                    name={dir === 'in' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                    size={20}
                    color={active ? colors.accent : colors.textTertiary}
                  />
                  <View style={{ flex: 1, marginLeft: space.md }}>
                    <Text variant="bodyMed" tone={active ? 'accent' : 'primary'}>{t.label}</Text>
                    <Text variant="caption" tone="tertiary">{t.hint}</Text>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} /> : null}
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      ))}

      <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" suffix="KES" />
      <Field label="Note" value={notes} onChangeText={setNotes} placeholder="Optional — what was it for?" />
    </Sheet>
  );
});
CashSheet.displayName = 'CashSheet';

const styles = StyleSheet.create({
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  lockedCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.md,
    marginBottom: space.lg,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  quickFill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    marginBottom: space.lg,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: space.sm,
  },
});
