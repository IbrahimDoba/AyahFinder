/**
 * Settings Store
 * Manages app settings like translation toggle and notification preferences
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  scheduleReadingReminder,
  cancelReadingReminder,
} from '@/services/notifications/NotificationService';

const SETTINGS_KEY = '@ayahfinder:settings';

interface SettingsState {
  // Settings
  showTranslation: boolean;

  // Notification preferences
  pushToken: string | null;
  ayahOfDayEnabled: boolean;
  readingReminderEnabled: boolean;
  readingReminderHour: number;   // 0-23 in local time
  readingReminderMinute: number; // 0-59

  // Actions
  toggleTranslation: () => void;
  setShowTranslation: (value: boolean) => void;
  setPushToken: (token: string | null) => void;
  setAyahOfDayEnabled: (value: boolean) => void;
  setReadingReminderEnabled: (value: boolean) => void;
  setReadingReminderTime: (hour: number, minute: number) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Defaults
  showTranslation: true,
  pushToken: null,
  ayahOfDayEnabled: true,
  readingReminderEnabled: false,
  readingReminderHour: 7,
  readingReminderMinute: 0,

  toggleTranslation: () => {
    const newValue = !get().showTranslation;
    set({ showTranslation: newValue });
    _persist(get());
  },

  setShowTranslation: (value: boolean) => {
    set({ showTranslation: value });
    _persist(get());
  },

  setPushToken: (token: string | null) => {
    set({ pushToken: token });
    _persist(get());
  },

  setAyahOfDayEnabled: (value: boolean) => {
    set({ ayahOfDayEnabled: value });
    _persist(get());
  },

  setReadingReminderEnabled: (value: boolean) => {
    set({ readingReminderEnabled: value });
    _persist(get());
    const { readingReminderHour, readingReminderMinute } = get();
    if (value) {
      scheduleReadingReminder(readingReminderHour, readingReminderMinute).catch(console.error);
    } else {
      cancelReadingReminder().catch(console.error);
    }
  },

  setReadingReminderTime: (hour: number, minute: number) => {
    set({ readingReminderHour: hour, readingReminderMinute: minute });
    _persist(get());
    if (get().readingReminderEnabled) {
      scheduleReadingReminder(hour, minute).catch(console.error);
    }
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          showTranslation: parsed.showTranslation ?? true,
          pushToken: parsed.pushToken ?? null,
          ayahOfDayEnabled: parsed.ayahOfDayEnabled ?? true,
          readingReminderEnabled: parsed.readingReminderEnabled ?? false,
          readingReminderHour: parsed.readingReminderHour ?? 7,
          readingReminderMinute: parsed.readingReminderMinute ?? 0,
        });

        // Re-schedule reading reminder if it was enabled
        if (parsed.readingReminderEnabled) {
          scheduleReadingReminder(
            parsed.readingReminderHour ?? 7,
            parsed.readingReminderMinute ?? 0
          ).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },
}));

function _persist(state: SettingsState) {
  const toSave = {
    showTranslation: state.showTranslation,
    pushToken: state.pushToken,
    ayahOfDayEnabled: state.ayahOfDayEnabled,
    readingReminderEnabled: state.readingReminderEnabled,
    readingReminderHour: state.readingReminderHour,
    readingReminderMinute: state.readingReminderMinute,
  };
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave)).catch(console.error);
}

// Hook to initialize settings on app start
export const useInitializeSettings = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  
  useEffect(() => {
    loadSettings().then(() => setIsInitialized(true));
  }, [loadSettings]);
  
  return isInitialized;
};
