import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { radius, space } from '@/lib/theme';

export default function LanguageScreen() {
  const { colors } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const { setLocale } = useTranslation();
  const [selected, setSelected] = useState<'en' | 'sw'>(profile?.language ?? 'en');

  const choose = async (lang: 'en' | 'sw') => {
    setSelected(lang);
    Haptics.selectionAsync();
    // setLocale re-renders the whole app immediately and persists the
    // choice; the profile write is what makes it follow the farmer to a
    // new phone.
    setLocale(lang);
    if (profile) {
      await supabase.from('profiles').update({ language: lang }).eq('id', profile.id);
      await refreshProfile();
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Language</Text>
      </View>
      <View style={{ padding: space.xl, gap: space.md }}>
        {[{ code: 'en' as const, label: 'English' }, { code: 'sw' as const, label: 'Kiswahili' }].map((opt) => (
          <AnimatedPressable key={opt.code} onPress={() => choose(opt.code)} haptic="selection"
            style={[styles.row, { backgroundColor: colors.surface, borderColor: selected === opt.code ? colors.accent : colors.border }]}>
            <Text variant="h3">{opt.label}</Text>
            {selected === opt.code && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
          </AnimatedPressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space.xl, borderRadius: radius.lg, borderWidth: 1.5 },
});
