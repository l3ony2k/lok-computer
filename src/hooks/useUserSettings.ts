import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";

/**
 * Interface defining all user settings
 */
export interface UserSettings {
  wallpaper?: string;
  // Future additions:
  // windowState?: { [windowId: string]: WindowState };
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
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  setWallpaper: (url: string) => void;
  clearWallpaper: () => void;
}

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

/**
 * Provider component for user settings
 */
export function UserSettingsProvider({ children }: { children: ReactNode }) {
  // Load settings from localStorage on component mount
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);
      return storedSettings 
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) } 
        : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
      return DEFAULT_SETTINGS;
    }
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [settings]);

  /**
   * Update a specific setting
   */
  const updateSetting = <K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  /**
   * Set the wallpaper URL
   */
  const setWallpaper = (url: string) => {
    updateSetting('wallpaper', url);
  };

  /**
   * Clear the wallpaper (reset to default)
   */
  const clearWallpaper = () => {
    updateSetting('wallpaper', '');
  };

  const value = {
    settings,
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
 * Hook for accessing and modifying user settings with localStorage persistence
 */
export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  
  return context;
}
