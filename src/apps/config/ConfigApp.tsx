import { useTheme } from "next-themes";
import { Sun, Moon, Computer, Image, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useState } from "react";

// Default wallpaper options
const DEFAULT_WALLPAPERS = [
  {
    name: "Mountain Landscape",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop"
  },
  {
    name: "Ocean Waves",
    url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&auto=format&fit=crop"
  },
  {
    name: "Forest",
    url: "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&auto=format&fit=crop"
  },
  {
    name: "Geometric Pattern",
    url: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=800&auto=format&fit=crop"
  }
];

export const ConfigApp = () => {
  const { theme, setTheme } = useTheme();
  const { settings, setWallpaper, clearWallpaper } = useUserSettings();
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState("");
  const [customError, setCustomError] = useState("");

  // Ensure theme is one of the expected values, default to 'system' if not
  const currentTheme = ['light', 'dark', 'system'].includes(theme ?? '') ? theme : 'system';

  // Handle custom wallpaper URL input
  const handleCustomWallpaper = () => {
    if (!customWallpaperUrl.trim()) {
      setCustomError("Please enter a valid URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(customWallpaperUrl);
      setCustomError("");
      setWallpaper(customWallpaperUrl);
      setCustomWallpaperUrl(""); // Clear the input after setting
    } catch (e) {
      setCustomError("Please enter a valid URL");
    }
  };

  return (
    <div className="p-4 overflow-auto window-content-area">
      <div className="space-y-6">
        {/* Theme Selection */}
        <div>
          <h2 className="font-medium mb-2">Theme</h2>
          <div className="flex space-x-2">
            <button 
              className={cn(
                "retro-button p-2 flex items-center",
                currentTheme === 'light' && "bg-accent text-accent-foreground"
              )}
              onClick={() => setTheme('light')}
              title="Light Mode"
            >
              <Sun className="w-4 h-4 mr-2" />
              <span className="text-sm">Light</span>
            </button>
            <button 
              className={cn(
                "retro-button p-2 flex items-center",
                currentTheme === 'dark' && "bg-accent text-accent-foreground"
              )}
              onClick={() => setTheme('dark')}
              title="Dark Mode"
            >
              <Moon className="w-4 h-4 mr-2" />
              <span className="text-sm">Dark</span>
            </button>
            <button 
              className={cn(
                "retro-button p-2 flex items-center",
                currentTheme === 'system' && "bg-accent text-accent-foreground"
              )}
              onClick={() => setTheme('system')}
              title="System Default"
            >
              <Computer className="w-4 h-4 mr-2" />
              <span className="text-sm">System</span>
            </button>
          </div>
        </div>

        {/* Wallpaper Selection */}
        <div>
          <h2 className="font-medium mb-2">Desktop Wallpaper</h2>
          
          {/* Current wallpaper display/preview */}
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Current:</span>
              <button 
                className="retro-button p-1 flex items-center text-xs"
                onClick={clearWallpaper}
                title="Reset to Default"
              >
                <X className="w-3 h-3 mr-1" />
                <span>Reset</span>
              </button>
            </div>
            <div className="mt-1 border border-border overflow-hidden h-20 bg-black">
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
                    "border border-border p-1 h-20 overflow-hidden relative",
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
                className="flex-1 search-input text-xs"
              />
              <button 
                className="retro-button p-1 flex items-center"
                onClick={handleCustomWallpaper}
              >
                <Image className="w-4 h-4 mr-1" />
                <span className="text-xs">Set</span>
              </button>
            </div>
            {customError && (
              <p className="text-xs text-destructive mt-1">{customError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
