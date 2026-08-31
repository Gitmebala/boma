import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { formatShortDate } from '@/lib/format';
import { space, layout } from '@/lib/theme';

export default function ReceiptsScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!farm) return;
    const { data } = await supabase.from('receipts').select('*').eq('farm_id', farm.id).order('uploaded_at', { ascending: false });
    setRows(data ?? []);
  }, [farm?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Receipts</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: layout.tabBarClearance }}>
        {rows.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No receipts yet"
            body="Attach a photo when logging an expense or sale from the Log tab, and it'll show up here — searchable, never lost."
          />
        ) : (
          rows.map((r) => (
            <Card key={r.id} style={styles.row}>
              <Ionicons name="document-text" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: space.md }}>
                <Text variant="bodyMed">{r.description || r.related_table}</Text>
                <Text variant="caption" tone="tertiary">{formatShortDate(r.uploaded_at)}</Text>
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
