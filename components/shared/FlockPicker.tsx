import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Chip } from '@/components/ui/Chip';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { space } from '@/lib/theme';

interface FlockOption { id: string; flock_code: string; }

export function FlockPicker({ value, onChange, allowGeneral }: { value: string | null; onChange: (id: string | null) => void; allowGeneral?: boolean }) {
  const { farm } = useFarm();
  const [flocks, setFlocks] = useState<FlockOption[]>([]);

  useEffect(() => {
    if (!farm) return;
    supabase.from('flocks').select('id, flock_code').eq('farm_id', farm.id).in('status', ['Active', 'Selling'])
      .order('date_arrived', { ascending: false })
      .then(({ data }) => setFlocks((data as FlockOption[]) ?? []));
  }, [farm?.id]);

  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>FLOCK</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {allowGeneral && <Chip label="GENERAL (shared)" selected={value === null} onPress={() => onChange(null)} />}
        {flocks.map((f) => (
          <Chip key={f.id} label={f.flock_code} selected={value === f.id} onPress={() => onChange(f.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { marginBottom: space.lg } });
