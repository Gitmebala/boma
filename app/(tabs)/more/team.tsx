import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Switch, Linking, Alert } from 'react-native';
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
import { useSync } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { space, radius, layout } from '@/lib/theme';

interface Member {
  id: string;
  invited_phone: string | null;
  role: string;
  can_view_money: boolean;
  status: string;
  profiles: { full_name: string | null; phone: string | null } | null;
}

export default function TeamScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const { enqueueUpdate } = useSync();
  const [members, setMembers] = useState<Member[]>([]);
  const [phone, setPhone] = useState('');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!farm) return;
    // Members who left or were removed stay in the table (status='removed')
    // rather than being deleted, so their old logs and history keep a valid
    // recorded_by — this filter is what makes that invisible in the list.
    const { data } = await supabase
      .from('farm_members')
      .select('*, profiles(full_name, phone)')
      .eq('farm_id', farm.id)
      .neq('status', 'removed');
    setMembers((data as any) ?? []);
  }, [farm?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const invite = async () => {
    if (!farm || phone.replace(/\D/g, '').length < 9) return;
    setInviting(true);
    const fullPhone = `+254${phone.replace(/\D/g, '').replace(/^0+/, '')}`;
    const { error } = await supabase
      .from('farm_members')
      .insert({ farm_id: farm.id, invited_phone: fullPhone, role: 'logger', can_view_money: false, status: 'invited' });
    setInviting(false);
    if (error) return;

    setPhone('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    load();

    // The row alone reaches nobody — v1 stopped here, so from the invited
    // person's side nothing had happened. Opening WhatsApp on the owner's
    // own phone (no messaging budget or API needed) is the same pattern
    // already working for debt reminders.
    const message =
      `You've been added to ${farm.name} on Boma, the farm record-keeping app.\n\n` +
      `Download Boma and sign in with this phone number (${fullPhone}) to get started — ` +
      `no password needed, just a code sent by text.`;
    Linking.openURL(`https://wa.me/${fullPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`).catch(() => {});
  };

  const toggleMoney = async (m: Member, value: boolean) => {
    Haptics.selectionAsync();
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, can_view_money: value } : x)));
    await enqueueUpdate('farm_members', m.id, { can_view_money: value });
  };

  const removeMember = (m: Member) => {
    const name = m.profiles?.full_name || m.invited_phone || 'this person';
    Alert.alert(
      `Remove ${name}?`,
      m.status === 'invited'
        ? 'Cancels the invite. They will not be able to join with that phone number unless invited again.'
        : "They'll lose access immediately. Anything they've already logged stays on the farm's record.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Soft delete: the list query already filters status='removed'
            // out, and history rows keep a valid recorded_by reference.
            const { error } = await supabase.from('farm_members').update({ status: 'removed' }).eq('id', m.id);
            if (!error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              load();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} haptic="selection" style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text variant="h2" style={{ marginLeft: space.md }}>Farm team</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: layout.tabBarClearance }} keyboardShouldPersistTaps="handled">
        <Card style={{ marginBottom: space.xl }}>
          <Text variant="h3" style={{ marginBottom: space.md }}>Invite a worker</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="number-pad" placeholder="712 345 678" />
            </View>
          </View>
          <Button label="Send invite" onPress={invite} loading={inviting} disabled={phone.length < 9} />
          <Text variant="caption" tone="tertiary" style={{ marginTop: space.sm }}>
            Opens WhatsApp with an invite message. They'll join as a Logger — able to record deaths, feed
            and expenses. Money stays hidden until you turn it on below.
          </Text>
        </Card>

        <Text variant="label" tone="tertiary" style={{ marginBottom: space.sm }}>TEAM ({members.length})</Text>
        {members.map((m, i) => {
          const name = m.profiles?.full_name || m.invited_phone || 'Pending';
          const statusLabel = m.role === 'owner' ? 'Owner' : m.status === 'invited' ? 'Sent · not yet joined' : 'Active';
          const statusTone = m.status === 'invited' ? 'warning' : 'tertiary';

          return (
            <FadeInView key={m.id} index={i} style={{ marginBottom: space.md }}>
              <Card>
                <View style={styles.memberRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMed" numberOfLines={1}>{name}</Text>
                    <Text variant="caption" tone={statusTone}>{statusLabel}</Text>
                  </View>
                  {m.role !== 'owner' && (
                    <AnimatedPressable
                      onPress={() => removeMember(m)}
                      haptic="light"
                      accessibilityLabel={`Remove ${name}`}
                      style={[styles.removeBtn, { backgroundColor: colors.dangerSoft }]}>
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </AnimatedPressable>
                  )}
                </View>

                {m.role !== 'owner' && (
                  <View style={[styles.moneyRow, { borderTopColor: colors.borderFaint }]}>
                    <View style={{ flex: 1, marginRight: space.md }}>
                      <Text variant="body">Can see money</Text>
                      <Text variant="caption" tone="tertiary">Sales, debts and profit — not just what they log</Text>
                    </View>
                    <Switch value={m.can_view_money} onValueChange={(v) => toggleMoney(m, v)} trackColor={{ true: colors.accent, false: colors.border }} />
                  </View>
                )}
              </Card>
            </FadeInView>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  removeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
  },
});
