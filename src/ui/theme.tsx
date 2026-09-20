import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  danger: string;
  dangerSoft: string;
  chip: string;
  success: string;
  onPrimary: string;
  shadow: string;
}

const lightColors: ThemeColors = {
  bg: '#FBF8F2',
  surface: '#FFFEFB',
  surfaceRaised: '#FFFFFF',
  border: '#E7DED1',
  text: '#2B2118',
  textMuted: '#75685B',
  primary: '#B45309',
  primarySoft: '#FFF0D9',
  danger: '#B42318',
  dangerSoft: '#FDE8E7',
  chip: '#F3EDE4',
  success: '#2F855A',
  onPrimary: '#FFFFFF',
  shadow: '#6B4F35',
};

const darkColors: ThemeColors = {
  bg: '#171412',
  surface: '#241F1A',
  surfaceRaised: '#2D261F',
  border: '#493C30',
  text: '#F8EFE3',
  textMuted: '#C1B1A0',
  primary: '#F0A35B',
  primarySoft: '#49301E',
  danger: '#F58A83',
  dangerSoft: '#4A2422',
  chip: '#382F27',
  success: '#7ACB9B',
  onPrimary: '#2B1A0D',
  shadow: '#000000',
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

interface ThemeValue {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore((s) => s.themePreference);
  const isDark = preference === 'dark' || (preference === 'system' && systemScheme === 'dark');
  const value = useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      mode: preference,
      isDark,
    }),
    [isDark, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
}
