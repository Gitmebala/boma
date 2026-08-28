import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { useFarm } from '@/lib/FarmContext';
import { space, radius } from '@/lib/theme';

const SECTIONS: { title: string; rows: { icon: keyof typeof Ionicons.glyphMap; label: string; href?: string; ownerOnly?: boolean }[] }[] = [
  {
    title: 'Community',
    rows: [
      { icon: 'people-outline', label: 'Farming community hub', href: '/(tabs)/hub' },
    ],
  },
  {
    title: 'Farm records',
    rows: [
      { icon: 'checkbox-outline', label: 'Tasks & checklists', href: '/(tabs)/more/tasks' },
      { icon: 'business-outline', label: 'Suppliers', href: '/(tabs)/more/suppliers' },
      { icon: 'cube-outline', label: 'Feed stock', href: '/(tabs)/more/feed-stock' },
      { icon: 'construct-outline', label: 'Equipment', href: '/(tabs)/more/equipment' },
      { icon: 'document-text-outline', label: 'Receipts', href: '/(tabs)/more/receipts' },
    ],
  },
  {
    title: 'Account',
    rows: [
      { icon: 'settings-outline', label: 'Farm settings', href: '/(tabs)/more/settings', ownerOnly: true },
      { icon: 'people-outline', label: 'Farm team', href: '/(tabs)/more/team', ownerOnly: true },
      { icon: 'language-outline', label: 'Language', href: '/(tabs)/more/language' },
      { icon: 'help-circle-outline', label: 'Help & support', href: '/(tabs)/more/help' },
      { icon: 'star-outline', label: 'Plan: Free', href: '/(tabs)/more/plan' },
    ],
  },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const { profile, signOut } = useAuth();
  const { farm, role } = useFarm();

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You can sign back in any time with your phone number.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <FadeInView>
          <Text variant="h1">More</Text>
          <Card style={styles.profileCard}>
            <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
              <Text variant="h2" tone="accent">{(profile?.full_name || farm?.name || 'B')[0].toUpperCase()}</Text>
            </View>
            <View style={{ marginLeft: space.md, flex: 1 }}>
              <Text variant="h3">{profile?.full_name || 'Boma farmer'}</Text>
              <Text variant="caption" tone="tertiary">{farm?.name} · {role === 'owner' ? 'Owner' : 'Team member'}</Text>
            </View>
          </Card>
        </FadeInView>

        {SECTIONS.map((section, si) => (
          <View key={section.title} style={{ marginTop: space.xl }}>
            <Text variant="label" tone="tertiary" style={{ marginBottom: space.sm, marginLeft: 4 }}>{section.title.toUpperCase()}</Text>
            <Card padded={false}>
              {section.rows
                .filter((r) => !r.ownerOnly || role === 'owner')
                .map((row, i, arr) => (
                  <AnimatedPressable key={row.label} onPress={() => row.href && router.push(row.href as any)} haptic="selection" scaleTo={0.99}>
                    <View style={[styles.row, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <Ionicons name={row.icon} size={20} color={colors.textSecondary} />
                      <Text variant="bodyMed" style={{ flex: 1, marginLeft: space.md }}>{row.label}</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </View>
                  </AnimatedPressable>
                ))}
            </Card>
          </View>
        ))}

        <AnimatedPressable onPress={confirmSignOut} haptic="medium" style={{ marginTop: space.xxl }}>
          <Card style={{ alignItems: 'center' }}>
            <Text variant="bodyMed" tone="danger">Sign out</Text>
          </Card>
        </AnimatedPressable>
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: space.xl },
  profileCard: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 15 },
});
