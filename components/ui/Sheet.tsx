import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetFooter,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { radius, space, layout, elevation } from '@/lib/theme';
import { Text } from './Text';
import { AnimatedPressable } from './AnimatedPressable';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  onClose?: () => void;
  /**
   * Primary action, pinned above the fold.
   *
   * The tab bar floats over everything in a tab screen, including this sheet,
   * so an action left at the bottom of the scrolling content gets covered —
   * that's what hid "Save sale". Anything passed here is rendered in a fixed
   * footer that clears the bar.
   */
  footer?: React.ReactNode;
  /** Set false when the content is short enough not to need scrolling. */
  scrollable?: boolean;
}

export const Sheet = forwardRef<BottomSheet, Props>(
  ({ title, subtitle, children, snapPoints, onClose, footer, scrollable = true }, ref) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const points = useMemo(() => snapPoints ?? ['62%', '92%'], [snapPoints]);

    // Room for the footer plus the floating tab bar underneath it.
    const footerHeight = footer ? 76 : 0;
    const contentBottomPad = footerHeight + layout.tabBarClearance + insets.bottom;

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} pressBehavior="close" />
      ),
      []
    );

    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) =>
        footer ? (
          <BottomSheetFooter {...props} bottomInset={layout.tabBarClearance + insets.bottom}>
            <View
              style={[
                styles.footer,
                {
                  backgroundColor: colors.bgElevated,
                  borderTopColor: colors.borderFaint,
                  ...elevation(2, colors.shadow),
                },
              ]}>
              {footer}
            </View>
          </BottomSheetFooter>
        ) : null,
      [footer, colors, insets.bottom]
    );

    const header = (
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="h2">{title}</Text>
          {subtitle ? (
            <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
        <AnimatedPressable
          onPress={() => (ref as any)?.current?.close()}
          haptic="selection"
          accessibilityLabel="Close"
          style={[styles.closeBtn, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </AnimatedPressable>
      </View>
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={points}
        enablePanDownToClose
        onClose={onClose}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        footerComponent={footer ? renderFooter : undefined}
        backgroundStyle={{ backgroundColor: colors.bgElevated }}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong, width: 40 }}>
        {scrollable ? (
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.container, { paddingBottom: contentBottomPad }]}>
            {header}
            {children}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetView style={[styles.container, { paddingBottom: contentBottomPad }]}>
            {header}
            {children}
          </BottomSheetView>
        )}
      </BottomSheet>
    );
  }
);

Sheet.displayName = 'Sheet';

const styles = StyleSheet.create({
  container: { paddingHorizontal: space.gutter, paddingTop: space.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  footer: {
    paddingHorizontal: space.gutter,
    paddingTop: space.md,
    paddingBottom: space.md,
    borderTopWidth: 1,
  },
});
