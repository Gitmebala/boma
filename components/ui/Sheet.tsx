import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space } from '@/lib/theme';
import { Text } from './Text';
import { AnimatedPressable } from './AnimatedPressable';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Props {
  title: string;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  onClose?: () => void;
}

export const Sheet = forwardRef<BottomSheet, Props>(({ title, children, snapPoints, onClose }, ref) => {
  const { colors } = useTheme();
  const points = useMemo(() => snapPoints ?? ['62%', '92%'], [snapPoints]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} pressBehavior="close" />
    ),
    []
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={points}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.bgElevated }}
      handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}>
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text variant="h2">{title}</Text>
          <AnimatedPressable
            onPress={() => (ref as any)?.current?.close()}
            haptic="selection"
            style={[styles.closeBtn, { backgroundColor: colors.surfaceSunken }]}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </AnimatedPressable>
        </View>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
});

Sheet.displayName = 'Sheet';

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
