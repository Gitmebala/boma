import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Modal, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Screen, ScreenScroll, ScreenHeader } from '@/components/ui/Screen';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FadeInView } from '@/components/ui/FadeInView';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/lib/ThemeContext';
import { useFarm } from '@/lib/FarmContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatShortDate, formatKES } from '@/lib/format';
import { captureReceipt, uploadReceipt, signReceiptUrls } from '@/lib/receipts';
import { space, radius } from '@/lib/theme';

interface ReceiptRow {
  id: string;
  related_table: string;
  related_id: string | null;
  description: string | null;
  amount: number | null;
  file_url: string;
  uploaded_at: string;
}

const COLUMNS = 2;
const GRID_GAP = space.md;

export default function ReceiptsScreen() {
  const { colors } = useTheme();
  const { farm } = useFarm();
  const { session } = useAuth();

  const [rows, setRows] = useState<ReceiptRow[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<ReceiptRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!farm) return;
    const { data } = await supabase
      .from('receipts')
      .select('*')
      .eq('farm_id', farm.id)
      .order('uploaded_at', { ascending: false });

    const list = (data as ReceiptRow[]) ?? [];
    setRows(list);
    // One batch call signs every thumbnail on the screen.
    setUrls(await signReceiptUrls(list.map((r) => r.file_url)));
  }, [farm?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const add = (source: 'camera' | 'library') => {
    if (!farm) return;
    (async () => {
      const picked = await captureReceipt(source);
      if (!picked.ok) {
        if (picked.reason === 'permission') {
          Alert.alert('Permission needed', 'Boma needs access to add a receipt photo.');
        }
        return;
      }

      setUploading(true);
      const result = await uploadReceipt({
        farmId: farm.id,
        userId: session?.user?.id,
        asset: picked.asset,
        relatedTable: 'general',
        description: null,
      });
      setUploading(false);

      if (!result.ok) {
        Alert.alert('Upload failed', result.error);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    })();
  };

  const chooseSource = () => {
    Haptics.selectionAsync();
    Alert.alert('Add a receipt', undefined, [
      { text: 'Take a photo', onPress: () => add('camera') },
      { text: 'Choose from gallery', onPress: () => add('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const width = Dimensions.get('window').width;
  const tileSize = (width - space.gutter * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <Screen>
      <ScreenHeader
        title="Receipts"
        subtitle={rows?.length ? `${rows.length} stored` : 'Proof of what you spent'}
        right={
          <AnimatedPressable
            onPress={chooseSource}
            haptic="light"
            accessibilityLabel="Add receipt"
            disabled={uploading}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}>
            {uploading ? (
              <ActivityIndicator color={colors.accentText} size="small" />
            ) : (
              <Ionicons name="add" size={22} color={colors.accentText} />
            )}
          </AnimatedPressable>
        }
      />

      <ScreenScroll refreshing={refreshing} onRefresh={onRefresh}>
        {rows === null ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width={tileSize as any} height={tileSize} />
            ))}
          </View>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="camera-outline"
            title="No receipts yet"
            body="Photograph a receipt and it's stored here for good — useful when a buyer disputes a price, or a lender asks what you spent."
            actionLabel="Add a receipt"
            onAction={chooseSource}
          />
        ) : (
          <View style={styles.grid}>
            {rows.map((r, i) => (
              <FadeInView key={r.id} index={i}>
                <AnimatedPressable
                  onPress={() => setViewing(r)}
                  haptic="selection"
                  scaleTo={0.97}
                  accessibilityLabel={r.description ?? 'Receipt'}>
                  <View
                    style={[
                      styles.tile,
                      { width: tileSize, height: tileSize, backgroundColor: colors.surfaceSunken, borderColor: colors.border },
                    ]}>
                    {urls[r.file_url] ? (
                      <Image
                        source={{ uri: urls[r.file_url] }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={180}
                      />
                    ) : (
                      <Ionicons name="document-text-outline" size={26} color={colors.textQuiet} />
                    )}

                    {/* Caption sits on a scrim so it stays readable over any
                        photo, light or dark. */}
                    <View style={[styles.tileFoot, { backgroundColor: colors.overlay }]}>
                      <Text variant="micro" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                        {r.description || (r.related_table === 'general' ? 'Receipt' : r.related_table)}
                      </Text>
                      <Text variant="micro" style={{ color: 'rgba(255,255,255,0.75)' }} numberOfLines={1}>
                        {formatShortDate(r.uploaded_at)}
                        {r.amount ? ` · ${formatKES(r.amount)}` : ''}
                      </Text>
                    </View>
                  </View>
                </AnimatedPressable>
              </FadeInView>
            ))}
          </View>
        )}
      </ScreenScroll>

      <ReceiptViewer receipt={viewing} url={viewing ? urls[viewing.file_url] : undefined} onClose={() => setViewing(null)} />
    </Screen>
  );
}

function ReceiptViewer({
  receipt,
  url,
  onClose,
}: {
  receipt: ReceiptRow | null;
  url?: string;
  onClose: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Modal visible={!!receipt} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewerBackdrop}>
        <AnimatedPressable
          onPress={onClose}
          haptic="selection"
          accessibilityLabel="Close"
          style={styles.viewerClose}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </AnimatedPressable>

        {url ? (
          <Image source={{ uri: url }} style={styles.viewerImage} contentFit="contain" transition={180} />
        ) : (
          <ActivityIndicator color="#FFFFFF" />
        )}

        {receipt ? (
          <View style={styles.viewerMeta}>
            <Text variant="bodyMed" style={{ color: '#FFFFFF' }}>
              {receipt.description || 'Receipt'}
            </Text>
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {formatShortDate(receipt.uploaded_at)}
              {receipt.amount ? ` · ${formatKES(receipt.amount)}` : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  tile: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.sm },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 56,
    right: space.xl,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  viewerImage: { width: '92%', height: '72%' },
  viewerMeta: { position: 'absolute', bottom: 56, left: space.xl, right: space.xl },
});
