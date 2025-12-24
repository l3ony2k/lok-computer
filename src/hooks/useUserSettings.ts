import React, { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from "react";
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

export interface UserSettings {
  wallpaper?: string;
  oneko?: OnekoSettings;
}

// Default settings to use if nothing is stored
const DEFAULT_SETTINGS: UserSettings = {
  wallpaper: '',
};

// Storage key for all user settings
const STORAGE_KEY = 'userSettings';

// Create the context with a default value
interface UserSettingsContextValue {
  settings: UserSettings;
  isLoading: boolean;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  setWallpaper: (url: string) => void;
  clearWallpaper: () => void;
}

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

/**
 * Provider component for user settings
 * Now uses IndexedDB via storage.ts for persistence
 */
export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  // Load settings from IndexedDB on mount
  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        // Try IndexedDB first
        const stored = await getAppState<UserSettings>(STORAGE_KEY);

        if (mounted) {
          if (stored) {
            setSettings({ ...DEFAULT_SETTINGS, ...stored });
          } else {
            // Migrate from localStorage if exists
            try {
              const legacyData = localStorage.getItem(STORAGE_KEY);
              if (legacyData) {
                const parsed = JSON.parse(legacyData);
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
                // Save to IndexedDB and clear localStorage
                await setAppState(STORAGE_KEY, parsed);
                localStorage.removeItem(STORAGE_KEY);
                console.info('[UserSettings] Migrated from localStorage to IndexedDB');
              }
            } catch (e) {
              console.warn('[UserSettings] Failed to migrate from localStorage:', e);
            }
          }
        }
      } catch (error) {
        console.error('[UserSettings] Failed to load settings:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
          isInitialLoad.current = false;
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  // Save settings to IndexedDB whenever they change (skip initial load)
  useEffect(() => {
    if (isInitialLoad.current || isLoading) {
      return;
    }

    const saveSettings = async () => {
      try {
        await setAppState(STORAGE_KEY, settings);
      } catch (error) {
        console.error('[UserSettings] Failed to save settings:', error);
      }
    };

    saveSettings();
  }, [settings, isLoading]);

  /**
   * Update a specific setting
   */
  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  /**
   * Set the wallpaper URL
   */
  const setWallpaper = useCallback((url: string) => {
    updateSetting('wallpaper', url);
  }, [updateSetting]);

  /**
   * Clear the wallpaper (reset to default)
   */
  const clearWallpaper = useCallback(() => {
    updateSetting('wallpaper', '');
  }, [updateSetting]);

  const value = {
    settings,
    isLoading,
    updateSetting,
    setWallpaper,
    clearWallpaper,
  };

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
