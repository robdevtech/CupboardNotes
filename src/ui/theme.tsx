import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme, Appearance } from 'react-native';
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
  const hookScheme = useColorScheme();
  const preference = useSettingsStore((s) => s.themePreference);
  
  // Robust system color scheme detection:
  // 1. useColorScheme() can return null in Expo Go or on initial render
  // 2. Use Appearance.getColorScheme() as fallback to get current system preference
  // 3. Listen to Appearance changes to update when system theme changes
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark' | null>(() => {
    // Initialize with hookScheme if available, otherwise use Appearance API
    return hookScheme ?? Appearance.getColorScheme();
  });

  // Update systemScheme when hookScheme changes (normal React Native path)
  useEffect(() => {
    if (hookScheme !== null) {
      setSystemScheme(hookScheme);
    }
  }, [hookScheme]);

  // Add explicit Appearance listener for system theme changes
  // This ensures we catch changes even if useColorScheme() doesn't update
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  // Determine dark mode: explicit dark, or system preference when set to system
  // Default to light when system preference is null/unavailable
  const isDark =
    preference === 'dark' || (preference === 'system' && systemScheme === 'dark');

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
