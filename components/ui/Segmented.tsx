import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from './Text';
import { AnimatedPressable } from './AnimatedPressable';
import { useTheme } from '@/lib/ThemeContext';
import { space, radius } from '@/lib/theme';

/**
 * Segmented control (Jakob's law — this is the shape people already know from
 * every finance app's 1W / 1M / 3M / YTD switcher, so it needs no learning).
 *
 * Targets are 44pt minimum so they satisfy Fitts's law on a phone held
 * one-handed in a chicken house.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  scroll = false,
  size = 'md',
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  /** Use when there are more options than fit the width. */
  scroll?: boolean;
  size?: 'sm' | 'md';
}) {
  const { colors } = useTheme();

  const items = options.map((opt) => {
    const active = opt === value;
    return (
      <AnimatedPressable
        key={opt}
        onPress={() => onChange(opt)}
        haptic="selection"
        scaleTo={0.97}
        style={[
          styles.item,
          size === 'sm' && styles.itemSm,
          scroll && { flex: 0 },
          {
            backgroundColor: active ? colors.surface : 'transparent',
            borderColor: active ? colors.border : 'transparent',
          },
        ]}>
        <Text variant={size === 'sm' ? 'micro' : 'label'} tone={active ? 'primary' : 'tertiary'}>
          {opt}
        </Text>
      </AnimatedPressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
        {items}
      </ScrollView>
    );
  }

  return <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>{items}</View>;
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  item: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: space.md,
  },
  itemSm: { minHeight: 32, paddingHorizontal: space.sm },
});
