import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { space, radius, layout } from '@/lib/theme';

interface Agrovet {
  id: string; name: string; contact_person: string | null; phone: string | null;
  county: string | null; location_note: string | null; verified: boolean;
  rating: number | null; services: string[] | null;
}

export default function AgrovetsScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [all, setAll] = useState<Agrovet[]>([]);
  const [nearOnly, setNearOnly] = useState(true);

  useFocusEffect(useCallback(() => {
    supabase.from('agrovets').select('*').eq('verified', true).order('rating', { ascending: false })
      .then(({ data }) => setAll((data as Agrovet[]) ?? []));
  }, []));

  const visible = nearOnly && farm?.county
    ? all.filter((a) => a.county === farm.county)
    : all;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Verified agrovets</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: layout.tabBarClearance }} showsVerticalScrollIndicator={false}>
        <Card style={{ backgroundColor: colors.accentSoft, borderColor: 'transparent', marginBottom: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
            <Text variant="caption" tone="secondary" style={{ flex: 1, marginLeft: space.sm }}>
              Counterfeit and substandard veterinary drugs are a real problem. Everyone listed here has been checked.
            </Text>
          </View>
        </Card>

        {farm?.county ? (
          <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
            <Chip label={`${farm.county} only`} selected={nearOnly} onPress={() => setNearOnly(true)} />
            <Chip label="All counties" selected={!nearOnly} onPress={() => setNearOnly(false)} />
          </View>
        ) : null}

        {visible.length === 0 ? (
          <EmptyState
            icon="storefront-outline"
            title="None listed here yet"
            body={nearOnly ? 'Try viewing all counties.' : 'Verified suppliers will appear here as they are added.'}
            actionLabel={nearOnly ? 'Show all counties' : undefined}
            onAction={nearOnly ? () => setNearOnly(false) : undefined}
          />
        ) : visible.map((a, i) => (
          <FadeInView key={a.id} index={i} style={{ marginBottom: space.md }}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="storefront" size={20} color={colors.accent} />
                  <View style={[styles.verifiedBadge, { backgroundColor: colors.surface }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <View style={styles.rowBetween}>
                    <Text variant="bodyMed" style={{ flex: 1 }} numberOfLines={1}>{a.name}</Text>
                    {a.rating ? (
                      <View style={[styles.rating, { backgroundColor: colors.warningSoft }]}>
                        <Ionicons name="star" size={11} color={colors.warning} />
                        <Text variant="micro" style={{ color: colors.warning, marginLeft: 3 }}>{a.rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="caption" tone="tertiary" numberOfLines={1}>
                    {[a.contact_person, a.location_note].filter(Boolean).join(' · ')}
                  </Text>
                  {a.services?.length ? (
                    <View style={styles.tagRow}>
                      {a.services.slice(0, 3).map((s) => (
                        <View key={s} style={[styles.tag, { backgroundColor: colors.surfaceSunken }]}>
                          <Text variant="micro" tone="secondary">{s}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              {a.phone ? (
                <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
                  <AnimatedPressable
                    onPress={() => Linking.openURL(`tel:${a.phone}`)}
                    haptic="light"
                    style={[styles.actionBtn, { backgroundColor: colors.surfaceSunken, flex: 1 }]}>
                    <Ionicons name="call" size={15} color={colors.textPrimary} />
                    <Text variant="label" style={{ marginLeft: 6 }}>Call</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() => Linking.openURL(`https://wa.me/${a.phone!.replace(/\D/g, '')}`)}
                    haptic="light"
                    style={[styles.actionBtn, { backgroundColor: colors.successSoft, flex: 1 }]}>
                    <Ionicons name="logo-whatsapp" size={15} color={colors.success} />
                    <Text variant="label" style={{ color: colors.success, marginLeft: 6 }}>WhatsApp</Text>
                  </AnimatedPressable>
                </View>
              ) : null}
            </Card>
          </FadeInView>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  verifiedBadge: { position: 'absolute', bottom: -2, right: -2, borderRadius: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  rating: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.pill },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: space.sm },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.md },
});
