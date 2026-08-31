import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useTheme } from '@/lib/ThemeContext';
import { captureReceipt, ReceiptAsset } from '@/lib/receipts';
import { space, radius } from '@/lib/theme';

/**
 * Attach-a-photo control.
 *
 * Controlled and upload-free: it only *picks*. The caller uploads once it has
 * the id of the thing the receipt belongs to, so a receipt is never orphaned
 * from its expense.
 */
export function ReceiptAttach({
  value,
  onChange,
  label = 'Receipt photo',
  hint = 'Snap the paper receipt so you can prove this cost later.',
}: {
  value: ReceiptAsset | null;
  onChange: (a: ReceiptAsset | null) => void;
  label?: string;
  hint?: string;
}) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    setBusy(true);
    const res = await captureReceipt(source);
    setBusy(false);

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onChange(res.asset);
      return;
    }
    if (res.reason === 'permission') {
      // Denying once is permanent until they change it in Settings, so point
      // them there rather than silently doing nothing.
      Alert.alert(
        source === 'camera' ? 'Camera access needed' : 'Photo access needed',
        `Boma needs permission to ${source === 'camera' ? 'use the camera' : 'open your photos'} to attach a receipt.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ]
      );
    } else if (res.reason === 'unreadable') {
      Alert.alert('Could not read that image', 'Try taking the photo again.');
    }
  };

  const choose = () => {
    Haptics.selectionAsync();
    Alert.alert('Add a receipt', undefined, [
      { text: 'Take a photo', onPress: () => pick('camera') },
      { text: 'Choose from gallery', onPress: () => pick('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (value) {
    return (
      <View style={{ marginBottom: space.lg }}>
        <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>
          {label.toUpperCase()}
        </Text>
        <View style={[styles.preview, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}>
          <Image source={{ uri: value.uri }} style={styles.thumb} contentFit="cover" transition={150} />
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Text variant="bodyMed">Receipt attached</Text>
            <Text variant="caption" tone="tertiary">
              {value.fileSize ? `${Math.round(value.fileSize / 1024)} KB` : 'Ready to upload'}
            </Text>
          </View>
          <AnimatedPressable
            onPress={() => {
              Haptics.selectionAsync();
              onChange(null);
            }}
            haptic="light"
            accessibilityLabel="Remove receipt"
            style={[styles.removeBtn, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: space.lg }}>
      <Text variant="label" tone="secondary" style={{ marginBottom: space.sm }}>
        {label.toUpperCase()}
      </Text>
      <AnimatedPressable onPress={choose} haptic="light" scaleTo={0.99} disabled={busy}>
        <View style={[styles.empty, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSunken }]}>
          {busy ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="camera-outline" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: space.md }}>
                <Text variant="bodyMed">Add a photo</Text>
                <Text variant="caption" tone="tertiary">{hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textQuiet} />
            </>
          )}
        </View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 68,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
