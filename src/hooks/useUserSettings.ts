import { useState, useEffect } from "react";

/**
 * Interface defining all user settings
 */
export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  wallpaper?: string;
  // Future additions:
  // windowState?: { [windowId: string]: WindowState };
}

// Default settings to use if nothing is stored
const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  wallpaper: '',
};

// Storage key for all user settings
const STORAGE_KEY = 'userSettings';

/**
 * Hook for accessing and modifying user settings with localStorage persistence
 */
export function useUserSettings() {
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

  return {
    settings,
    updateSetting,
    setWallpaper,
    clearWallpaper,
  };
}
