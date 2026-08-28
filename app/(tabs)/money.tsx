import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { formatKES, daysBetween, formatShortDate } from '@/lib/format';
import { space, radius } from '@/lib/theme';

const SUBTABS = ['Debt', 'Expenses', 'Cash'] as const;

interface CustomerBalance { customer_id: string; name: string; phone: string | null; balance: number; last_purchase: string | null; }

export default function MoneyScreen() {
  const { colors } = useTheme();
  const { farm, canViewMoney } = useFarm();
  const [sub, setSub] = useState<(typeof SUBTABS)[number]>('Debt');
  const [balances, setBalances] = useState<CustomerBalance[] | null>(null);
  const [expenses, setExpenses] = useState<any[] | null>(null);
  const [cashIn, setCashIn] = useState(0);
  const [cashOut, setCashOut] = useState(0);
  const [revenue, setRevenue] = useState(0);

  const load = useCallback(async () => {
    if (!farm || !canViewMoney) return;
    const [{ data: bal }, { data: exp }, { data: sales }, { data: pay }, { data: money }] = await Promise.all([
      supabase.from('customer_balances').select('*').eq('farm_id', farm.id).order('balance', { ascending: false }),
      supabase.from('expenses').select('*').eq('farm_id', farm.id).order('expense_date', { ascending: false }).limit(50),
      supabase.from('sales').select('amount_paid, total_amount').eq('farm_id', farm.id),
      supabase.from('payments').select('amount').eq('farm_id', farm.id),
      supabase.from('money_transactions').select('tx_type, amount').eq('farm_id', farm.id),
    ]);
    setBalances((bal as CustomerBalance[]) ?? []);
    setExpenses(exp ?? []);
    const saleRevenue = (sales ?? []).reduce((s, r: any) => s + Number(r.total_amount), 0);
    const salePaid = (sales ?? []).reduce((s, r: any) => s + Number(r.amount_paid), 0);
    const paymentsIn = (pay ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
    const moneyIn = (money ?? []).filter((m: any) => ['own_money_added', 'loan_received', 'other_in'].includes(m.tx_type)).reduce((s, r: any) => s + Number(r.amount), 0);
    const moneyOut = (money ?? []).filter((m: any) => ['household_drawing', 'loan_repayment', 'other_out'].includes(m.tx_type)).reduce((s, r: any) => s + Number(r.amount), 0);
    const expenseTotal = (exp ?? []).reduce((s, r: any) => s + Number(r.total_cost), 0);
    setRevenue(saleRevenue);
    setCashIn(salePaid + paymentsIn + moneyIn);
    setCashOut(expenseTotal + moneyOut);
  }, [farm?.id, canViewMoney]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!canViewMoney) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <EmptyState icon="lock-closed-outline" title="Money is restricted" body="Ask the farm owner to grant you access to view sales, debt and cash." />
      </SafeAreaView>
    );
  }

  const cashOnHand = cashIn - cashOut;
  const totalOwed = (balances ?? []).reduce((s, b) => s + Math.max(0, b.balance), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}><Text variant="h1">Money</Text></View>

      <View style={styles.summaryRow}>
        <Card style={{ flex: 1 }}>
          <Text variant="micro" tone="tertiary">CASH ON HAND</Text>
          <Text variant="h2" tone={cashOnHand >= 0 ? 'success' : 'danger'}>{formatKES(cashOnHand)}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="micro" tone="tertiary">OWED TO YOU</Text>
          <Text variant="h2" tone="warning">{formatKES(totalOwed)}</Text>
        </Card>
      </View>

      <View style={styles.tabRow}>
        {SUBTABS.map((t) => (
          <AnimatedPressable key={t} onPress={() => setSub(t)} haptic="selection" style={[styles.pill, { backgroundColor: sub === t ? colors.accent : colors.surfaceSunken }]}>
            <Text variant="bodyMed" tone={sub === t ? 'inverse' : 'secondary'}>{t}</Text>
          </AnimatedPressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {sub === 'Debt' && (
          balances === null ? <Skeleton width="100%" height={200} /> :
          balances.filter((b) => b.balance > 0).length === 0 ? (
            <EmptyState icon="happy-outline" title="Nobody owes you" body="Every sale is fully paid up." />
          ) : (
            balances.filter((b) => b.balance > 0).map((b, i) => {
              const age = b.last_purchase ? daysBetween(b.last_purchase) : null;
              const status = age === null ? 'neutral' : age > 60 ? 'overdue' : age > 30 ? 'attention' : 'fine';
              return (
                <FadeInView key={b.customer_id} index={i} style={{ marginBottom: space.md }}>
                  <Card style={styles.debtRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMed">{b.name}</Text>
                      <Text variant="caption" tone="tertiary">{age !== null ? `${age} days since last purchase` : 'No sale yet'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text variant="h3" tone="warning">{formatKES(b.balance)}</Text>
                      <StatusPill status={status as any} />
                    </View>
                    {b.phone && (
                      <AnimatedPressable
                        onPress={() => Linking.openURL(`https://wa.me/${b.phone!.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${b.name}, kindly remember your balance of KES ${Math.round(b.balance).toLocaleString()}. Thank you.`)}`)}
                        haptic="light" style={[styles.waBtn, { backgroundColor: colors.successSoft }]}>
                        <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
                      </AnimatedPressable>
                    )}
                  </Card>
                </FadeInView>
              );
            })
          )
        )}

        {sub === 'Expenses' && (
          expenses === null ? <Skeleton width="100%" height={200} /> :
          expenses.length === 0 ? <EmptyState icon="receipt-outline" title="No expenses logged" body="Log your first cost from the Log tab." /> :
          expenses.map((e, i) => (
            <FadeInView key={e.id} index={i} style={{ marginBottom: space.sm }}>
              <Card style={styles.debtRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMed">{e.category}{e.item ? ` · ${e.item}` : ''}</Text>
                  <Text variant="caption" tone="tertiary">{formatShortDate(e.expense_date)}</Text>
                </View>
                <Text variant="bodyMed">{formatKES(e.total_cost)}</Text>
              </Card>
            </FadeInView>
          ))
        )}

        {sub === 'Cash' && (
          <View style={{ gap: space.md }}>
            <Card>
              <Text variant="h3" style={{ marginBottom: space.md }}>Money coming in</Text>
              <Row label="From sales & payments" value={cashIn} />
            </Card>
            <Card>
              <Text variant="h3" style={{ marginBottom: space.md }}>Money going out</Text>
              <Row label="Expenses & drawings" value={cashOut} />
            </Card>
            <Card style={{ backgroundColor: cashOnHand >= 0 ? colors.successSoft : colors.dangerSoft, borderColor: 'transparent' }}>
              <Text variant="micro" tone="tertiary">CASH YOU SHOULD HAVE</Text>
              <Text variant="statNumberLg" tone={cashOnHand >= 0 ? 'success' : 'danger'}>{formatKES(cashOnHand)}</Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: space.sm }}>
                Count your actual cash + M-Pesa + bank and compare — a mismatch means something was spent or collected without being logged.
              </Text>
            </Card>
          </View>
        )}
        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="body" tone="secondary">{label}</Text>
      <Text variant="bodyMed">{formatKES(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: space.xl, paddingTop: space.sm },
  summaryRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.xl, marginTop: space.lg },
  tabRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl, marginTop: space.xl, marginBottom: space.lg },
  pill: { paddingHorizontal: space.lg, paddingVertical: 9, borderRadius: radius.pill },
  body: { paddingHorizontal: space.xl },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  waBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
