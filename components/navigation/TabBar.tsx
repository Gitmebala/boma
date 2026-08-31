import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/lib/ThemeContext';
import { motion, radius, space, layout, elevation } from '@/lib/theme';

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  home: { active: 'home', inactive: 'home-outline' },
  flocks: { active: 'layers', inactive: 'layers-outline' },
  log: { active: 'add', inactive: 'add' },
  money: { active: 'wallet', inactive: 'wallet-outline' },
  reports: { active: 'stats-chart', inactive: 'stats-chart-outline' },
};

const LABELS: Record<string, string> = {
  home: 'Home',
  flocks: 'Flocks',
  log: '',
  money: 'Money',
  reports: 'Reports',
};

/** Only these appear in the bar; everything else is reached from in-page UI. */
const BAR_ROUTES = ['home', 'flocks', 'log', 'money', 'reports'];

export function TabBar({ state, navigation }: { state: any; navigation: any }) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  const routes = BAR_ROUTES.map((name) => state.routes.find((r: any) => r.name === name)).filter(Boolean);

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, layout.tabBarBottomGap) }]}
      pointerEvents="box-none">
      <BlurView
        intensity={Platform.OS === 'ios' ? 40 : 0}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={[
          styles.bar,
          {
            backgroundColor: colors.tabBarBg,
            borderColor: colors.border,
            ...elevation(2, colors.shadow),
          },
        ]}>
        {routes.map((route: any) => {
          const index = state.routes.indexOf(route);
          const focused = state.index === index;
          const isLog = route.name === 'log';

          const onPress = () => {
            Haptics.selectionAsync();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (isLog) return <LogButton key={route.key} onPress={onPress} />;

          return (
            <TabItem
              key={route.key}
              focused={focused}
              icon={focused ? ICONS[route.name]?.active : ICONS[route.name]?.inactive}
              label={LABELS[route.name] ?? route.name}
              onPress={onPress}
            />
          );
        })}
      </BlurView>
    </View>
  );
}

function TabItem({
  focused,
  icon,
  label,
  onPress,
}: {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1 : 0.94, motion.springSnappy) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={styles.itemHit}>
      <Animated.View style={[styles.item, style]}>
        <Ionicons name={icon} size={21} color={focused ? colors.accent : colors.textTertiary} />
        <Text variant="micro" tone={focused ? 'accent' : 'tertiary'} style={{ marginTop: 3 }} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function LogButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Quick log"
      style={styles.logHit}>
      <View style={[styles.logCircle, { backgroundColor: colors.accent, ...elevation(2, colors.shadow) }]}>
        <Ionicons name="add" size={28} color={colors.accentText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '92%',
    maxWidth: layout.maxContentWidth,
    height: layout.tabBarHeight,
    borderRadius: radius.xxl,
    borderWidth: 1,
    overflow: 'visible',
    paddingHorizontal: space.xs,
  },
  // Hit area spans the full bar height so the target satisfies Fitts's law
  // even though the visible icon stack is smaller.
  itemHit: { flex: 1, height: layout.tabBarHeight, alignItems: 'center', justifyContent: 'center' },
  item: { alignItems: 'center', justifyContent: 'center' },
  logHit: { width: 68, alignItems: 'center', justifyContent: 'center', height: layout.tabBarHeight },
  logCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
});
