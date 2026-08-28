import React from 'react';
import { Text as RNText, TextProps, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { type } from '@/lib/theme';

type Variant = keyof typeof type;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'warning' | 'danger' | 'inverse';

interface Props extends TextProps {
  variant?: Variant;
  tone?: Tone;
  style?: StyleProp<TextStyle>;
}

export function Text({ variant = 'body', tone = 'primary', style, ...rest }: Props) {
  const { colors } = useTheme();
  const toneColor: Record<Tone, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    inverse: colors.accentText,
  };
  return <RNText {...rest} style={[type[variant] as TextStyle, { color: toneColor[tone] }, style]} />;
}
