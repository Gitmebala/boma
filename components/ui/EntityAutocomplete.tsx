import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, TextInput, StyleSheet, FlatList, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { AnimatedPressable } from './AnimatedPressable';
import { FadeInView } from './FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space, font } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useFarm } from '@/lib/FarmContext';
import Ionicons from '@expo/vector-icons/Ionicons';

type EntityTable = 'suppliers' | 'customers';

interface EntityRow {
  id: string;
  name: string;
  phone: string | null;
  location: string | null;
}

interface Props {
  label: string;
  table: EntityTable;
  value: { id: string; name: string } | null;
  onChange: (entity: { id: string; name: string } | null) => void;
  placeholder?: string;
}

/**
 * The friction-killer: type a supplier or customer name once, it's saved.
 * Every time after, it's a two-letter search and a tap — never retyped.
 */
export function EntityAutocomplete({ label, table, value, onChange, placeholder }: Props) {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<EntityRow[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setQuery(value?.name ?? ''); }, [value?.id]);

  const search = useCallback((text: string) => {
    if (!farm) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from(table)
        .select('id, name, phone, location')
        .eq('farm_id', farm.id)
        .ilike('name', `%${text}%`)
        .order('name')
        .limit(8);
      setResults((data as EntityRow[]) ?? []);
    }, 180);
  }, [farm?.id, table]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (value && text !== value.name) onChange(null);
    search(text);
  };

  const select = (row: EntityRow) => {
    Haptics.selectionAsync();
    onChange({ id: row.id, name: row.name });
    setQuery(row.name);
    setOpen(false);
    Keyboard.dismiss();
  };

  const exactMatch = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  const createNew = async () => {
    if (!farm || !query.trim() || creating) return;
    setCreating(true);
    const { data, error } = await supabase
      .from(table)
      .insert({ farm_id: farm.id, name: query.trim() })
      .select('id, name')
      .single();
    setCreating(false);
    if (!error && data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      select(data as EntityRow);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="secondary" style={styles.label}>{label.toUpperCase()}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.surfaceSunken, borderColor: open ? colors.accent : colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} style={{ marginRight: space.sm }} />
        <TextInput
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => { setOpen(true); search(query); }}
          placeholder={placeholder ?? `Search or add a ${table === 'suppliers' ? 'supplier' : 'customer'}`}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.textPrimary, fontFamily: font.bodyMed }]}
        />
        {value ? <Ionicons name="checkmark-circle" size={18} color={colors.success} /> : null}
      </View>

      {open && query.length > 0 && (
        <FadeInView distance={4} style={[styles.dropdown, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 220 }}
            renderItem={({ item }) => (
              <AnimatedPressable onPress={() => select(item)} haptic="selection" scaleTo={0.99} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMed">{item.name}</Text>
                  {item.phone || item.location ? (
                    <Text variant="caption" tone="tertiary">{[item.phone, item.location].filter(Boolean).join(' · ')}</Text>
                  ) : null}
                </View>
              </AnimatedPressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          />
          {!exactMatch && query.trim().length > 1 && (
            <AnimatedPressable onPress={createNew} haptic="light" style={[styles.row, styles.addRow, { borderTopColor: colors.border }]}>
              <Ionicons name="add-circle" size={18} color={colors.accent} style={{ marginRight: space.sm }} />
              <Text variant="bodyMed" tone="accent">
                {creating ? 'Adding…' : `Add "${query.trim()}" as new`}
              </Text>
            </AnimatedPressable>
          )}
        </FadeInView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg, zIndex: 10 },
  label: { marginBottom: space.sm },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.lg, minHeight: 52,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  dropdown: {
    marginTop: space.sm, borderRadius: radius.md, borderWidth: 1, overflow: 'hidden',
  },
  row: { paddingHorizontal: space.lg, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  addRow: { borderTopWidth: 1 },
});
