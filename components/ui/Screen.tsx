import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from './Text';
import { AnimatedPressable } from './AnimatedPressable';
import { useTheme, useTabBarClearance } from '@/lib/ThemeContext';
import { space, layout } from '@/lib/theme';

/**
 * The one screen scaffold.
 *
 * Exists so no screen has to remember that the tab bar floats over content.
 * v1 left that to each file and they all guessed differently (140 here, a
 * 120px spacer View there, nothing at all on most), which is why rows kept
 * disappearing under the bar. Bottom clearance is now structural.
 */

interface ScreenProps {
  children: React.ReactNode;
  /** Set false on stacked screens that sit above the tab bar (e.g. modals). */
  tabBar?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, style }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }, style]} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

interface ScreenScrollProps extends ScrollViewProps {
  children: React.ReactNode;
  /** Adds tab-bar clearance to the bottom. Off for pushed detail screens. */
  tabBar?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom room beyond the tab bar (e.g. for a sticky footer). */
  extraBottom?: number;
  gutter?: boolean;
}

export function ScreenScroll({
  children,
  tabBar = true,
  refreshing,
  onRefresh,
  extraBottom = 0,
  gutter = true,
  contentContainerStyle,
  ...rest
}: ScreenScrollProps) {
  const { colors } = useTheme();
  const clearance = useTabBarClearance(extraBottom);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        gutter && { paddingHorizontal: space.gutter },
        { paddingBottom: tabBar ? clearance : space.xxl + extraBottom },
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        ) : undefined
      }
      {...rest}>
      {children}
    </ScrollView>
  );
}

/** Consistent pushed-screen header with a back affordance. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <AnimatedPressable
        onPress={onBack ?? (() => router.back())}
        haptic="selection"
        style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}>
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
      </AnimatedPressable>
      <View style={{ flex: 1, marginLeft: space.md }}>
        <Text variant="h2" numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/**
 * Sticky action bar pinned above the tab bar. This is what the Log-sale sheet
 * needed — a primary action that can never scroll out of reach.
 */
export function StickyFooter({ children, floating = true }: { children: React.ReactNode; floating?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: colors.bg,
          borderTopColor: colors.borderFaint,
          paddingBottom: floating ? layout.tabBarClearance : space.xl,
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: space.xs,
    paddingBottom: space.lg,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.gutter,
    paddingTop: space.lg,
    borderTopWidth: 1,
  },
});
