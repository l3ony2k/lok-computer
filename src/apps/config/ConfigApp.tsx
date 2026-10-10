import React, { useEffect, useState } from "react";
import {
  Bell,
  Bug,
  Cat,
  CheckCircle,
  Copy,
  Database,
  Image,
  Monitor,
  Palette,
  Power,
  LayoutGrid,
  RefreshCw,
  ServerCog,
  Sparkles,
  SunMoon,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_CRT_SETTINGS, useUserSettings, type CrtSettings } from "@/hooks/useUserSettings";
import { DESKTOP_ICON_ORDER_RESET_EVENT } from "@/lib/desktopIconOrder";
import { useTheme } from "@/hooks/useTheme";
import { THEMES } from "@/lib/theme";
import { AppearancePicker, ThemePicker } from "@/components/system/ThemePicker";
import { WindowLayout } from "@/components/window/WindowLayout";
import { RetroButton } from "@/components/ui/RetroButton";
import { toast } from "sonner";
import {
  clearCache,
  getUsageStats,
  isStorageAvailable,
  resetUsageStats,
  type UsageStats,
} from "@/lib/storage";
import { rebootSystem, requestSystemUpdateCheck, SYSTEM_VERSION } from "@/lib/system";
import onekoDefault from "@/assets/oneko.gif";
import onekoDark from "@/assets/oneko-dark.gif";

type ConfigCategory = "style" | "effect" | "system" | "debug";

const CONFIG_CATEGORIES: Array<{
  id: ConfigCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "style", label: "Style", icon: Palette },
  { id: "effect", label: "Effect", icon: Sparkles },
  { id: "system", label: "System", icon: ServerCog },
  { id: "debug", label: "Debug", icon: Bug },
];

const DEFAULT_WALLPAPERS = [
  {
    name: "by @1000bytes.bsky.social",
    url: "https://d2w9rnfcy7mm78.cloudfront.net/36335972/original_8a4c77ea7ed077282b4653fad9183d57.jpg",
  },
  {
    name: "Ocean Waves",
    url: "https://images.unsplash.com/photo-1484387436194-cf7cb70800ce?w=1280&auto=format&fit=crop",
  },
  {
    name: "Abstract Geometric",
    url: "https://images.unsplash.com/photo-1605106702734-205df224ecce?w=1280&auto=format&fit=crop",
  },
  {
    name: "Retro Computer",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1280&auto=format&fit=crop",
  },
];

const ConfigSection = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <section className="config-section">
    <h2 className="config-section-title">
      <Icon className="h-4 w-4" />
      {title}
    </h2>
    <div className="config-section-body">{children}</div>
  </section>
);

const RangeSetting = ({
  label,
  value,
  min = 0,
  max = 100,
  suffix = "%",
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) => (
  <label className="config-range-setting">
    <span>{label}: {value}{suffix}</span>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
    />
  </label>
);

export const ConfigApp: React.FC = () => {
  const { theme, appearance, colorScheme } = useTheme();
  const { settings, updateSetting } = useUserSettings();
  const [activeCategory, setActiveCategory] = useState<ConfigCategory>("style");
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState("");
  const [customError, setCustomError] = useState("");
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClearCache, setConfirmClearCache] = useState(false);
  const [confirmResetStats, setConfirmResetStats] = useState(false);
  const [debugOutlines, setDebugOutlines] = useState(() => (
    document.documentElement.classList.contains("debug-layout-outlines")
  ));

  const loadStats = async () => {
    try {
      setStats(await getUsageStats());
    } catch (error) {
      console.error("[ConfigApp] Failed to load stats:", error);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const handleCustomWallpaper = () => {
    if (!customWallpaperUrl) {
      setCustomError("Please enter a URL");
      return;
    }

    try {
      new URL(customWallpaperUrl);
      updateSetting("wallpaper", customWallpaperUrl);
      setCustomWallpaperUrl("");
      setCustomError("");
    } catch {
      setCustomError("Invalid URL format");
    }
  };

  const handleClearCache = async () => {
    if (!confirmClearCache) {
      setConfirmClearCache(true);
      return;
    }

    setIsClearing(true);
    try {
      await clearCache();
      await loadStats();
      toast.success("API cache cleared.");
    } catch (error) {
      console.error("[ConfigApp] Failed to clear cache:", error);
      toast.error("Failed to clear API cache.");
    } finally {
      setIsClearing(false);
      setConfirmClearCache(false);
    }
  };

  const handleResetStats = async () => {
    if (!confirmResetStats) {
      setConfirmResetStats(true);
      return;
    }

    setIsClearing(true);
    try {
      await resetUsageStats();
      await loadStats();
      toast.success("Usage statistics reset.");
    } catch (error) {
      console.error("[ConfigApp] Failed to reset stats:", error);
      toast.error("Failed to reset usage statistics.");
    } finally {
      setIsClearing(false);
      setConfirmResetStats(false);
    }
  };

  const getDiagnostics = () => ({
    version: SYSTEM_VERSION,
    theme: { theme, appearance, colorScheme },
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    online: navigator.onLine,
    indexedDB: isStorageAvailable(),
    openCacheStats: stats,
    verboseCacheLogging: settings.debug?.verboseCacheLogging ?? false,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  });

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(getDiagnostics(), null, 2));
      toast.success("Diagnostics copied.");
    } catch (error) {
      console.error("[ConfigApp] Failed to copy diagnostics:", error);
      toast.error("Could not copy diagnostics.");
    }
  };

  const toggleDebugOutlines = () => {
    const nextValue = !debugOutlines;
    document.documentElement.classList.toggle("debug-layout-outlines", nextValue);
    setDebugOutlines(nextValue);
  };

  const crt = { ...DEFAULT_CRT_SETTINGS, ...settings.crt };
  const updateCrt = (update: Partial<CrtSettings>) => {
    updateSetting("crt", { ...crt, ...update });
  };

  const updateOneko = (update: Partial<NonNullable<typeof settings.oneko>>) => {
    updateSetting("oneko", {
      enabled: settings.oneko?.enabled ?? false,
      hasBeenAsked: true,
      speed: settings.oneko?.speed ?? 10,
      variant: settings.oneko?.variant ?? "default",
      ...update,
    });
  };

  return (
    <WindowLayout className="config-window-layout" hasPadding={false} isScrollable={false}>
      <div className="config-layout">
        <nav
          className="config-sidebar"
          aria-label="Configuration categories"
          aria-orientation="vertical"
          role="tablist"
        >
          {CONFIG_CATEGORIES.map(({ id, label, icon: Icon }) => (
            <RetroButton
              key={id}
              size="sm"
              active={activeCategory === id}
              className="config-category-button"
              role="tab"
              aria-selected={activeCategory === id}
              onClick={() => setActiveCategory(id)}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </RetroButton>
          ))}
        </nav>

        <div className="config-content scrollable-area">
          {activeCategory === "style" && (
            <div className="config-category-content">
              <ConfigSection title="Theme" icon={Palette}>
                <ThemePicker />
                <p className="config-help-text">
                  {THEMES[theme].description}
                  {THEMES[theme].credit && (
                    <>
                      {" "}Based on{" "}
                      <a href={THEMES[theme].credit.url} target="_blank" rel="noopener noreferrer">
                        {THEMES[theme].credit.label}
                      </a>
                      {" "}({THEMES[theme].credit.license}).
                    </>
                  )}
                </p>
              </ConfigSection>

              <ConfigSection title="Color mode" icon={SunMoon}>
                <AppearancePicker />
              </ConfigSection>

              <ConfigSection title="Wallpaper" icon={Image}>
                <div className="config-setting-heading">
                  <span>Current wallpaper</span>
                  {settings.wallpaper && (
                    <RetroButton size="sm" onClick={() => updateSetting("wallpaper", undefined)}>
                      <X className="h-3 w-3" /> Remove
                    </RetroButton>
                  )}
                </div>

                <div className="config-wallpaper-preview">
                  {settings.wallpaper ? (
                    <div style={{ backgroundImage: `url("${settings.wallpaper}")` }} />
                  ) : (
                    <span>Theme default</span>
                  )}
                </div>

                <div className="config-wallpaper-grid">
                  {DEFAULT_WALLPAPERS.map((wallpaper) => (
                    <button
                      key={wallpaper.url}
                      type="button"
                      className="config-wallpaper-option"
                      data-active={settings.wallpaper === wallpaper.url || undefined}
                      onClick={() => updateSetting("wallpaper", wallpaper.url)}
                      title={wallpaper.name}
                    >
                      <span style={{ backgroundImage: `url("${wallpaper.url}")` }} />
                      {settings.wallpaper === wallpaper.url && <CheckCircle className="h-4 w-4" />}
                    </button>
                  ))}
                </div>

                <label className="config-input-label">
                  <span>Custom wallpaper URL</span>
                  <div className="app-joined-control">
                    <input
                      type="url"
                      value={customWallpaperUrl}
                      onChange={(event) => {
                        setCustomWallpaperUrl(event.target.value);
                        setCustomError("");
                      }}
                      placeholder="https://example.com/image.jpg"
                      className="search-input"
                    />
                    <RetroButton onClick={handleCustomWallpaper}>Set</RetroButton>
                  </div>
                  {customError && <small className="config-error">{customError}</small>}
                </label>
              </ConfigSection>
            </div>
          )}

          {activeCategory === "effect" && (
            <div className="config-category-content">
              <ConfigSection title="Oneko" icon={Cat}>
                <label className="config-checkbox-row">
                  <input
                    type="checkbox"
                    checked={settings.oneko?.enabled ?? false}
                    onChange={(event) => updateOneko({ enabled: event.target.checked })}
                  />
                  Enable cursor follower
                </label>

                <RangeSetting
                  label="Speed"
                  value={settings.oneko?.speed ?? 10}
                  min={1}
                  max={20}
                  suffix=""
                  onChange={(speed) => updateOneko({ speed })}
                />

                <div className="config-oneko-grid">
                  {([
                    { id: "default" as const, label: "White", image: onekoDefault },
                    { id: "dark" as const, label: "Black", image: onekoDark },
                  ]).map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      className="config-oneko-option"
                      data-active={(settings.oneko?.variant ?? "default") === variant.id || undefined}
                      onClick={() => updateOneko({ variant: variant.id })}
                    >
                      <span
                        style={{
                          backgroundImage: `url(${variant.image})`,
                          backgroundPosition: "-96px -96px",
                        }}
                      />
                      {variant.label}
                    </button>
                  ))}
                </div>
              </ConfigSection>

              <ConfigSection title="CRT" icon={Monitor}>
                <label className="config-checkbox-row">
                  <input
                    type="checkbox"
                    checked={crt.enabled}
                    onChange={(event) => updateCrt({ enabled: event.target.checked })}
                  />
                  Enable CRT effect
                </label>

                <RangeSetting label="Scanlines" value={crt.scanlines} onChange={(scanlines) => updateCrt({ scanlines })} />
                <RangeSetting label="Flicker" value={crt.flicker} onChange={(flicker) => updateCrt({ flicker })} />
                <RangeSetting label="RGB offset" value={crt.rgbOffset} onChange={(rgbOffset) => updateCrt({ rgbOffset })} />
                <RangeSetting label="Curvature" value={crt.curvature} onChange={(curvature) => updateCrt({ curvature })} />
              </ConfigSection>
            </div>
          )}

          {activeCategory === "system" && (
            <div className="config-category-content">
              <ConfigSection title="System" icon={ServerCog}>
                <dl className="config-system-info">
                  <div><dt>Version</dt><dd>v{SYSTEM_VERSION}</dd></div>
                  <div><dt>Update channel</dt><dd>stable</dd></div>
                  <div><dt>Connection</dt><dd>{navigator.onLine ? "online" : "offline"}</dd></div>
                </dl>

                <div className="config-action-stack">
                  <RetroButton onClick={requestSystemUpdateCheck}>
                    <RefreshCw className="h-4 w-4" /> Check for updates
                  </RetroButton>
                  <RetroButton onClick={() => void rebootSystem("manual system reboot from Config")}>
                    <Power className="h-4 w-4" /> Reboot system
                  </RetroButton>
                  <RetroButton onClick={() => window.dispatchEvent(new Event(DESKTOP_ICON_ORDER_RESET_EVENT))}>
                    <LayoutGrid className="h-4 w-4" /> Reset icon layout
                  </RetroButton>
                </div>
                <p className="config-help-text">
                  Reboot clears browser Cache Storage, unregisters service workers, and reloads the latest system code through the boot screen. Reset icon layout puts the desktop icons back in
                  their original order after you have dragged them around.
                </p>
              </ConfigSection>
            </div>
          )}

          {activeCategory === "debug" && (
            <div className="config-category-content">
              <ConfigSection title="Debug tools" icon={Bug}>
                <label className="config-checkbox-row">
                  <input
                    type="checkbox"
                    checked={settings.debug?.verboseCacheLogging ?? false}
                    onChange={(event) => updateSetting("debug", {
                      verboseCacheLogging: event.target.checked,
                    })}
                  />
                  Verbose cache logging
                </label>
                <div className="config-debug-actions">
                  <RetroButton onClick={() => toast("Test notification", { description: "Toast rendering is working." })}>
                    <Bell className="h-4 w-4" /> Test notification
                  </RetroButton>
                  <RetroButton onClick={() => void copyDiagnostics()}>
                    <Copy className="h-4 w-4" /> Copy diagnostics
                  </RetroButton>
                  <RetroButton onClick={() => console.info("[Debug] Diagnostics", getDiagnostics())}>
                    <Bug className="h-4 w-4" /> Log diagnostics
                  </RetroButton>
                  <RetroButton active={debugOutlines} onClick={toggleDebugOutlines}>
                    <Monitor className="h-4 w-4" /> Layout outlines
                  </RetroButton>
                </div>
              </ConfigSection>

              <ConfigSection title="Cache and usage" icon={Database}>
                {stats && (
                  <dl className="config-stats-grid">
                    <div><dt>Requests</dt><dd>{stats.totalRequests}</dd></div>
                    <div><dt>Cache hits</dt><dd>{stats.cacheHits}</dd></div>
                    <div><dt>Cache misses</dt><dd>{stats.cacheMisses}</dd></div>
                    <div>
                      <dt>Hit rate</dt>
                      <dd>
                        {stats.cacheHits + stats.cacheMisses > 0
                          ? `${Math.round((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100)}%`
                          : "N/A"}
                      </dd>
                    </div>
                  </dl>
                )}

                {stats && Object.keys(stats.requestsByApp).length > 0 && (
                  <div className="config-request-list">
                    {Object.entries(stats.requestsByApp).map(([app, count]) => (
                      <span key={app}>{app}: {count}</span>
                    ))}
                  </div>
                )}

                <div className="config-debug-actions">
                  <RetroButton
                    disabled={isClearing}
                    onClick={() => void handleClearCache()}
                    onBlur={() => setTimeout(() => setConfirmClearCache(false), 150)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {confirmClearCache ? "Confirm clear" : "Clear API cache"}
                  </RetroButton>
                  <RetroButton
                    disabled={isClearing}
                    onClick={() => void handleResetStats()}
                    onBlur={() => setTimeout(() => setConfirmResetStats(false), 150)}
                  >
                    <RefreshCw className={cn("h-4 w-4", isClearing && "animate-spin")} />
                    {confirmResetStats ? "Confirm reset" : "Reset statistics"}
                  </RetroButton>
                </div>
              </ConfigSection>
            </div>
          )}
        </div>
      </div>
    </WindowLayout>
  );
};

export default ConfigApp;
