import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { getAppState, setAppState } from "@/lib/storage";

/**
 * Interface defining all user settings
 */
export interface OnekoSettings {
  enabled: boolean;
  hasBeenAsked: boolean;
  speed: number;
  variant: 'default' | 'dark';
}

export interface CrtSettings {
  enabled: boolean;
  scanlines: number; // 0-100 intensity
  flicker: number; // 0-100 intensity
  rgbOffset: number; // 0-100 intensity
  curvature: number; // 0-100 intensity
}

/** Off by default; a light touch on every slider once someone turns it on. */
export const DEFAULT_CRT_SETTINGS: CrtSettings = {
  enabled: false,
  scanlines: 10,
  flicker: 10,
  rgbOffset: 10,
  curvature: 10,
};

export interface DebugSettings {
  verboseCacheLogging: boolean;
}

export interface OobeSettings {
  completed: boolean;
}

export interface UserSettings {
  wallpaper?: string;
  oneko?: OnekoSettings;
  crt?: CrtSettings;
  debug?: DebugSettings;
  oobe?: OobeSettings;
}

// Default settings to use if nothing is stored
const DEFAULT_SETTINGS: UserSettings = {
  wallpaper: '',
  debug: {
    verboseCacheLogging: false,
  },
};

// Storage key for all user settings
const STORAGE_KEY = 'userSettings';
// Sliders (CRT, Oneko speed) fire on every pointer move; one write per pause is plenty.
const SAVE_DEBOUNCE_MS = 150;

interface UserSettingsContextValue {
  settings: UserSettings;
  isLoading: boolean;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

/**
 * Provider component for user settings, persisted to IndexedDB via storage.ts.
 */
export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from IndexedDB on mount
  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const stored = await getAppState<UserSettings>(STORAGE_KEY);
        if (!mounted) return;

        if (stored) {
          setSettings({ ...DEFAULT_SETTINGS, ...stored });
          return;
        }

        // Migrate from localStorage if exists
        try {
          const legacyData = localStorage.getItem(STORAGE_KEY);
          if (legacyData) {
            const parsed = JSON.parse(legacyData);
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            await setAppState(STORAGE_KEY, parsed);
            localStorage.removeItem(STORAGE_KEY);
            console.info('[UserSettings] Migrated from localStorage to IndexedDB');
          }
        } catch (e) {
          console.warn('[UserSettings] Failed to migrate from localStorage:', e);
        }
      } catch (error) {
        console.error('[UserSettings] Failed to load settings:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  // Save settings to IndexedDB whenever they change (debounced; skipped until loaded)
  useEffect(() => {
    if (isLoading) return;
    const timeout = setTimeout(() => {
      setAppState(STORAGE_KEY, settings).catch((error) => {
        console.error('[UserSettings] Failed to save settings:', error);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [settings, isLoading]);

  useEffect(() => {
    document.documentElement.dataset.verboseCacheLogging = String(
      settings.debug?.verboseCacheLogging ?? false
    );
  }, [settings.debug?.verboseCacheLogging]);

  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const value = React.useMemo(() => ({ settings, isLoading, updateSetting }), [settings, isLoading, updateSetting]);

  return React.createElement(
    UserSettingsContext.Provider,
    { value },
    children
  );
}

/**
 * Hook for accessing and modifying user settings with IndexedDB persistence
 */
export function useUserSettings() {
  const context = useContext(UserSettingsContext);

  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }

  return context;
}
