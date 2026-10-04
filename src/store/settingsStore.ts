import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { ThemeMode } from '../ui/theme';

const THEME_KEY = 'cupboard-notes.theme-preference';

interface SettingsState {
  themePreference: ThemeMode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setThemePreference: (preference: ThemeMode) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  themePreference: 'system',
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const saved = await SecureStore.getItemAsync(THEME_KEY);
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        set({ themePreference: saved });
      }
    } catch {
      // SecureStore may be unavailable in a web preview; system theme still works.
    } finally {
      set({ hydrated: true });
    }
  },

  async setThemePreference(preference) {
    set({ themePreference: preference });
    try {
      await SecureStore.setItemAsync(THEME_KEY, preference);
    } catch {
      // Keep the in-memory choice when persistence is unavailable.
    }
  },
}));
