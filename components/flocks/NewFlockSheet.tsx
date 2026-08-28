import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Sheet } from '@/components/ui/Sheet';
import { Field } from '@/components/ui/Field';
import { EntityAutocomplete } from '@/components/ui/EntityAutocomplete';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { space, radius } from '@/lib/theme';

export interface NewFlockSheetHandle { open: () => void; }

export const NewFlockSheet = forwardRef<NewFlockSheetHandle, { onCreated: () => void }>(({ onCreated }, ref) => {
  const sheetRef = useRef<BottomSheet>(null);
  const { colors } = useTheme();
  const { farm } = useFarm();

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [chicks, setChicks] = useState('');
  const [breed, setBreed] = useState('Cobb 500');
  const [supplier, setSupplier] = useState<{ id: string; name: string } | null>(null);
  const [cost, setCost] = useState(String(farm?.standard_bird_price ? 100 : 100));
  const [weeks, setWeeks] = useState(String(farm?.default_weeks_to_market ?? 6));
  const [saving, setSaving] = useState(false);

  useImperativeHandle(ref, () => ({ open: () => sheetRef.current?.expand() }));

  const reset = () => {
    setDate(new Date()); setChicks(''); setBreed('Cobb 500'); setSupplier(null);
    setCost('100'); setWeeks(String(farm?.default_weeks_to_market ?? 6));
  };

  const save = async () => {
    if (!farm || !chicks) return;
    setSaving(true);
    const { error } = await supabase.from('flocks').insert({
      farm_id: farm.id,
      flock_code: '', // trigger fills this in
      date_arrived: date.toISOString().slice(0, 10),
      chicks_received: Number(chicks),
      breed,
      supplier_id: supplier?.id ?? null,
      cost_per_chick: Number(cost) || 0,
      weeks_to_market: Number(weeks) || 6,
    });
    setSaving(false);
    if (!error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.close();
      reset();
      onCreated();
    }
  };

  return (
    <Sheet ref={sheetRef} title="New flock" snapPoints={['85%']}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>DATE ARRIVED</Text>
        <AnimatedPressable onPress={() => setShowPicker(true)} haptic="selection"
          style={{ backgroundColor: colors.surfaceSunken, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: space.lg, marginBottom: space.lg }}>
          <Text variant="bodyMed">{date.toDateString()}</Text>
        </AnimatedPressable>
        {showPicker && (
          <DateTimePicker
            value={date} mode="date" display="default" maximumDate={new Date()}
            onChange={(_, d) => { setShowPicker(false); if (d) setDate(d); }}
          />
        )}

        <Field label="Chicks received" value={chicks} onChangeText={setChicks} keyboardType="number-pad" placeholder="e.g. 300" />
        <Field label="Breed" value={breed} onChangeText={setBreed} placeholder="e.g. Cobb 500" />
        <EntityAutocomplete label="Supplier" table="suppliers" value={supplier} onChange={setSupplier} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field label="Cost per chick" value={cost} onChangeText={setCost} keyboardType="decimal-pad" suffix="KES" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Weeks to market" value={weeks} onChangeText={setWeeks} keyboardType="number-pad" />
          </View>
        </View>
        <Text variant="caption" tone="tertiary" style={{ marginBottom: space.lg }}>
          Saving this builds the full vaccination schedule for you automatically.
        </Text>
        <Button label="Save flock" onPress={save} loading={saving} disabled={!chicks} size="lg" />
        <View style={{ height: 40 }} />
      </ScrollView>
    </Sheet>
  );
});

NewFlockSheet.displayName = 'NewFlockSheet';
