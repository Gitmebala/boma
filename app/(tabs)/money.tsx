import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Linking, Modal, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import BottomSheet from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { HeroMetric } from '@/components/ui/Metric';
import { Segmented } from '@/components/ui/Segmented';
import { StatusPill } from '@/components/ui/StatusPill';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PaymentSheet, CashSheet } from '@/components/money/MoneySheets';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase, MONEY_TX } from '@/lib/supabase';
import { signReceiptUrls } from '@/lib/receipts';
import { formatKES, formatCompactKES, daysBetween, formatShortDate } from '@/lib/format';
import { space, radius } from '@/lib/theme';

const SUBTABS = ['Debt', 'Expenses', 'Cash'] as const;
type SubTab = (typeof SUBTABS)[number];

interface CustomerBalance {
  customer_id: string;
  name: string;
  phone: string | null;
  balance: number;
  last_purchase: string | null;
}

export default function MoneyScreen() {
  const { colors } = useTheme();
  const { farm, canViewMoney } = useFarm();

  const [sub, setSub] = useState<SubTab>('Debt');
  const [balances, setBalances] = useState<CustomerBalance[] | null>(null);
  const [expenses, setExpenses] = useState<any[] | null>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [cashIn, setCashIn] = useState(0);
  const [cashOut, setCashOut] = useState(0);
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const paymentRef = useRef<BottomSheet>(null);
  const cashRef = useRef<BottomSheet>(null);
  const [payTarget, setPayTarget] = useState<CustomerBalance | null>(null);

  const load = useCallback(async () => {
    if (!farm || !canViewMoney) return;
    const [{ data: bal }, { data: exp }, { data: sales }, { data: pay }, { data: money }] = await Promise.all([
      supabase.from('customer_balances').select('*').eq('farm_id', farm.id).order('balance', { ascending: false }),
      supabase.from('expenses').select('*').eq('farm_id', farm.id).order('expense_date', { ascending: false }).limit(50),
      supabase.from('sales').select('amount_paid, total_amount').eq('farm_id', farm.id),
      supabase.from('payments').select('amount').eq('farm_id', farm.id),
      supabase.from('money_transactions').select('*').eq('farm_id', farm.id).order('tx_date', { ascending: false }),
    ]);

    setBalances((bal as CustomerBalance[]) ?? []);
    setExpenses(exp ?? []);
    setTxs(money ?? []);

    // Sign the thumbnails for any expense that has a receipt attached. The
    // bucket is private, so a stored path is useless without this.
    const receiptPaths = (exp ?? []).map((e: any) => e.receipt_url).filter(Boolean);
    setReceiptUrls(receiptPaths.length ? await signReceiptUrls(receiptPaths) : {});

    const salePaid = (sales ?? []).reduce((s, r: any) => s + Number(r.amount_paid), 0);
    const paymentsIn = (pay ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
    const moneyIn = (money ?? [])
      .filter((m: any) => ['own_money_added', 'loan_received', 'other_in'].includes(m.tx_type))
      .reduce((s, r: any) => s + Number(r.amount), 0);
    const moneyOut = (money ?? [])
      .filter((m: any) => ['household_drawing', 'loan_repayment', 'other_out'].includes(m.tx_type))
      .reduce((s, r: any) => s + Number(r.amount), 0);
    const expenseTotal = (exp ?? []).reduce((s, r: any) => s + Number(r.total_cost), 0);

    setCashIn(salePaid + paymentsIn + moneyIn);
    setCashOut(expenseTotal + moneyOut);
  }, [farm?.id, canViewMoney]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!canViewMoney) {
    return (
      <Screen>
        <EmptyState
          icon="lock-closed-outline"
          title="Money is restricted"
          body="Ask the farm owner to grant you access to view sales, debt and cash."
        />
      </Screen>
    );
  }

  const cashOnHand = cashIn - cashOut;
  const debtors = (balances ?? []).filter((b) => b.balance > 0);
  const totalOwed = debtors.reduce((s, b) => s + b.balance, 0);
  const overdue = debtors.filter((b) => b.last_purchase && daysBetween(b.last_purchase) > 30);

  const openPayment = (b: CustomerBalance) => {
    setPayTarget(b);
    // Let the target land in state before the sheet reads it.
    requestAnimationFrame(() => paymentRef.current?.expand());
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Money</Text>
          <Text variant="caption" tone="tertiary">What you're owed, what you've spent</Text>
        </View>
        <AnimatedPressable
          onPress={() => cashRef.current?.expand()}
          haptic="light"
          accessibilityLabel="Record cash in or out"
          style={[styles.iconBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="swap-vertical" size={19} color={colors.textPrimary} />
        </AnimatedPressable>
      </View>

      <View style={styles.controls}>
        <Segmented options={SUBTABS} value={sub} onChange={setSub} />
      </View>

      <ScreenScroll refreshing={refreshing} onRefresh={onRefresh}>
        {sub === 'Debt' && (
          <>
            <HeroMetric
              label="Owed to you"
              value={formatCompactKES(totalOwed)}
              tone={totalOwed === 0 ? 'success' : overdue.length ? 'danger' : 'warning'}
              verdict={
                totalOwed === 0
                  ? 'Every sale is paid up.'
                  : overdue.length
                    ? `${overdue.length} customer${overdue.length === 1 ? ' is' : 's are'} more than 30 days late.`
                    : `Across ${debtors.length} customer${debtors.length === 1 ? '' : 's'}.`
              }
            />

            {balances === null ? (
              <Skeleton width="100%" height={200} style={{ marginTop: space.md }} />
            ) : debtors.length === 0 ? (
              <View style={{ marginTop: space.lg }}>
                <EmptyState icon="happy-outline" title="Nobody owes you" body="Every sale is fully paid up." />
              </View>
            ) : (
              debtors.map((b, i) => {
                const age = b.last_purchase ? daysBetween(b.last_purchase) : null;
                const status = age === null ? 'neutral' : age > 60 ? 'overdue' : age > 30 ? 'attention' : 'fine';
                return (
                  <FadeInView key={b.customer_id} index={i} style={{ marginTop: space.md }}>
                    <Card>
                      <View style={styles.debtHead}>
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyMed" numberOfLines={1}>{b.name}</Text>
                          <Text variant="caption" tone="tertiary">
                            {age !== null ? `${age} days since last purchase` : 'No sale yet'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 5 }}>
                          <Text variant="statSm" tone="warning">{formatKES(b.balance)}</Text>
                          <StatusPill status={status as any} />
                        </View>
                      </View>

                      {/* The two things you actually do about a debt, right on
                          the row. v1 could only nag — there was no way to
                          record that the money had arrived. */}
                      <View style={styles.debtActions}>
                        <AnimatedPressable
                          onPress={() => openPayment(b)}
                          haptic="light"
                          style={[styles.debtBtn, { backgroundColor: colors.accent }]}>
                          <Ionicons name="cash-outline" size={16} color={colors.accentText} />
                          <Text variant="label" tone="inverse" style={{ marginLeft: 6 }}>Record payment</Text>
                        </AnimatedPressable>

                        {b.phone ? (
                          <AnimatedPressable
                            onPress={() =>
                              Linking.openURL(
                                `https://wa.me/${b.phone!.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `Hello ${b.name}, kindly remember your balance of KES ${Math.round(b.balance).toLocaleString()}. Thank you.`
                                )}`
                              )
                            }
                            haptic="light"
                            accessibilityLabel={`Remind ${b.name} on WhatsApp`}
                            style={[styles.waBtn, { backgroundColor: colors.successSoft }]}>
                            <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
                          </AnimatedPressable>
                        ) : null}
                      </View>
                    </Card>
                  </FadeInView>
                );
              })
            )}
          </>
        )}

        {sub === 'Expenses' && (
          <>
            <HeroMetric
              label="Spent, last 50 entries"
              value={formatCompactKES((expenses ?? []).reduce((s, e) => s + Number(e.total_cost), 0))}
              tone="primary"
              verdict="Reports breaks this down by category and per bird."
            />
            {expenses === null ? (
              <Skeleton width="100%" height={200} style={{ marginTop: space.md }} />
            ) : expenses.length === 0 ? (
              <View style={{ marginTop: space.lg }}>
                <EmptyState icon="receipt-outline" title="No expenses logged" body="Log your first cost from the Log tab." />
              </View>
            ) : (
              expenses.map((e, i) => {
                const thumb = e.receipt_url ? receiptUrls[e.receipt_url] : null;
                return (
                  <FadeInView key={e.id} index={i} style={{ marginTop: space.sm }}>
                    <AnimatedPressable
                      onPress={() => {}}
                      onLongPress={() => {
                        // Mistakes must be correctable — v1 made every entry
                        // permanent. Long-press keeps delete off the happy path.
                        Alert.alert(
                          'Delete this expense?',
                          `${e.category}${e.item ? ` · ${e.item}` : ''} — ${formatKES(e.total_cost)}. This removes it from your costs and profit.`,
                          [
                            { text: 'Keep it', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                const { error } = await supabase.from('expenses').delete().eq('id', e.id);
                                if (!error) load();
                              },
                            },
                          ]
                        );
                      }}
                      haptic="medium"
                      scaleTo={0.99}>
                    <Card>
                      <View style={styles.debtHead}>
                        {thumb ? (
                          <AnimatedPressable
                            onPress={() => setViewingReceipt(thumb)}
                            haptic="selection"
                            accessibilityLabel="View receipt"
                            style={{ marginRight: space.md }}>
                            <Image source={{ uri: thumb }} style={styles.receiptThumb} contentFit="cover" transition={150} />
                          </AnimatedPressable>
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyMed" numberOfLines={1}>
                            {e.category}{e.item ? ` · ${e.item}` : ''}
                          </Text>
                          <Text variant="caption" tone="tertiary">{formatShortDate(e.expense_date)}</Text>
                        </View>
                        <Text variant="bodyMed">{formatKES(e.total_cost)}</Text>
                      </View>
                    </Card>
                    </AnimatedPressable>
                  </FadeInView>
                );
              })
            )}
          </>
        )}

        {sub === 'Cash' && (
          <>
            <HeroMetric
              label="Cash you should have"
              value={formatCompactKES(cashOnHand)}
              tone={cashOnHand >= 0 ? 'success' : 'danger'}
              verdict="Count your cash, M-Pesa and bank. A gap means something wasn't logged."
              footer={
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="micro" tone="tertiary">CAME IN</Text>
                    <Text variant="statSm" tone="success">{formatCompactKES(cashIn)}</Text>
                  </View>
                  <View style={[styles.footDivider, { backgroundColor: colors.borderFaint }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="micro" tone="tertiary">WENT OUT</Text>
                    <Text variant="statSm" tone="danger">{formatCompactKES(cashOut)}</Text>
                  </View>
                </View>
              }
            />

            <View style={{ marginTop: space.md }}>
              <Button
                label="Record cash in or out"
                onPress={() => cashRef.current?.expand()}
                variant="secondary"
                icon={<Ionicons name="swap-vertical" size={17} color={colors.textPrimary} />}
              />
            </View>

            <Text variant="micro" tone="tertiary" style={{ marginTop: space.xl, marginBottom: space.sm }}>
              CASH MOVEMENTS
            </Text>
            {txs.length === 0 ? (
              <Card>
                <Text variant="body" tone="secondary">
                  Nothing recorded yet. Log the money you put into the farm, any loan, and cash taken
                  for the household — otherwise the figure above can never match your real cash.
                </Text>
              </Card>
            ) : (
              txs.map((t, i) => {
                const meta = MONEY_TX.find((m) => m.type === t.tx_type);
                const isIn = meta?.direction === 'in';
                return (
                  <FadeInView key={t.id} index={i} style={{ marginTop: space.sm }}>
                    <Card>
                      <View style={styles.debtHead}>
                        <Ionicons
                          name={isIn ? 'arrow-down-circle' : 'arrow-up-circle'}
                          size={20}
                          color={isIn ? colors.success : colors.danger}
                        />
                        <View style={{ flex: 1, marginLeft: space.md }}>
                          <Text variant="bodyMed">{meta?.label ?? t.tx_type}</Text>
                          <Text variant="caption" tone="tertiary" numberOfLines={1}>
                            {formatShortDate(t.tx_date)}{t.notes ? ` · ${t.notes}` : ''}
                          </Text>
                        </View>
                        <Text variant="bodyMed" tone={isIn ? 'success' : 'danger'}>
                          {isIn ? '+' : '−'}{formatKES(t.amount)}
                        </Text>
                      </View>
                    </Card>
                  </FadeInView>
                );
              })
            )}
          </>
        )}
      </ScreenScroll>

      <PaymentSheet
        ref={paymentRef}
        customer={payTarget ? { id: payTarget.customer_id, name: payTarget.name } : null}
        outstanding={payTarget?.balance ?? null}
        onSaved={load}
      />
      <CashSheet ref={cashRef} onSaved={load} />

      <Modal
        visible={!!viewingReceipt}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewingReceipt(null)}>
        <View style={styles.viewerBackdrop}>
          <AnimatedPressable
            onPress={() => setViewingReceipt(null)}
            haptic="selection"
            accessibilityLabel="Close receipt"
            style={styles.viewerClose}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </AnimatedPressable>
          {viewingReceipt ? (
            <Image source={{ uri: viewingReceipt }} style={styles.viewerImage} contentFit="contain" transition={180} />
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: space.xs,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  controls: { paddingHorizontal: space.gutter, marginTop: space.lg, marginBottom: space.lg },
  debtHead: { flexDirection: 'row', alignItems: 'center' },
  debtActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  debtBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  waBtn: { width: 44, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  footDivider: { width: 1, height: 30, marginHorizontal: space.lg },
  receiptThumb: { width: 42, height: 42, borderRadius: radius.sm },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 56,
    right: space.xl,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  viewerImage: { width: '92%', height: '72%' },
});
