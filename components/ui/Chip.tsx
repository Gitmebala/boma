import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space } from '@/lib/theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: Props) {
  const { colors } = useTheme();
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(selected ? colors.accent : colors.surfaceSunken, { duration: 160 }),
    borderColor: withTiming(selected ? colors.accent : colors.border, { duration: 160 }),
  }));

  return (
    <AnimatedPressable onPress={onPress} haptic="selection" scaleTo={0.95} style={[styles.chip, bgStyle]}>
      <Text variant="bodyMed" tone={selected ? 'inverse' : 'secondary'}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
