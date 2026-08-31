import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes, ThemeColors, SchemeName, layout } from './theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'boma.theme-preference';

interface ThemeCtx {
  colors: ThemeColors;
  scheme: SchemeName;
  /** What the user chose — 'system' means follow the OS. */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  colors: palettes.light,
  scheme: 'light',
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useRNColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  // Restore the saved choice. Until it lands we follow the OS, which is the
  // same thing the vast majority of users end up on anyway — so there's no
  // visible flash for them.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const scheme: SchemeName =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({ colors: palettes[scheme], scheme, preference, setPreference }),
    [scheme, preference, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/**
 * Bottom padding a scrollable screen needs so its last row clears the floating
 * tab bar. Every tab screen must use this — hardcoded guesses are what buried
 * "Help & support" and the sheet's Save button in v1.
 */
export function useTabBarClearance(extra = 0) {
  const insets = useSafeAreaInsets();
  return layout.tabBarClearance + Math.max(insets.bottom, 0) + extra;
}
