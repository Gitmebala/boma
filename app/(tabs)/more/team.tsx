import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { supabase } from '@/lib/supabase';
import { space } from '@/lib/theme';

interface Member { id: string; invited_phone: string | null; role: string; can_view_money: boolean; status: string; profiles: { full_name: string | null; phone: string | null } | null; }

export default function TeamScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const [members, setMembers] = useState<Member[]>([]);
  const [phone, setPhone] = useState('');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!farm) return;
    const { data } = await supabase.from('farm_members').select('*, profiles(full_name, phone)').eq('farm_id', farm.id).neq('status', 'removed');
    setMembers((data as any) ?? []);
  }, [farm?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const invite = async () => {
    if (!farm || phone.replace(/\D/g, '').length < 9) return;
    setInviting(true);
    const fullPhone = `+254${phone.replace(/\D/g, '').replace(/^0+/, '')}`;
    await supabase.from('farm_members').insert({ farm_id: farm.id, invited_phone: fullPhone, role: 'logger', can_view_money: false, status: 'invited' });
    setInviting(false);
    setPhone('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    load();
  };

  const toggleMoney = async (m: Member, value: boolean) => {
    Haptics.selectionAsync();
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, can_view_money: value } : x)));
    await supabase.from('farm_members').update({ can_view_money: value }).eq('id', m.id);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Farm team</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.xl }} keyboardShouldPersistTaps="handled">
        <Card style={{ marginBottom: space.xl }}>
          <Text variant="h3" style={{ marginBottom: space.md }}>Invite a worker</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="number-pad" placeholder="712 345 678" />
            </View>
          </View>
          <Button label="Send invite" onPress={invite} loading={inviting} disabled={phone.length < 9} />
          <Text variant="caption" tone="tertiary" style={{ marginTop: space.sm }}>
            They'll join as a Logger — able to record deaths, feed and expenses. Money stays hidden until you turn it on below.
          </Text>
        </Card>

        <Text variant="label" tone="tertiary" style={{ marginBottom: space.sm }}>TEAM ({members.length})</Text>
        {members.map((m, i) => (
          <FadeInView key={m.id} index={i} style={{ marginBottom: space.md }}>
            <Card style={styles.memberRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMed">{m.profiles?.full_name || m.invited_phone || 'Pending'}</Text>
                <Text variant="caption" tone="tertiary">
                  {m.role === 'owner' ? 'Owner' : 'Logger'} · {m.status === 'invited' ? 'Invite pending' : 'Active'}
                </Text>
              </View>
              {m.role !== 'owner' && (
                <View style={{ alignItems: 'center' }}>
                  <Text variant="micro" tone="tertiary" style={{ marginBottom: 4 }}>MONEY</Text>
                  <Switch value={m.can_view_money} onValueChange={(v) => toggleMoney(m, v)} trackColor={{ true: colors.accent, false: colors.border }} />
                </View>
              )}
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
  memberRow: { flexDirection: 'row', alignItems: 'center' },
});
