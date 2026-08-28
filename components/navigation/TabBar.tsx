import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/lib/ThemeContext';
import { motion, radius, space } from '@/lib/theme';

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  home: { active: 'home', inactive: 'home-outline' },
  flocks: { active: 'layers', inactive: 'layers-outline' },
  log: { active: 'add', inactive: 'add' },
  money: { active: 'wallet', inactive: 'wallet-outline' },
  more: { active: 'grid', inactive: 'grid-outline' },
};

const LABELS: Record<string, string> = {
  home: 'Home', flocks: 'Flocks', log: '', money: 'Money', more: 'More',
};

export function TabBar({ state, navigation }: { state: any; navigation: any }) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]} pointerEvents="box-none">
      <BlurView
        intensity={Platform.OS === 'ios' ? 60 : 0}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={[styles.bar, { backgroundColor: colors.tabBarBg, borderColor: colors.border }]}>
        {state.routes.filter((r: any) => r.name !== 'hub').map((route: any) => {
          const index = state.routes.indexOf(route);
          const focused = state.index === index;
          const isLog = route.name === 'log';

          const onPress = () => {
            Haptics.selectionAsync();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (isLog) {
            return <LogButton key={route.key} onPress={onPress} />;
          }

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

function TabItem({ focused, icon, label, onPress }: { focused: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1 : 0.94, motion.springSnappy) }],
  }));
  return (
    <Animated.View style={[styles.item, style]} onTouchEnd={onPress}>
      <Ionicons name={icon} size={22} color={focused ? colors.accent : colors.textTertiary} />
      <Text variant="micro" tone={focused ? 'accent' : 'tertiary'} style={{ marginTop: 3 }}>{label.toUpperCase()}</Text>
    </Animated.View>
  );
}

function LogButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(1, motion.springSnappy) }] }));
  return (
    <Animated.View style={[styles.logWrap, style]} onTouchEnd={onPress}>
      <View style={[styles.logCircle, { backgroundColor: colors.accent }]}>
        <Ionicons name="add" size={28} color={colors.accentText} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    width: '92%', borderRadius: radius.xl, borderWidth: 1, paddingVertical: 10,
    overflow: 'hidden',
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  logWrap: { alignItems: 'center', justifyContent: 'center', marginTop: -26 },
  logCircle: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
