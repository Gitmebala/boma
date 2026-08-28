import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/lib/ThemeContext';
import { radius } from '@/lib/theme';

export function Skeleton({ width, height, style }: { width: number | `${number}%`; height: number; style?: ViewStyle }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 650 }), withTiming(0.5, { duration: 650 })), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: colors.surfaceSunken, borderRadius: radius.sm },
        animStyle,
        style,
      ]}
    />
  );
}
