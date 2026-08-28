import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
}

/** Flat surface, hairline border, no fake depth — the one card primitive. */
export function Card({ children, style, padded = true, elevated = false }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: elevated ? colors.bgElevated : colors.surface,
          borderColor: colors.border,
          padding: padded ? space.lg : 0,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
