import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space, elevation } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /**
   * Depth. Kept deliberately shallow — a card should read as sitting on the
   * page, not floating above it. Real separation comes from the surface /
   * background luminance step in the palette, with the shadow only
   * reinforcing it.
   */
  level?: 0 | 1 | 2;
  /** Sunken wells (inputs, inline groups) rather than raised surfaces. */
  sunken?: boolean;
}

export function Card({ children, style, padded = true, level = 1, sunken = false }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: sunken ? colors.surfaceSunken : colors.surface,
          borderColor: sunken ? 'transparent' : colors.border,
          borderWidth: sunken ? 0 : 1,
          padding: padded ? space.lg : 0,
          ...(sunken ? {} : elevation(level, colors.shadow)),
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg },
});
