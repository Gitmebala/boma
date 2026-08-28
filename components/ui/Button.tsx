import React from 'react';
import { ActivityIndicator, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space } from '@/lib/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', loading, disabled, icon, style, fullWidth = true }: Props) {
  const { colors } = useTheme();

  const bg = {
    primary: colors.accent,
    secondary: colors.surfaceSunken,
    ghost: 'transparent',
    danger: colors.dangerSoft,
  }[variant];

  const textTone = {
    primary: 'inverse',
    secondary: 'primary',
    ghost: 'accent',
    danger: 'danger',
  }[variant] as any;

  const border = variant === 'secondary' ? colors.border : variant === 'ghost' ? 'transparent' : 'transparent';

  return (
    <AnimatedPressable
      onPress={disabled || loading ? undefined : onPress}
      haptic="light"
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'secondary' ? 1 : 0,
          paddingVertical: size === 'lg' ? 17 : 13,
          opacity: disabled ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.accentText : colors.accent} />
      ) : (
        <>
          {icon}
          <Text variant="bodyMed" tone={textTone} style={icon ? { marginLeft: space.sm } : undefined}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
  },
});
