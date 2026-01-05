import React, { useState, useEffect } from 'react';
import { useTheme } from "next-themes";
import { Sun, Moon, Computer, Image, CheckCircle, X, Database, Trash2, RefreshCw, Cat, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/hooks/useUserSettings";
import { WindowLayout } from "@/components/window/WindowLayout";
import { RetroButton } from "@/components/ui/RetroButton";
import { clearCache, getUsageStats, resetUsageStats, type UsageStats } from "@/lib/storage";
import { toast } from "sonner";
import onekoDefault from '@/assets/oneko.gif';
import onekoDark from '@/assets/oneko-dark.gif';

// Default wallpaper options
const DEFAULT_WALLPAPERS = [
  {
    name: "by @1000bytes.bsky.social",
    url: "https://d2w9rnfcy7mm78.cloudfront.net/36335972/original_8a4c77ea7ed077282b4653fad9183d57.jpg"
  },
  {
    name: "Ocean Waves",
    url: "https://images.unsplash.com/photo-1484387436194-cf7cb70800ce?w=1280&auto=format&fit=crop"
  },
  {
    name: "Abstract Geometric",
    url: "https://images.unsplash.com/photo-1605106702734-205df224ecce?w=1280&auto=format&fit=crop"
  },
  {
    name: "Retro Computer",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1280&auto=format&fit=crop"
  }
];

export const ConfigApp: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { settings, updateSetting } = useUserSettings();
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState("");
  const [customError, setCustomError] = useState("");
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClearCache, setConfirmClearCache] = useState(false);
  const [confirmResetStats, setConfirmResetStats] = useState(false);

  // Load usage stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getUsageStats();
        setStats(data);
      } catch (error) {
        console.error('[ConfigApp] Failed to load stats:', error);
      }
    };
    loadStats();
  }, []);

  const handleClearCache = async () => {
    if (!confirmClearCache) {
      setConfirmClearCache(true);
      return;
    }
    setIsClearing(true);
    try {
      await clearCache();
      toast.success('Cache cleared successfully');
      // Refresh stats
      const data = await getUsageStats();
      setStats(data);
    } catch (error) {
      console.error('[ConfigApp] Failed to clear cache:', error);
      toast.error('Failed to clear cache');
    } finally {
      setIsClearing(false);
      setConfirmClearCache(false);
    }
  };

  const handleClearCacheBlur = () => {
    setTimeout(() => {
      setConfirmClearCache(false);
    }, 150);
  };

  const handleResetStats = async () => {
    if (!confirmResetStats) {
      setConfirmResetStats(true);
      return;
    }
    setIsClearing(true);
    try {
      await resetUsageStats();
      const data = await getUsageStats();
      setStats(data);
      toast.success('Statistics reset');
    } catch (error) {
      console.error('[ConfigApp] Failed to reset stats:', error);
      toast.error('Failed to reset statistics');
    } finally {
      setIsClearing(false);
      setConfirmResetStats(false);
    }
  };

  const handleResetStatsBlur = () => {
    setTimeout(() => {
      setConfirmResetStats(false);
    }, 150);
  };

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
    <WindowLayout hasPadding={false}>
      <div className="p-4 space-y-6 max-w-lg mx-auto">
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
              className="flex flex-row items-center justify-center items-center p-3 h-18 gap-2"
            >
              <Sun className="w-5 h-5" />
              <span>Light</span>
            </RetroButton>
            <RetroButton
              active={theme === 'dark'}
              onClick={() => setTheme('dark')}
              className="flex flex-row items-center justify-center items-center p-3 h-18 gap-2"
            >
              <Moon className="w-5 h-5" />
              <span>Dark</span>
            </RetroButton>
            <RetroButton
              active={theme === 'system'}
              onClick={() => setTheme('system')}
              className="flex flex-row items-center justify-center items-center p-3 h-18 gap-2"
            >
              <Computer className="w-5 h-5" />
              <span>System</span>
            </RetroButton>
          </div>
        </div>

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
            <div className="aspect-video w-full bg-muted overflow-hidden border border-border relative">
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
                    "border border-border p-1 aspect-video overflow-hidden relative hover:opacity-90 transition-opacity",
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
                    <CheckCircle className="w-4 h-4 absolute bottom-1 right-1 text-primary" />
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

        {/* Oneko Cat Section */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center">
            <Cat className="w-5 h-5 mr-2" />
            Oneko Cat
          </h2>

          {/* Enable/Disable Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.oneko?.enabled ?? false}
                onChange={(e) => updateSetting('oneko', {
                  ...settings.oneko,
                  enabled: e.target.checked,
                  hasBeenAsked: true,
                  speed: settings.oneko?.speed ?? 10,
                  variant: settings.oneko?.variant ?? 'default',
                })}
                className="w-4 h-4"
              />
              <span className="text-sm">Enable cat cursor follower</span>
            </label>
          </div>

          {/* Speed Slider */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Speed: {settings.oneko?.speed ?? 10}</h3>
            <input
              type="range"
              min="1"
              max="20"
              value={settings.oneko?.speed ?? 10}
              onChange={(e) => updateSetting('oneko', {
                ...settings.oneko,
                enabled: settings.oneko?.enabled ?? false,
                hasBeenAsked: settings.oneko?.hasBeenAsked ?? true,
                speed: parseInt(e.target.value),
                variant: settings.oneko?.variant ?? 'default',
              })}
              className="w-full"
            />
          </div>

          {/* Variant Selector */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Cat Variant</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={cn(
                  "p-2 border border-border flex flex-col items-center gap-1",
                  (settings.oneko?.variant ?? 'default') === 'default' && "border-primary border-2"
                )}
                onClick={() => updateSetting('oneko', {
                  ...settings.oneko,
                  enabled: settings.oneko?.enabled ?? false,
                  hasBeenAsked: settings.oneko?.hasBeenAsked ?? true,
                  speed: settings.oneko?.speed ?? 10,
                  variant: 'default',
                })}
              >
                <div
                  className="w-8 h-8"
                  style={{
                    backgroundImage: `url(${onekoDefault})`,
                    backgroundPosition: '-96px -96px', // Idle sprite position (-3 * 32, -3 * 32)
                    imageRendering: 'pixelated',
                  }}
                />
                <span className="text-xs">white</span>
                {(settings.oneko?.variant ?? 'default') === 'default' && (
                  <CheckCircle className="w-4 h-4 text-primary" />
                )}
              </button>
              <button
                className={cn(
                  "p-2 border border-border flex flex-col items-center gap-1",
                  settings.oneko?.variant === 'dark' && "border-primary border-2"
                )}
                onClick={() => updateSetting('oneko', {
                  ...settings.oneko,
                  enabled: settings.oneko?.enabled ?? false,
                  hasBeenAsked: settings.oneko?.hasBeenAsked ?? true,
                  speed: settings.oneko?.speed ?? 10,
                  variant: 'dark',
                })}
              >
                <div
                  className="w-8 h-8"
                  style={{
                    backgroundImage: `url(${onekoDark})`,
                    backgroundPosition: '-96px -96px', // Idle sprite position (-3 * 32, -3 * 32)
                    imageRendering: 'pixelated',
                  }}
                />
                <span className="text-xs">black</span>
                {settings.oneko?.variant === 'dark' && (
                  <CheckCircle className="w-4 h-4 text-primary" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* CRT Effect Section */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            CRT Effect
          </h2>

          {/* Enable/Disable Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.crt?.enabled ?? false}
                onChange={(e) => updateSetting('crt', {
                  ...settings.crt,
                  enabled: e.target.checked,
                  scanlines: settings.crt?.scanlines ?? 50,
                  flicker: settings.crt?.flicker ?? 10,
                  rgbOffset: settings.crt?.rgbOffset ?? 50,
                  curvature: settings.crt?.curvature ?? 20,
                })}
                className="w-4 h-4"
              />
              <span className="text-sm">Enable CRT monitor effect</span>
            </label>
          </div>

          {/* Individual Effect Sliders */}
          <div className="mb-4 space-y-4">
            {/* Scanlines Slider */}
            <div>
              <h3 className="text-sm font-medium mb-1">Scanlines: {settings.crt?.scanlines ?? 0}%</h3>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.crt?.scanlines ?? 0}
                onChange={(e) => updateSetting('crt', {
                  ...settings.crt,
                  enabled: settings.crt?.enabled ?? false,
                  scanlines: parseInt(e.target.value),
                  flicker: settings.crt?.flicker ?? 10,
                  rgbOffset: settings.crt?.rgbOffset ?? 50,
                  curvature: settings.crt?.curvature ?? 20,
                })}
                className="w-full"
              />
            </div>

            {/* Flicker Slider */}
            <div>
              <h3 className="text-sm font-medium mb-1">Flicker: {settings.crt?.flicker ?? 0}%</h3>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.crt?.flicker ?? 0}
                onChange={(e) => updateSetting('crt', {
                  ...settings.crt,
                  enabled: settings.crt?.enabled ?? false,
                  scanlines: settings.crt?.scanlines ?? 50,
                  flicker: parseInt(e.target.value),
                  rgbOffset: settings.crt?.rgbOffset ?? 50,
                  curvature: settings.crt?.curvature ?? 20,
                })}
                className="w-full"
              />
            </div>

            {/* RGB Offset Slider */}
            <div>
              <h3 className="text-sm font-medium mb-1">RGB Offset: {settings.crt?.rgbOffset ?? 0}%</h3>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.crt?.rgbOffset ?? 0}
                onChange={(e) => updateSetting('crt', {
                  ...settings.crt,
                  enabled: settings.crt?.enabled ?? false,
                  scanlines: settings.crt?.scanlines ?? 50,
                  flicker: settings.crt?.flicker ?? 10,
                  rgbOffset: parseInt(e.target.value),
                  curvature: settings.crt?.curvature ?? 20,
                })}
                className="w-full"
              />
            </div>

            {/* Curvature Slider */}
            <div>
              <h3 className="text-sm font-medium mb-1">Screen Curvature: {settings.crt?.curvature ?? 0}%</h3>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.crt?.curvature ?? 0}
                onChange={(e) => updateSetting('crt', {
                  ...settings.crt,
                  enabled: settings.crt?.enabled ?? false,
                  scanlines: settings.crt?.scanlines ?? 50,
                  flicker: settings.crt?.flicker ?? 10,
                  rgbOffset: settings.crt?.rgbOffset ?? 50,
                  curvature: parseInt(e.target.value),
                })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Cache Management Section */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Cache & Storage
          </h2>

          {/* Usage Statistics */}
          {stats && (
            <div className="mb-4 p-3 border border-border bg-muted/30 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Total Requests:</span>
                  <span className="ml-2 font-mono">{stats.totalRequests}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cache Hits:</span>
                  <span className="ml-2 font-mono text-green-600">{stats.cacheHits}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cache Misses:</span>
                  <span className="ml-2 font-mono text-yellow-600">{stats.cacheMisses}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Hit Rate:</span>
                  <span className="ml-2 font-mono">
                    {stats.cacheHits + stats.cacheMisses > 0
                      ? `${Math.round((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {Object.keys(stats.requestsByApp).length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-muted-foreground text-xs">Requests by App:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(stats.requestsByApp).map(([app, count]) => (
                      <span key={app} className="text-xs bg-muted px-2 py-0.5">
                        {app}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cache Actions */}
          <div className="flex flex-wrap gap-2">
            <RetroButton
              onClick={handleClearCache}
              onBlur={handleClearCacheBlur}
              disabled={isClearing}
              className={cn(
                "flex items-center gap-1",
                confirmClearCache && "bg-red-600 hover:bg-red-700 text-white"
              )}
            >
              <Trash2 className="w-4 h-4" />
              {confirmClearCache ? "Confirm?" : "Clear All Cache"}
            </RetroButton>
            <RetroButton
              onClick={handleResetStats}
              onBlur={handleResetStatsBlur}
              disabled={isClearing}
              className={cn(
                "flex items-center gap-1",
                confirmResetStats && "bg-red-600 hover:bg-red-700 text-white"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isClearing && "animate-spin")} />
              {confirmResetStats ? "Confirm?" : "Reset Stats"}
            </RetroButton>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Clearing cache will force fresh data to be fetched from APIs.
          </p>
        </div>
      </div>
    </WindowLayout>
  );
};

export default ConfigApp;
