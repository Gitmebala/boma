import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { motion } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  delay?: number;
  index?: number;
  style?: ViewStyle | ViewStyle[];
  distance?: number;
}

/**
 * The single entrance-animation primitive. Used to stagger lists/cards
 * on mount — a quiet fade + rise, never a bounce. index * 40ms stagger
 * keeps a list of 10 items settling within ~600ms, still feels instant.
 */
export function FadeInView({ children, delay = 0, index = 0, style, distance = 10 }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(distance);

  useEffect(() => {
    const d = delay + index * 40;
    opacity.value = withDelay(d, withTiming(1, { duration: motion.base, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(d, withTiming(0, { duration: motion.base, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}
