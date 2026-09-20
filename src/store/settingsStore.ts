import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { ThemeMode } from '../ui/theme';
import type { CloudProviderId } from '../cloud/CloudStorageAdapter';

const THEME_KEY = 'cupboard-notes.theme-preference';

interface SettingsState {
  enabledProviders: CloudProviderId[];
  themePreference: ThemeMode;
  hydrated: boolean;
  toggleProvider: (id: CloudProviderId) => void;
  setEnabled: (ids: CloudProviderId[]) => void;
  hydrate: () => Promise<void>;
  setThemePreference: (preference: ThemeMode) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  enabledProviders: [],
  themePreference: 'system',
  hydrated: false,

  toggleProvider(id) {
    const cur = get().enabledProviders;
    if (cur.includes(id)) {
      set({ enabledProviders: cur.filter((x) => x !== id) });
    } else {
      set({ enabledProviders: [...cur, id] });
    }
  },

  setEnabled(ids) {
    set({ enabledProviders: ids });
  },

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
