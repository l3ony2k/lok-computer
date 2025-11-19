import React, { useState } from 'react';
import { useTheme } from "next-themes";
import { Sun, Moon, Computer, Image, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/hooks/useUserSettings";
import { WindowLayout } from "@/components/window/WindowLayout";
import { RetroButton } from "@/components/ui/RetroButton";

// Default wallpaper options
const DEFAULT_WALLPAPERS = [
  {
    name: "by @1000bytes.bsky.social",
    url: "https://d2w9rnfcy7mm78.cloudfront.net/36335972/original_8a4c77ea7ed077282b4653fad9183d57.jpg"
  },
  {
    name: "Ocean Waves",
    url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&auto=format&fit=crop"
  },
  {
    name: "Abstract Geometric",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop"
  },
  {
    name: "Retro Computer",
    url: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&auto=format&fit=crop"
  }
];

export const ConfigApp: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { settings, updateSetting } = useUserSettings();
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState("");
  const [customError, setCustomError] = useState("");

  const handleCustomWallpaper = () => {
    if (!customWallpaperUrl) {
      setCustomError("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(customWallpaperUrl);
      updateSetting('wallpaper', customWallpaperUrl);
      setCustomWallpaperUrl("");
      setCustomError("");
    } catch (e) {
      setCustomError("Invalid URL format");
    }
  };

  const setWallpaper = (url: string) => {
    updateSetting('wallpaper', url);
  };

  const clearWallpaper = () => {
    updateSetting('wallpaper', undefined);
  };

  return (
    <WindowLayout>
      <div className="p-4 space-y-6">
        {/* Theme Section */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center">
            <Sun className="w-5 h-5 mr-2" />
            Appearance
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <RetroButton
              active={theme === 'light'}
              onClick={() => setTheme('light')}
              className="flex flex-col items-center justify-center p-3 h-24"
            >
              <Sun className="w-6 h-6 mb-2" />
              <span>Light</span>
            </RetroButton>
            <RetroButton
              active={theme === 'dark'}
              onClick={() => setTheme('dark')}
              className="flex flex-col items-center justify-center p-3 h-24"
            >
              <Moon className="w-6 h-6 mb-2" />
              <span>Dark</span>
            </RetroButton>
            <RetroButton
              active={theme === 'system'}
              onClick={() => setTheme('system')}
              className="flex flex-col items-center justify-center p-3 h-24"
            >
              <Computer className="w-6 h-6 mb-2" />
              <span>System</span>
            </RetroButton>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Wallpaper Section */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center">
            <Image className="w-5 h-5 mr-2" />
            Wallpaper
          </h2>

          {/* Current Wallpaper Preview */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Current Wallpaper</h3>
              {settings.wallpaper && (
                <RetroButton
                  size="sm"
                  onClick={clearWallpaper}
                  className="text-xs h-6 px-2 text-destructive hover:text-destructive bg-transparent border-transparent hover:bg-muted"
                >
                  <X className="w-3 h-3 mr-1" />
                  Remove
                </RetroButton>
              )}
            </div>
            <div className="aspect-video w-full bg-muted rounded-md overflow-hidden border border-border relative">
              {settings.wallpaper ? (
                <div
                  className="w-full h-full bg-center bg-cover"
                  style={{ backgroundImage: `url("${settings.wallpaper}")` }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  Default Pattern
                </div>
              )}
            </div>
          </div>

          {/* Predefined wallpapers */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Preset Wallpapers</h3>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_WALLPAPERS.map((wallpaper) => (
                <button
                  key={wallpaper.url}
                  className={cn(
                    "border border-border p-1 h-20 overflow-hidden relative hover:opacity-90 transition-opacity",
                    settings.wallpaper === wallpaper.url && "border-primary border-2"
                  )}
                  onClick={() => setWallpaper(wallpaper.url)}
                  title={wallpaper.name}
                >
                  <div
                    className="w-full h-full bg-center bg-cover"
                    style={{ backgroundImage: `url("${wallpaper.url}")` }}
                  />
                  {settings.wallpaper === wallpaper.url && (
                    <CheckCircle className="w-4 h-4 absolute bottom-1 right-1 text-primary bg-white rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom wallpaper URL input */}
          <div>
            <h3 className="text-sm font-medium mb-1">Custom Wallpaper URL</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customWallpaperUrl}
                onChange={(e) => {
                  setCustomWallpaperUrl(e.target.value);
                  if (customError) setCustomError("");
                }}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-1 text-sm border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <RetroButton
                onClick={handleCustomWallpaper}
                className="px-3"
              >
                Set
              </RetroButton>
            </div>
            {customError && (
              <p className="text-xs text-destructive mt-1">{customError}</p>
            )}
          </div>
        </div>
      </div>
    </WindowLayout>
  );
};

export default ConfigApp;
