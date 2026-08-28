import React, { useState } from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Text } from './Text';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space, font } from '@/lib/theme';

interface Props extends TextInputProps {
  label: string;
  suffix?: string;
  error?: string;
}

export function Field({ label, suffix, error, style, onFocus, onBlur, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(error ? colors.danger : focused ? colors.accent : colors.border, { duration: 150 }),
  }));

  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="secondary" style={styles.label}>{label.toUpperCase()}</Text>
      <Animated.View style={[styles.inputRow, { backgroundColor: colors.surfaceSunken }, borderStyle]}>
        <TextInput
          {...rest}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.textPrimary, fontFamily: font.bodyMed }, style as any]}
        />
        {suffix ? <Text variant="bodyMed" tone="tertiary">{suffix}</Text> : null}
      </Animated.View>
      {error ? <Text variant="caption" tone="danger" style={{ marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: { marginBottom: space.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    minHeight: 52,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
});
