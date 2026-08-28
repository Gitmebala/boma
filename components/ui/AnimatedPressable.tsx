import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { motion } from '@/lib/theme';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: any;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'selection' | 'none';
  children: React.ReactNode;
}

/**
 * The single press-feedback primitive used everywhere in Boma.
 * Motion confirms the tap; it never performs for its own sake —
 * a quick, quiet scale + a matching haptic, nothing bouncier.
 */
export function AnimatedPressable({ style, scaleTo = 0.96, haptic = 'light', onPressIn, onPressOut, children, ...rest }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressableBase
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, motion.springSnappy);
        if (haptic !== 'none') {
          const map = {
            light: Haptics.ImpactFeedbackStyle.Light,
            medium: Haptics.ImpactFeedbackStyle.Medium,
            selection: null,
          } as const;
          if (haptic === 'selection') Haptics.selectionAsync();
          else Haptics.impactAsync(map[haptic] as Haptics.ImpactFeedbackStyle);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, motion.springSnappy);
        onPressOut?.(e);
      }}
      style={[style, animStyle as any]}
      {...rest}>
      {children}
    </AnimatedPressableBase>
  );
}
