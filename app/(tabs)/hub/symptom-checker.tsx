import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { useFarm } from '@/lib/FarmContext';
import { useSync } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { space, radius, layout } from '@/lib/theme';

interface Symptom { id: string; code: string; label_en: string; label_sw: string | null; body_system: string | null }
interface Result {
  code: string; name_en: string; name_sw: string | null; urgency: 'routine' | 'urgent' | 'emergency';
  description_en: string; description_sw: string | null;
  action_en: string; action_sw: string | null; is_notifiable: boolean;
  match_score: number; matched_count: number; total_signs: number;
}

export default function SymptomCheckerScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { farm } = useFarm();
  const { enqueueInsert } = useSync();
  const sw = profile?.language === 'sw';

  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Result[] | null>(null);
  const [checking, setChecking] = useState(false);

  useFocusEffect(useCallback(() => {
    supabase.from('symptoms').select('*').order('sort_order')
      .then(({ data }) => setSymptoms((data as Symptom[]) ?? []));
  }, []));

  const toggle = (code: string) => {
    Haptics.selectionAsync();
    const next = new Set(selected);
    next.has(code) ? next.delete(code) : next.add(code);
    setSelected(next);
    setResults(null);
  };

  const check = async () => {
    if (selected.size === 0) return;
    setChecking(true);
    const { data } = await supabase.rpc('check_symptoms', { p_symptom_codes: Array.from(selected) });
    setChecking(false);
    setResults((data as Result[]) ?? []);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const reset = () => { setSelected(new Set()); setResults(null); };

  const reportOutbreak = async (diseaseName: string) => {
    if (!farm) return;
    await enqueueInsert('disease_reports', {
      farm_id: farm.id, county: farm.county, disease: diseaseName, severity: 'suspected',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/(tabs)/hub/disease-radar');
  };

  const urgencyStyle = (u: Result['urgency']) => ({
    emergency: { bg: colors.dangerSoft, fg: colors.danger, label: sw ? 'DHARURA' : 'EMERGENCY', icon: 'alert-circle' as const },
    urgent: { bg: colors.warningSoft, fg: colors.warning, label: sw ? 'HARAKA' : 'URGENT', icon: 'warning' as const },
    routine: { bg: colors.successSoft, fg: colors.success, label: sw ? 'KAWAIDA' : 'ROUTINE', icon: 'information-circle' as const },
  }[u]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md, flex: 1 }}>{sw ? 'Kipima Dalili' : 'Symptom checker'}</Text>
        {selected.size > 0 && (
          <AnimatedPressable onPress={reset} haptic="selection">
            <Text variant="label" tone="accent">{sw ? 'Anza upya' : 'Reset'}</Text>
          </AnimatedPressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: layout.tabBarClearance }} showsVerticalScrollIndicator={false}>
        {!results && (
          <>
            <Text variant="body" tone="secondary" style={{ marginBottom: space.xl }}>
              {sw
                ? 'Chagua dalili zote unazoziona kwenye kuku wako. Hii si uchunguzi wa daktari — ni msaada wa kuamua nini cha kufanya.'
                : 'Tick everything you can see in your birds. This is not a diagnosis — it helps you decide how urgently to act.'}
            </Text>

            <View style={{ gap: space.sm }}>
              {symptoms.map((s, i) => {
                const on = selected.has(s.code);
                return (
                  <FadeInView key={s.id} index={Math.min(i, 12)}>
                    <AnimatedPressable onPress={() => toggle(s.code)} haptic="none" scaleTo={0.99}>
                      <Card style={[styles.symptomRow, on && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}>
                        <View style={[styles.check, {
                          backgroundColor: on ? colors.accent : 'transparent',
                          borderColor: on ? colors.accent : colors.borderStrong,
                        }]}>
                          {on && <Ionicons name="checkmark" size={14} color={colors.accentText} />}
                        </View>
                        <View style={{ flex: 1, marginLeft: space.md }}>
                          <Text variant="bodyMed">{sw && s.label_sw ? s.label_sw : s.label_en}</Text>
                          {sw && s.label_sw ? null : s.label_sw ? (
                            <Text variant="caption" tone="tertiary">{s.label_sw}</Text>
                          ) : null}
                        </View>
                      </Card>
                    </AnimatedPressable>
                  </FadeInView>
                );
              })}
            </View>
          </>
        )}

        {results && (
          <>
            <Text variant="body" tone="secondary" style={{ marginBottom: space.lg }}>
              {sw
                ? `Kulingana na dalili ${selected.size} ulizochagua:`
                : `Based on the ${selected.size} sign${selected.size === 1 ? '' : 's'} you described:`}
            </Text>

            {results.length === 0 ? (
              <Card>
                <Text variant="bodyMed">{sw ? 'Hakuna linalolingana wazi.' : 'Nothing matched clearly.'}</Text>
                <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
                  {sw ? 'Mpigie daktari wa mifugo kwa uchunguzi.' : 'Call a vet for a proper look, and keep logging what you see.'}
                </Text>
              </Card>
            ) : results.map((r, i) => {
              const u = urgencyStyle(r.urgency);
              const top = i === 0;
              return (
                <FadeInView key={r.code} index={i} style={{ marginBottom: space.md }}>
                  <Card style={top ? { borderColor: u.fg, borderWidth: 1.5 } : undefined}>
                    <View style={styles.resultHead}>
                      <View style={[styles.urgencyPill, { backgroundColor: u.bg }]}>
                        <Ionicons name={u.icon} size={13} color={u.fg} />
                        <Text variant="micro" style={{ color: u.fg, marginLeft: 5 }}>{u.label}</Text>
                      </View>
                      <Text variant="micro" tone="tertiary">
                        {r.matched_count}/{r.total_signs} {sw ? 'dalili' : 'signs'}
                      </Text>
                    </View>

                    <Text variant="h3" style={{ marginTop: space.md }}>
                      {sw && r.name_sw ? r.name_sw : r.name_en}
                    </Text>

                    <View style={[styles.scoreTrack, { backgroundColor: colors.surfaceSunken }]}>
                      <View style={[styles.scoreFill, { width: `${Math.min(100, r.match_score * 100)}%`, backgroundColor: u.fg }]} />
                    </View>

                    <Text variant="body" tone="secondary" style={{ marginTop: space.md }}>
                      {sw && r.description_sw ? r.description_sw : r.description_en}
                    </Text>

                    <View style={[styles.actionBox, { backgroundColor: colors.surfaceSunken }]}>
                      <Text variant="micro" tone="tertiary">{sw ? 'FANYA HIVI' : 'WHAT TO DO'}</Text>
                      <Text variant="bodyMed" style={{ marginTop: 4 }}>
                        {sw && r.action_sw ? r.action_sw : r.action_en}
                      </Text>
                    </View>

                    {r.is_notifiable && (
                      <View style={[styles.notifiable, { backgroundColor: colors.dangerSoft }]}>
                        <Ionicons name="megaphone" size={14} color={colors.danger} />
                        <Text variant="caption" style={{ color: colors.danger, marginLeft: space.sm, flex: 1 }}>
                          {sw
                            ? 'Ugonjwa huu unapaswa kuripotiwa kwa mamlaka ya mifugo.'
                            : 'This is a notifiable disease — it must be reported to veterinary authorities.'}
                        </Text>
                      </View>
                    )}

                    {top && (r.urgency === 'emergency' || r.urgency === 'urgent') && (
                      <View style={{ gap: space.sm, marginTop: space.lg }}>
                        <Button
                          label={sw ? 'Tafuta daktari karibu' : 'Find a vet near me'}
                          onPress={() => router.push('/(tabs)/hub/agrovets')}
                        />
                        <Button
                          label={sw ? 'Ripoti kwa wakulima wa karibu' : 'Warn nearby farmers'}
                          variant="secondary"
                          onPress={() => reportOutbreak(r.name_en)}
                        />
                      </View>
                    )}
                  </Card>
                </FadeInView>
              );
            })}

            <Card style={{ marginTop: space.sm, backgroundColor: colors.surfaceSunken, borderColor: 'transparent' }}>
              <Text variant="caption" tone="secondary">
                {sw
                  ? 'Kumbuka: hii ni mwongozo wa kwanza tu, si uchunguzi wa daktari. Kwa uhakika, mpigie daktari wa mifugo.'
                  : 'Remember: this is a first filter, not a diagnosis. Only a vet can confirm what is actually wrong.'}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>

      {!results && selected.size > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <Button
            label={sw ? `Angalia (${selected.size})` : `Check ${selected.size} sign${selected.size === 1 ? '' : 's'}`}
            onPress={check}
            loading={checking}
            size="lg"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  symptomRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  urgencyPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, paddingVertical: 5, borderRadius: radius.pill },
  scoreTrack: { height: 5, borderRadius: 3, marginTop: space.md, overflow: 'hidden' },
  scoreFill: { height: 5, borderRadius: 3 },
  actionBox: { padding: space.md, borderRadius: radius.md, marginTop: space.md },
  notifiable: { flexDirection: 'row', alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, marginTop: space.sm },
  footer: { padding: space.xl, borderTopWidth: 1 },
});
