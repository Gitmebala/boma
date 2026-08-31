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
import { daysBetween, formatShortDate } from '@/lib/format';
import { space, layout } from '@/lib/theme';

const CATEGORIES = ['biosecurity', 'cleaning', 'maintenance', 'vaccination', 'other'] as const;
const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  biosecurity: 'shield-checkmark-outline',
  cleaning: 'water-outline',
  maintenance: 'construct-outline',
  vaccination: 'medkit-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

interface TaskRow {
  id: string; title: string; category: string; due_date: string; done: boolean; flock_id: string | null;
}

export default function TasksScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('biosecurity');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!farm) return;
    const { data } = await supabase.from('tasks').select('*').eq('farm_id', farm.id).order('due_date');
    setTasks((data as TaskRow[]) ?? []);
  }, [farm?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleDone = async (t: TaskRow) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTasks((prev) => prev!.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await supabase.from('tasks').update({
      done: !t.done,
      done_at: !t.done ? new Date().toISOString() : null,
    }).eq('id', t.id);
  };

  const addTask = async () => {
    if (!farm || !title.trim()) return;
    setSaving(true);
    await supabase.from('tasks').insert({
      farm_id: farm.id, title: title.trim(), category, due_date: new Date().toISOString().slice(0, 10),
    });
    setSaving(false); setTitle(''); setAdding(false);
    load();
  };

  const visible = (tasks ?? []).filter((t) => showDone || !t.done);
  const overdue = visible.filter((t) => !t.done && daysBetween(t.due_date) > 0);
  const upcoming = visible.filter((t) => !t.done && daysBetween(t.due_date) <= 0);
  const done = visible.filter((t) => t.done);

  const Section = ({ label, rows }: { label: string; rows: TaskRow[] }) => rows.length === 0 ? null : (
    <View style={{ marginBottom: space.xl }}>
      <Text variant="label" tone="tertiary" style={{ marginBottom: space.sm, marginLeft: 4 }}>{label.toUpperCase()}</Text>
      <View style={{ gap: space.sm }}>
        {rows.map((t, i) => (
          <FadeInView key={t.id} index={i}>
            <AnimatedPressable onPress={() => toggleDone(t)} haptic="light" scaleTo={0.99}>
              <Card style={styles.row}>
                <View style={[styles.check, { backgroundColor: t.done ? colors.success : colors.surfaceSunken, borderColor: t.done ? colors.success : colors.border }]}>
                  {t.done && <Ionicons name="checkmark" size={14} color={colors.accentText} />}
                </View>
                <Ionicons name={CATEGORY_ICON[t.category]} size={18} color={colors.textSecondary} style={{ marginLeft: space.md }} />
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <Text variant="bodyMed" tone={t.done ? 'tertiary' : 'primary'} style={t.done ? { textDecorationLine: 'line-through' } : undefined}>
                    {t.title}
                  </Text>
                  <Text variant="caption" tone="tertiary">{t.category} · {formatShortDate(t.due_date)}</Text>
                </View>
              </Card>
            </AnimatedPressable>
          </FadeInView>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md, flex: 1 }}>Tasks</Text>
        <AnimatedPressable onPress={() => setAdding((v) => !v)} haptic="light" style={[styles.addBtn, { backgroundColor: colors.accent }]}>
          <Ionicons name={adding ? 'close' : 'add'} size={20} color={colors.accentText} />
        </AnimatedPressable>
      </View>

      {adding && (
        <FadeInView style={{ paddingHorizontal: space.xl, marginBottom: space.lg }}>
          <Card>
            <Field label="Task" value={title} onChangeText={setTitle} placeholder="e.g. Check water lines" autoFocus />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
              {CATEGORIES.map((c) => <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />)}
            </View>
            <Button label="Add task" onPress={addTask} loading={saving} disabled={!title.trim()} />
          </Card>
        </FadeInView>
      )}

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: layout.tabBarClearance }} showsVerticalScrollIndicator={false}>
        {tasks === null ? null : visible.length === 0 && !adding ? (
          <EmptyState icon="checkmark-done-outline" title="Nothing outstanding" body="Biosecurity and cleaning tasks for your flocks show up here automatically." />
        ) : (
          <>
            <Section label="Overdue" rows={overdue} />
            <Section label="Upcoming" rows={upcoming} />
            {showDone && <Section label="Done" rows={done} />}
          </>
        )}
        <AnimatedPressable onPress={() => setShowDone((v) => !v)} haptic="selection" style={{ alignSelf: 'center', marginBottom: space.xl }}>
          <Text variant="caption" tone="accent">{showDone ? 'Hide completed' : 'Show completed'}</Text>
        </AnimatedPressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
