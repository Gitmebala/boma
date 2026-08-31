import React, { useCallback, useMemo, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import BottomSheet from '@gorhom/bottom-sheet';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { Sheet } from '@/components/ui/Sheet';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { GrowthCurve, CurvePoint } from '@/components/ui/Charts';
import { useTheme } from '@/lib/ThemeContext';
import { supabase, Flock, FlockSummary, Vaccination, DailyLog, Expense } from '@/lib/supabase';
import { formatPct, formatKES, daysBetween, formatShortDate } from '@/lib/format';
import { cobb500Curve, growthVerdict } from '@/lib/insights';
import { space, radius, layout } from '@/lib/theme';

const TABS = ['Overview', 'Growth', 'Vaccines', 'Costs'] as const;

export default function FlockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [flock, setFlock] = useState<Flock | null>(null);
  const [summary, setSummary] = useState<FlockSummary | null>(null);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const logSheetRef = useRef<BottomSheet>(null);
  const countSheetRef = useRef<BottomSheet>(null);

  const load = useCallback(async () => {
    const [{ data: f }, { data: s }, { data: v }, { data: l }, { data: e }] = await Promise.all([
      supabase.from('flocks').select('*').eq('id', id).single(),
      supabase.from('flock_summary').select('*').eq('flock_id', id).single(),
      supabase.from('vaccinations').select('*').eq('flock_id', id).order('age_days'),
      supabase.from('daily_logs').select('*').eq('flock_id', id).order('log_date', { ascending: false }).limit(30),
      supabase.from('expenses').select('*').eq('flock_id', id).order('expense_date', { ascending: false }),
    ]);
    setFlock(f as Flock); setSummary(s as FlockSummary); setVaccinations((v as Vaccination[]) ?? []);
    setLogs((l as DailyLog[]) ?? []); setExpenses((e as Expense[]) ?? []);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markVaccineDone = async (v: Vaccination) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await supabase.from('vaccinations').update({ done: true, date_given: new Date().toISOString().slice(0, 10) }).eq('id', v.id);
    load();
  };

  const epef = useMemo(() => {
    if (!summary || !logs.length) return null;
    const latest = logs.find((l) => l.avg_weight_sample_kg);
    if (!latest?.avg_weight_sample_kg || !flock) return null;
    const age = daysBetween(flock.date_arrived, latest.log_date);
    if (age <= 0 || !summary.fcr) return null;
    const dailyGainG = (latest.avg_weight_sample_kg * 1000) / age;
    const survivalPct = (1 - summary.mortality_rate) * 100;
    return (survivalPct * dailyGainG) / (summary.fcr * 10);
  }, [summary, logs, flock]);

  // Weigh-ins were saved but never plotted — a farmer had to compare numbers
  // in their head against a breed chart they don't have. `logs` is capped at
  // the 30 most recent entries and ordered newest-first; re-sort to day age
  // ascending for a left-to-right curve.
  const weighIns = useMemo<CurvePoint[]>(() => {
    if (!flock) return [];
    return logs
      .filter((l) => l.avg_weight_sample_kg != null)
      .map((l) => ({ day: daysBetween(flock.date_arrived, l.log_date), kg: Number(l.avg_weight_sample_kg) }))
      .filter((p) => p.day >= 0)
      .sort((a, b) => a.day - b.day);
  }, [logs, flock]);

  const curveMaxDay = Math.max(flock?.weeks_to_market ? flock.weeks_to_market * 7 : 42, ...weighIns.map((p) => p.day), 7);
  const targetCurve = useMemo<CurvePoint[]>(() => cobb500Curve(curveMaxDay), [curveMaxDay]);
  const latestVerdict = useMemo(() => {
    const latest = weighIns[weighIns.length - 1];
    return latest ? growthVerdict(latest.day, latest.kg) : { text: '', tone: 'primary' as const };
  }, [weighIns]);

  const verdictColor = { success: colors.success, warning: colors.warning, danger: colors.danger, primary: colors.textSecondary };
  const verdictSoft = { success: colors.successSoft, warning: colors.warningSoft, danger: colors.dangerSoft, primary: colors.surfaceSunken };

  if (!flock || !summary) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={{ padding: space.xl, gap: space.md }}>
          <Skeleton width="60%" height={32} />
          <Skeleton width="100%" height={120} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <View style={{ flex: 1, marginLeft: space.md }}>
          <Text variant="h2">{flock.flock_code}</Text>
          <Text variant="caption" tone="tertiary">{flock.breed} · {daysBetween(flock.date_arrived)} days old</Text>
        </View>
        <StatusPill status={flock.status === 'Active' ? 'fine' : flock.status === 'Selling' ? 'attention' : 'neutral'} label={flock.status} />
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <AnimatedPressable key={t} onPress={() => setTab(t)} haptic="selection" style={styles.tabItem}>
            <Text variant="bodyMed" tone={tab === t ? 'primary' : 'tertiary'}>{t}</Text>
            {tab === t && <View style={[styles.tabIndicator, { backgroundColor: colors.accent }]} />}
          </AnimatedPressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {tab === 'Overview' && (
          <FadeInView style={{ gap: space.md }}>
            <View style={styles.row2}>
              <Card style={{ flex: 1 }}>
                <Text variant="micro" tone="tertiary">MORTALITY</Text>
                <Text variant="statNumber" tone={summary.mortality_rate > 0.05 ? 'danger' : 'success'}>{formatPct(summary.mortality_rate)}</Text>
                <Text variant="caption" tone="tertiary">First week: {formatPct(summary.first_week_mortality)}</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text variant="micro" tone="tertiary">FCR</Text>
                <Text variant="statNumber" tone={summary.fcr > 2 ? 'danger' : summary.fcr > 0 && summary.fcr <= 1.8 ? 'success' : 'primary'}>
                  {summary.fcr ? summary.fcr.toFixed(2) : '—'}
                </Text>
                <Text variant="caption" tone="tertiary">1.5–1.8 is good</Text>
              </Card>
            </View>
            <View style={styles.row2}>
              <Card style={{ flex: 1 }}>
                <Text variant="micro" tone="tertiary">EPEF SCORE</Text>
                <Text variant="statNumber" tone={epef && epef > 350 ? 'success' : 'primary'}>{epef ? Math.round(epef) : '—'}</Text>
                <Text variant="caption" tone="tertiary">Over 350 is excellent</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text variant="micro" tone="tertiary">BREAK-EVEN</Text>
                <Text variant="statNumber">{formatKES(summary.break_even_price)}</Text>
                <Text variant="caption" tone="tertiary">per bird</Text>
              </Card>
            </View>
            <Card>
              <Text variant="h3">Birds</Text>
              <View style={styles.birdRow}>
                <BirdStat label="Started" value={summary.chicks_received} />
                <BirdStat label="Died" value={summary.deaths} tone="danger" />
                <BirdStat label="Sold" value={summary.birds_sold} />
                <BirdStat label="Remaining" value={summary.birds_remaining} tone="success" />
              </View>
              <Button
                label="🔢 Count birds"
                variant="secondary"
                onPress={() => countSheetRef.current?.expand()}
                style={{ marginTop: space.lg }}
              />
              {summary.birds_unaccounted !== null && summary.birds_unaccounted !== undefined && summary.birds_unaccounted !== 0 && (
                <Text variant="caption" tone={summary.birds_unaccounted > 0 ? 'danger' : 'warning'} style={{ marginTop: space.sm }}>
                  {summary.birds_unaccounted > 0
                    ? `${Math.round(summary.birds_unaccounted)} bird(s) unaccounted for — check for unlogged deaths or sales.`
                    : `Counted ${Math.abs(Math.round(summary.birds_unaccounted))} more than records show — a death or sale may be double-counted.`}
                </Text>
              )}
            </Card>

            {/* A batch could never leave 'Active' from the UI — sold-out
                flocks haunted the Home screen forever. */}
            {(flock.status === 'Active' || flock.status === 'Selling') && (
              <Button
                label={summary.birds_remaining === 0 ? 'Close this batch' : 'Close batch early'}
                variant="secondary"
                onPress={() => {
                  const done = summary.birds_remaining === 0;
                  Alert.alert(
                    done ? 'Close this batch?' : `${summary.birds_remaining} birds still recorded`,
                    done
                      ? 'It moves to Sold Out and stops appearing as active. Its numbers stay in Reports.'
                      : 'Closing marks the batch finished even though birds remain on record. Log their deaths or sales first if you can.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: done ? 'Close batch' : 'Close anyway',
                        style: done ? 'default' : 'destructive',
                        onPress: async () => {
                          const { error } = await supabase
                            .from('flocks')
                            .update({ status: done ? 'Sold Out' : 'Closed' })
                            .eq('id', id);
                          if (!error) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            load();
                          }
                        },
                      },
                    ]
                  );
                }}
                style={{ marginTop: space.md }}
              />
            )}
          </FadeInView>
        )}

        {tab === 'Growth' && (
          <FadeInView style={{ gap: space.md }}>
            {weighIns.length > 0 && (
              <Card>
                <View style={styles.rowBetween}>
                  <Text variant="h3">Weight vs Cobb 500 target</Text>
                </View>
                <GrowthCurve actual={weighIns} target={targetCurve} maxDay={curveMaxDay} height={150} />
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                    <Text variant="micro" tone="tertiary">This batch</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDash, { backgroundColor: colors.textQuiet }]} />
                    <Text variant="micro" tone="tertiary">Cobb 500 target</Text>
                  </View>
                </View>
                <View style={[styles.verdictBadge, { backgroundColor: verdictSoft[latestVerdict.tone] }]}>
                  <Text variant="caption" style={{ color: verdictColor[latestVerdict.tone] }}>{latestVerdict.text}</Text>
                </View>
              </Card>
            )}
            <Button label="+ Log today's entry" onPress={() => logSheetRef.current?.expand()} />
            {logs.length === 0 ? (
              <Text variant="body" tone="tertiary" style={{ textAlign: 'center', marginTop: space.xl }}>No entries yet.</Text>
            ) : (
              logs.map((l) => (
                <Card key={l.id} style={styles.logRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMed">{formatShortDate(l.log_date)}</Text>
                    <Text variant="caption" tone="tertiary">
                      {l.birds_died} died · {l.feed_used_kg ?? 0}kg feed{l.avg_weight_sample_kg ? ` · ${l.avg_weight_sample_kg}kg avg` : ''}
                    </Text>
                  </View>
                  {l.birds_died > 0 && <StatusPill status="attention" label={`${l.birds_died} died`} />}
                </Card>
              ))
            )}
          </FadeInView>
        )}

        {tab === 'Vaccines' && (
          <FadeInView style={{ gap: space.sm }}>
            {vaccinations.map((v) => {
              const d = daysBetween(v.due_date);
              const status = v.done ? 'fine' : d > 0 ? 'overdue' : d >= -3 ? 'attention' : 'neutral';
              return (
                <AnimatedPressable key={v.id} onPress={() => !v.done && markVaccineDone(v)} haptic="light" disabled={v.done}>
                  <Card style={styles.vaxRow}>
                    <View style={[styles.vaxCheck, { backgroundColor: v.done ? colors.success : colors.surfaceSunken, borderColor: v.done ? colors.success : colors.border }]}>
                      {v.done && <Ionicons name="checkmark" size={14} color={colors.accentText} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: space.md }}>
                      <Text variant="bodyMed" style={v.done ? { textDecorationLine: 'line-through' } : undefined} tone={v.done ? 'tertiary' : 'primary'}>
                        {v.vaccine_name}
                      </Text>
                      <Text variant="caption" tone="tertiary">Day {v.age_days} · {v.method} · due {formatShortDate(v.due_date)}</Text>
                    </View>
                    {!v.done && <StatusPill status={status as any} />}
                  </Card>
                </AnimatedPressable>
              );
            })}
          </FadeInView>
        )}

        {tab === 'Costs' && (
          <FadeInView style={{ gap: space.md }}>
            <Card>
              <Text variant="micro" tone="tertiary">TOTAL COST</Text>
              <Text variant="statNumber">{formatKES(summary.total_cost)}</Text>
              <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>{formatKES(summary.total_cost / (summary.chicks_received || 1))} per bird started</Text>
            </Card>
            {expenses.map((e) => (
              <Card key={e.id} style={styles.logRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMed">{e.category}{e.item ? ` · ${e.item}` : ''}</Text>
                  <Text variant="caption" tone="tertiary">{formatShortDate(e.expense_date)}</Text>
                </View>
                <Text variant="bodyMed">{formatKES(e.total_cost)}</Text>
              </Card>
            ))}
          </FadeInView>
        )}
      </ScrollView>

      <QuickLogSheet ref={logSheetRef} flockId={flock.id} onSaved={load} />
      <CountBirdsSheet ref={countSheetRef} flockId={flock.id} currentEstimate={summary.birds_remaining} onSaved={load} />
    </SafeAreaView>
  );
}

function BirdStat({ label, value, tone = 'primary' }: { label: string; value: number; tone?: 'primary' | 'danger' | 'success' }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="micro" tone="tertiary">{label.toUpperCase()}</Text>
      <Text variant="h2" tone={tone} style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const QuickLogSheet = React.forwardRef<BottomSheet, { flockId: string; onSaved: () => void }>(({ flockId, onSaved }, ref) => {
  const [deaths, setDeaths] = useState('0');
  const [feed, setFeed] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from('daily_logs').insert({
      flock_id: flockId,
      log_date: new Date().toISOString().slice(0, 10),
      birds_died: Number(deaths) || 0,
      feed_used_kg: feed ? Number(feed) : null,
      avg_weight_sample_kg: weight ? Number(weight) : null,
    });
    setSaving(false);
    setDeaths('0'); setFeed(''); setWeight('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    (ref as any)?.current?.close();
    onSaved();
  };

  return (
    <Sheet ref={ref} title="Today's entry" snapPoints={['58%']}>
      <Field label="Birds died today" value={deaths} onChangeText={setDeaths} keyboardType="number-pad" />
      <Field label="Feed used (kg)" value={feed} onChangeText={setFeed} keyboardType="decimal-pad" placeholder="Optional" />
      <Field label="Sample avg weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Optional — once a week is plenty" />
      <Button label="Save entry" onPress={save} loading={saving} size="lg" />
    </Sheet>
  );
});
QuickLogSheet.displayName = 'QuickLogSheet';

const CountBirdsSheet = React.forwardRef<BottomSheet, { flockId: string; currentEstimate: number; onSaved: () => void }>(
  ({ flockId, currentEstimate, onSaved }, ref) => {
    const [count, setCount] = useState(String(currentEstimate));
    const [saving, setSaving] = useState(false);
    const save = async () => {
      setSaving(true);
      await supabase.from('flocks').update({ birds_counted: Number(count) || 0, date_counted: new Date().toISOString().slice(0, 10) }).eq('id', flockId);
      setSaving(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      (ref as any)?.current?.close();
      onSaved();
    };
    return (
      <Sheet ref={ref} title="Count birds" snapPoints={['46%']}>
        <Text variant="body" tone="secondary" style={{ marginBottom: space.lg }}>
          Physically count the birds now and type what you counted. Boma compares it against what the records say should be there.
        </Text>
        <Field label="Birds counted" value={count} onChangeText={setCount} keyboardType="number-pad" autoFocus />
        <Button label="Save count" onPress={save} loading={saving} size="lg" />
      </Sheet>
    );
  }
);
CountBirdsSheet.displayName = 'CountBirdsSheet';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', paddingHorizontal: space.xl, gap: space.xl, borderBottomWidth: 1, borderBottomColor: '#00000000' },
  tabItem: { paddingBottom: space.md, alignItems: 'center' },
  tabIndicator: { height: 2, width: '100%', borderRadius: 1, marginTop: 8, position: 'absolute', bottom: 0 },
  body: { padding: space.xl, paddingBottom: layout.tabBarClearance },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendRow: { flexDirection: 'row', gap: space.lg, marginTop: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendDash: { width: 14, height: 2, borderRadius: 1 },
  verdictBadge: { marginTop: space.md, padding: space.sm, borderRadius: radius.sm },
  row2: { flexDirection: 'row', gap: space.md },
  birdRow: { flexDirection: 'row', marginTop: space.md },
  logRow: { flexDirection: 'row', alignItems: 'center' },
  vaxRow: { flexDirection: 'row', alignItems: 'center' },
  vaxCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
