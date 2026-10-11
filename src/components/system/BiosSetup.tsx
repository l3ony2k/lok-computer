import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CRT_SETTINGS,
  DEFAULT_DESKTOP_SETTINGS,
  DEFAULT_WINDOW_SETTINGS,
  useUserSettings,
  type UserSettings,
} from "@/hooks/useUserSettings";
import { useTheme } from "@/hooks/useTheme";
import { APPEARANCES, THEMES, THEME_IDS, supportsAppearance, type Appearance, type ThemeId } from "@/lib/theme";
import { WALLPAPER_PRESETS } from "@/config/wallpapers";
import { SYSTEM_VERSION } from "@/lib/system";
import "./bios-setup.css";

interface BiosItem {
  id: string;
  section: string;
  label: string;
  value: string;
  help: string;
  disabled?: boolean;
  /** Steps the value forward or back; wraps around. */
  change: (direction: 1 | -1) => void;
}

const SECTION_ORDER = ["Appearance", "Display", "Desktop", "Diagnostics"];

const cycle = <T,>(options: readonly T[], current: T, direction: 1 | -1): T => {
  const index = options.indexOf(current);
  return options[(Math.max(index, 0) + direction + options.length) % options.length];
};

const step = (value: number, direction: 1 | -1, min: number, max: number, by: number) => (
  Math.min(max, Math.max(min, value + direction * by))
);

const onOff = (value: boolean) => (value ? "Enabled" : "Disabled");

const APPEARANCE_LABEL: Record<Appearance, string> = { light: "Light", dark: "Dark", system: "Auto" };

/**
 * The setup screen behind DEL during boot. It edits the same stores as Config
 * (settings and the theme engine), so every change applies live; Esc puts the
 * values back as they were when the screen opened.
 */
export const BiosSetup = ({ onExit }: { onExit: () => void }) => {
  const { settings, updateSetting } = useUserSettings();
  const { theme, appearance, setTheme, setAppearance } = useTheme();
  const [selected, setSelected] = useState(0);
  const screenRef = useRef<HTMLElement>(null);
  const snapshot = useRef({ settings, theme, appearance });

  useEffect(() => {
    screenRef.current?.focus({ preventScroll: true });
  }, []);

  const crt = { ...DEFAULT_CRT_SETTINGS, ...settings.crt };
  const oneko = { enabled: false, hasBeenAsked: true, speed: 10, variant: "default" as const, ...settings.oneko };
  const desktop = { ...DEFAULT_DESKTOP_SETTINGS, ...settings.desktop };
  const windows = { ...DEFAULT_WINDOW_SETTINGS, ...settings.windows };
  const verbose = settings.debug?.verboseCacheLogging ?? false;

  const wallpaperOptions = useMemo(() => ["", ...WALLPAPER_PRESETS.map((preset) => preset.url)], []);
  const wallpaperName = (url: string) => (url ? WALLPAPER_PRESETS.find((preset) => preset.url === url)?.name ?? "Custom" : "Theme default");

  const items = useMemo<BiosItem[]>(() => {
    const changeTheme = (direction: 1 | -1) => {
      void setTheme(cycle(THEME_IDS, theme, direction)).catch(() => undefined);
    };
    const setCrt = (patch: Partial<typeof crt>) => updateSetting("crt", { ...crt, ...patch });
    const setOneko = (patch: Partial<typeof oneko>) => updateSetting("oneko", { ...oneko, hasBeenAsked: true, ...patch });
    const setDesktop = (patch: Partial<typeof desktop>) => updateSetting("desktop", { ...desktop, ...patch });
    const percent = (key: "scanlines" | "flicker" | "rgbOffset" | "curvature", label: string, help: string): BiosItem => ({
      id: key,
      section: "Display",
      label,
      value: `${crt[key]}%`,
      help,
      disabled: !crt.enabled,
      change: (direction) => setCrt({ [key]: step(crt[key], direction, 0, 100, 10) }),
    });
    return [
      {
        id: "theme",
        section: "Appearance",
        label: "Desktop Theme",
        value: THEMES[theme].name,
        help: `${THEMES[theme].description} The theme's stylesheet loads when it is selected.`,
        change: changeTheme,
      },
      {
        id: "appearance",
        section: "Appearance",
        label: "Color Mode",
        value: APPEARANCE_LABEL[appearance],
        help: supportsAppearance(theme)
          ? "Light, dark, or the browser's preference. Applies to themes with both schemes."
          : `${THEMES[theme].name} uses its original palette; color mode applies to themes with light and dark variants.`,
        disabled: !supportsAppearance(theme),
        change: (direction) => setAppearance(cycle(APPEARANCES, appearance, direction)),
      },
      {
        id: "wallpaper",
        section: "Appearance",
        label: "Wallpaper",
        value: wallpaperName(settings.wallpaper ?? ""),
        help: "A desktop picture from the presets, or the theme's own. Config takes any URL.",
        change: (direction) => {
          const current = wallpaperOptions.includes(settings.wallpaper ?? "") ? settings.wallpaper ?? "" : "";
          const next = cycle(wallpaperOptions, current, direction);
          updateSetting("wallpaper", next || undefined);
        },
      },
      {
        id: "crt",
        section: "Display",
        label: "CRT Effect",
        value: onOff(crt.enabled),
        help: "Scanlines, flicker, colour fringing and curvature over the whole screen. Flicker rests when the system asks for reduced motion.",
        change: () => setCrt({ enabled: !crt.enabled }),
      },
      percent("scanlines", "  Scanlines", "Horizontal line intensity."),
      percent("flicker", "  Flicker", "Brightness flicker intensity."),
      percent("rgbOffset", "  RGB Offset", "Colour fringing intensity."),
      percent("curvature", "  Curvature", "Vignette at the corners."),
      {
        id: "oneko",
        section: "Display",
        label: "Cursor Cat",
        value: onOff(oneko.enabled),
        help: "Oneko, the cat that chases the pointer.",
        change: () => setOneko({ enabled: !oneko.enabled }),
      },
      {
        id: "oneko-speed",
        section: "Display",
        label: "  Cat Speed",
        value: String(oneko.speed),
        help: "How fast the cat runs, 1 to 20.",
        disabled: !oneko.enabled,
        change: (direction) => setOneko({ speed: step(oneko.speed, direction, 1, 20, 1) }),
      },
      {
        id: "oneko-variant",
        section: "Display",
        label: "  Cat Colour",
        value: oneko.variant === "dark" ? "Black" : "White",
        help: "The white cat or the black one.",
        disabled: !oneko.enabled,
        change: () => setOneko({ variant: oneko.variant === "dark" ? "default" : "dark" }),
      },
      {
        id: "icon-size",
        section: "Desktop",
        label: "Icon Size",
        value: { s: "Small", m: "Medium", l: "Large" }[desktop.iconSize],
        help: "Size of the desktop icons.",
        change: (direction) => setDesktop({ iconSize: cycle(["s", "m", "l"] as const, desktop.iconSize, direction) }),
      },
      {
        id: "show-icons",
        section: "Desktop",
        label: "Desktop Icons",
        value: onOff(desktop.showIcons),
        help: "Hidden icons are still reachable from the system menu, the launcher, and the desktop's right-click menu.",
        change: () => setDesktop({ showIcons: !desktop.showIcons }),
      },
      {
        id: "snap",
        section: "Desktop",
        label: "Snap Icons to Grid",
        value: onOff(desktop.snapToGrid),
        help: "Disabled: icons stay wherever they are dropped.",
        change: () => setDesktop({ snapToGrid: !desktop.snapToGrid }),
      },
      {
        id: "double-click",
        section: "Desktop",
        label: "Title Bar Double-Click",
        value: windows.titleDoubleClick === "shade" ? "Shade" : "Maximize",
        help: "Maximize the window, or roll it up to its title bar.",
        change: () => updateSetting("windows", { ...windows, titleDoubleClick: windows.titleDoubleClick === "shade" ? "maximize" : "shade" }),
      },
      {
        id: "verbose",
        section: "Diagnostics",
        label: "Verbose Cache Logging",
        value: onOff(verbose),
        help: "Logs every cache read and write to the Console app.",
        change: () => updateSetting("debug", { verboseCacheLogging: !verbose }),
      },
    ];
  // The item list re-derives from live settings; the helpers close over the same values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearance, settings, theme, setAppearance, setTheme, updateSetting, wallpaperOptions]);

  const restoreSnapshot = useCallback(() => {
    const saved = snapshot.current;
    const keys: Array<keyof UserSettings> = ["wallpaper", "oneko", "crt", "debug", "desktop", "windows"];
    for (const key of keys) updateSetting(key, saved.settings[key]);
    setAppearance(saved.appearance);
    if (saved.theme !== theme) void setTheme(saved.theme).catch(() => undefined);
  }, [setAppearance, setTheme, theme, updateSetting]);

  const loadDefaults = useCallback(() => {
    updateSetting("wallpaper", undefined);
    updateSetting("crt", DEFAULT_CRT_SETTINGS);
    updateSetting("oneko", { enabled: false, hasBeenAsked: true, speed: 10, variant: "default" });
    updateSetting("desktop", DEFAULT_DESKTOP_SETTINGS);
    updateSetting("windows", DEFAULT_WINDOW_SETTINGS);
    updateSetting("debug", { verboseCacheLogging: false });
    setAppearance("system");
    if (theme !== "lok") void setTheme("lok" as ThemeId).catch(() => undefined);
  }, [setAppearance, setTheme, theme, updateSetting]);

  const exit = useCallback((save: boolean) => {
    if (!save) restoreSnapshot();
    onExit();
  }, [onExit, restoreSnapshot]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const current = items[selected];
      switch (event.key) {
        case "ArrowUp":
          setSelected((index) => (index - 1 + items.length) % items.length);
          break;
        case "ArrowDown":
          setSelected((index) => (index + 1) % items.length);
          break;
        case "ArrowRight":
        case "+":
        case "=":
        case "Enter":
        case " ":
          if (current && !current.disabled) current.change(1);
          break;
        case "ArrowLeft":
        case "-":
          if (current && !current.disabled) current.change(-1);
          break;
        case "F10":
          exit(true);
          break;
        case "F9":
          loadDefaults();
          break;
        case "Escape":
          exit(false);
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [exit, items, loadDefaults, selected]);

  const current = items[selected];

  return (
    <main ref={screenRef} className="bios-screen" role="dialog" aria-label="Setup utility" tabIndex={-1}>
      <header className="bios-title">
        <span>lok.computer Setup Utility</span>
        <span>v{SYSTEM_VERSION}</span>
      </header>
      <div className="bios-body">
        <div className="bios-menu" role="listbox" aria-label="Settings" aria-activedescendant={`bios-${current?.id ?? ""}`}>
          {SECTION_ORDER.map((section) => (
            <section key={section} className="bios-section">
              <h2 className="bios-section-title">{section}</h2>
              {items.filter((item) => item.section === section).map((item) => {
                const index = items.indexOf(item);
                return (
                  <div
                    key={item.id}
                    id={`bios-${item.id}`}
                    role="option"
                    aria-selected={index === selected}
                    aria-disabled={item.disabled || undefined}
                    className="bios-row"
                    data-selected={index === selected || undefined}
                    data-disabled={item.disabled || undefined}
                    onMouseEnter={() => setSelected(index)}
                    onClick={() => {
                      setSelected(index);
                      if (!item.disabled) item.change(1);
                    }}
                  >
                    <span className="bios-row-label">{item.label}</span>
                    <span className="bios-row-value">[{item.value}]</span>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        <aside className="bios-help" aria-live="polite">
          <h2 className="bios-section-title">Item Specific Help</h2>
          <p>{current?.help}</p>
        </aside>
      </div>
      <footer className="bios-keys">
        <span><b>↑↓</b> Select Item</span>
        <span><b>←→</b> Change Values</span>
        <span><b>F9</b> Setup Defaults</span>
        <span><b>F10</b> Save and Exit</span>
        <span><b>Esc</b> Exit Without Saving</span>
      </footer>
      <div className="bios-buttons">
        <button type="button" onClick={loadDefaults}>Defaults (F9)</button>
        <button type="button" onClick={() => exit(false)}>Discard (Esc)</button>
        <button type="button" onClick={() => exit(true)}>Save &amp; Exit (F10)</button>
      </div>
    </main>
  );
};
