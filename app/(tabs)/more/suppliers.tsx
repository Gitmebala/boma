import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase, Supplier } from '@/lib/supabase';
import { space } from '@/lib/theme';

export default function SuppliersScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!farm) return;
    const { data } = await supabase.from('suppliers').select('*').eq('farm_id', farm.id).order('name');
    setSuppliers((data as Supplier[]) ?? []);
  }, [farm?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    if (!farm || !name.trim()) return;
    setSaving(true);
    await supabase.from('suppliers').insert({ farm_id: farm.id, name: name.trim() });
    setSaving(false); setName('');
    load();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Suppliers</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.xl }}>
          <View style={{ flex: 1 }}>
            <Field label="Add supplier" value={name} onChangeText={setName} placeholder="e.g. Kienyeji Feeds Ltd" />
          </View>
        </View>
        <Button label="Add" onPress={add} loading={saving} disabled={!name.trim()} style={{ marginTop: -space.md, marginBottom: space.xl }} />

        {suppliers.length === 0 ? (
          <EmptyState icon="business-outline" title="No suppliers yet" body="Suppliers you add here — or add on the fly while logging an expense — show up everywhere instantly." />
        ) : (
          suppliers.map((s, i) => (
            <FadeInView key={s.id} index={i} style={{ marginBottom: space.md }}>
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMed">{s.name}</Text>
                  {(s.phone || s.location) && <Text variant="caption" tone="tertiary">{[s.phone, s.location].filter(Boolean).join(' · ')}</Text>}
                </View>
                {s.phone && (
                  <AnimatedPressable onPress={() => Linking.openURL(`tel:${s.phone}`)} haptic="light" style={[styles.iconBtn, { backgroundColor: colors.surfaceSunken }]}>
                    <Ionicons name="call" size={16} color={colors.textSecondary} />
                  </AnimatedPressable>
                )}
              </Card>
            </FadeInView>
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
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
