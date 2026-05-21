import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BackgroundTheme = 'mountain' | 'racing' | 'climbing';

interface SettingsState {
  backgroundTheme: BackgroundTheme;
  setBackgroundTheme: (theme: BackgroundTheme) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      backgroundTheme: 'mountain', // default
      setBackgroundTheme: (theme) => set({ backgroundTheme: theme }),
    }),
    {
      name: 'app-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
