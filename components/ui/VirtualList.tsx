import React from 'react';
import { FlatList, FlatListProps, RefreshControl } from 'react-native';
import { useTheme, useTabBarClearance } from '@/lib/ThemeContext';
import { space } from '@/lib/theme';

/**
 * The virtualized counterpart to ScreenScroll.
 *
 * An audit found only 1 of 40 screens using a FlatList — everywhere else
 * rendered every row via `.map()` inside a plain ScrollView, so a farm with
 * a few hundred expenses or tasks mounted every single row before the
 * screen could even paint. On the 4GB-RAM Android phones this app targets,
 * that's the actual source of the jank, not a styling problem.
 *
 * This wraps FlatList with the same tab-bar clearance and gutter padding
 * ScreenScroll already gives non-virtualized screens, so converting a
 * screen doesn't mean re-deriving that layout by hand.
 *
 * Tuning: RN's own default windowSize (21) keeps far more offscreen rows
 * mounted than a farm record list ever needs — halved here, along with a
 * conservative batch size, so memory stays low without visibly changing
 * how the list feels to scroll.
 */
export function ScreenList<T>({
  tabBar = true,
  refreshing,
  onRefresh,
  extraBottom = 0,
  gutter = true,
  contentContainerStyle,
  ...rest
}: {
  tabBar?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  extraBottom?: number;
  gutter?: boolean;
} & Omit<FlatListProps<T>, 'refreshControl'>) {
  const { colors } = useTheme();
  const clearance = useTabBarClearance(extraBottom);

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        gutter ? { paddingHorizontal: space.gutter } : undefined,
        { paddingBottom: tabBar ? clearance : space.xxl + extraBottom },
        contentContainerStyle,
      ]}
      // Conservative for low-end Android: fewer offscreen rows kept mounted
      // than RN's default, at no visible cost to scroll feel at this list
      // size (dozens to low hundreds of rows, not thousands).
      windowSize={7}
      maxToRenderPerBatch={8}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      removeClippedSubviews
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        ) : undefined
      }
      {...rest}
    />
  );
}

/**
 * Entrance-stagger index capped for use inside a FlatList renderItem.
 *
 * FadeInView's delay is `index * 40ms`. That reads fine for the handful of
 * rows visible on first paint, but a row that mounts later — because the
 * farmer scrolled to it, not because the screen just opened — would
 * otherwise wait on a delay computed from its real list position (row 80
 * waiting 3.2s to fade in), appearing to pop in late while scrolling. Capping
 * the index keeps the same settle feel for the first screenful and makes
 * every row after that appear immediately, which is what scrolling to it
 * already implies.
 */
export function capStaggerIndex(index: number, max = 8): number {
  return Math.min(index, max);
}
