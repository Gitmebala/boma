import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { FadeInView } from './FadeInView';
import { AnimatedPressable } from './AnimatedPressable';
import { space } from '@/lib/theme';

interface Props {
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  index?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StatTile({ label, value, tone = 'primary', index = 0, onPress, style }: Props) {
  const content = (
    <Card style={[styles.tile, style]}>
      <Text variant="label" tone="tertiary">{label.toUpperCase()}</Text>
      <Text variant="statNumber" tone={tone} style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );

  return (
    <FadeInView index={index} style={{ width: '47%' }}>
      {onPress ? (
        <AnimatedPressable onPress={onPress} haptic="selection" scaleTo={0.97}>
          {content}
        </AnimatedPressable>
      ) : (
        content
      )}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minHeight: 92, justifyContent: 'space-between', gap: space.sm },
  value: { marginTop: 2 },
});
