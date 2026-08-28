import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from './Text';
import { Button } from './Button';
import { FadeInView } from './FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { space } from '@/lib/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <FadeInView style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSunken }]}>
        <Ionicons name={icon} size={28} color={colors.textSecondary} />
      </View>
      <Text variant="h3" style={{ marginTop: space.lg, textAlign: 'center' }}>{title}</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: space.xs, textAlign: 'center', maxWidth: 280 }}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} style={{ marginTop: space.xl }} />
      ) : null}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.xl },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
