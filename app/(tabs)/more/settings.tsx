import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { space } from '@/lib/theme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { farm, refresh } = useFarm();
  const [name, setName] = useState(farm?.name ?? '');
  const [county, setCounty] = useState(farm?.county ?? '');
  const [price, setPrice] = useState(String(farm?.standard_bird_price ?? 500));
  const [weeks, setWeeks] = useState(String(farm?.default_weeks_to_market ?? 6));
  const [mortality, setMortality] = useState(String((farm?.target_mortality_rate ?? 0.05) * 100));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!farm) return;
    setSaving(true);
    await supabase.from('farms').update({
      name, county, standard_bird_price: Number(price) || 0,
      default_weeks_to_market: Number(weeks) || 6, target_mortality_rate: (Number(mortality) || 5) / 100,
    }).eq('id', farm.id);
    await refresh();
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Farm settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.xl }} keyboardShouldPersistTaps="handled">
        <Field label="Farm name" value={name} onChangeText={setName} />
        <Field label="County" value={county} onChangeText={setCounty} />
        <Field label="Standard price per bird" value={price} onChangeText={setPrice} keyboardType="decimal-pad" suffix="KES" />
        <Field label="Default weeks to market" value={weeks} onChangeText={setWeeks} keyboardType="number-pad" />
        <Field label="Target mortality rate" value={mortality} onChangeText={setMortality} keyboardType="decimal-pad" suffix="%" />
        <Text variant="caption" tone="tertiary" style={{ marginBottom: space.xl }}>
          These are the defaults used across Boma — the price pre-fills new sales, and mortality above this target triggers an alert on Home.
        </Text>
        <Button label="Save changes" onPress={save} loading={saving} size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
