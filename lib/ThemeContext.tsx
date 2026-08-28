import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { palettes, ThemeColors } from './theme';

interface ThemeCtx {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeCtx>({ colors: palettes.light, scheme: 'light' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useRNColorScheme();
  // Modern Homestead is a light-first system — dark is the deliberate
  // alternate, not the default.
  const scheme: 'light' | 'dark' = system === 'dark' ? 'dark' : 'light';
  const value = useMemo(() => ({ colors: palettes[scheme], scheme }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
