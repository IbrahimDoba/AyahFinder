/**
 * Settings Store
 * Manages app settings like translation toggle
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const SETTINGS_KEY = '@ayahfinder:settings';

interface SettingsState {
  // Settings
  showTranslation: boolean;
  
  // Actions
  toggleTranslation: () => void;
  setShowTranslation: (value: boolean) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Default: show translation
  showTranslation: true,
  
  // Toggle translation on/off
  toggleTranslation: () => {
    const newValue = !get().showTranslation;
    set({ showTranslation: newValue });
    // Persist to storage
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ showTranslation: newValue })).catch(console.error);
  },
  
  // Set translation directly
  setShowTranslation: (value: boolean) => {
    set({ showTranslation: value });
    // Persist to storage
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ showTranslation: value })).catch(console.error);
  },
  
  // Load settings from storage
  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.showTranslation === 'boolean') {
          set({ showTranslation: parsed.showTranslation });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },
}));

// Hook to initialize settings on app start
export const useInitializeSettings = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  
  useEffect(() => {
    loadSettings().then(() => setIsInitialized(true));
  }, [loadSettings]);
  
  return isInitialized;
};
