/**
 * Desktop theme engine.
 *
 * A theme is a complete visual system: tokens, chrome geometry, typography,
 * desktop layout, and control styling. The lok theme ships in the entry CSS;
 * every other theme is a lazily loaded stylesheet scoped to
 * `:root[data-theme="<id>"]`, so inactive themes cost nothing until chosen.
 *
 * The preference lives in localStorage rather than IndexedDB because the
 * pre-paint script in index.html must read it synchronously to avoid a flash
 * of the wrong theme. Keep THEME_STORAGE_KEY, THEME_QUERY_PARAM, and the theme
 * ids in sync with that script; `theme.test.ts` enforces it.
 */

export type ThemeId = 'lok' | '98' | 'xp' | '7';
export type Appearance = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

/** `lok` keeps the top bar; `classic` merges start menu, tasks, and tray into one taskbar. */
export type DesktopLayout = 'lok' | 'classic';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  layout: DesktopLayout;
  /** Color schemes the theme implements. Single-scheme themes ignore the appearance preference. */
  schemes: readonly ColorScheme[];
  /** Browser UI color (`<meta name="theme-color">`) per scheme. */
  themeColor: Readonly<Partial<Record<ColorScheme, string>>>;
  /** Label on the start button in the classic layout. */
  startLabel?: string;
  credit?: { label: string; url: string };
  /** Lazily loads the scoped stylesheet; absent for the built-in theme. */
  loadStyles?: () => Promise<unknown>;
  /** CSS font shorthands warmed with the stylesheet so text never swaps after a switch. */
  fonts?: readonly string[];
}

export interface ThemePreference {
  theme: ThemeId;
  appearance: Appearance;
}

export const THEME_STORAGE_KEY = 'lok.theme';
export const THEME_QUERY_PARAM = 'theme';
/** Key written by next-themes before the in-house engine; read once for migration. */
export const LEGACY_APPEARANCE_KEY = 'theme';

export const DEFAULT_THEME_PREFERENCE: ThemePreference = { theme: 'lok', appearance: 'system' };

export const THEMES: Readonly<Record<ThemeId, ThemeDefinition>> = {
  lok: {
    id: 'lok',
    name: 'lok',
    tagline: 'Monospace, flat, square',
    description: 'The native lok.computer system with light and dark modes.',
    layout: 'lok',
    schemes: ['light', 'dark'],
    themeColor: { light: '#f0f0f0', dark: '#1a1a1a' },
  },
  '98': {
    id: '98',
    name: '98',
    tagline: 'Beveled silver chrome',
    description: 'Raised bevels, navy title bars, pixel type, and a teal desktop.',
    layout: 'classic',
    schemes: ['light'],
    themeColor: { light: '#008080' },
    startLabel: 'Start',
    credit: { label: '98.css by Jordan Scales', url: 'https://github.com/jdan/98.css' },
    loadStyles: () => Promise.all([import('@/themes/classic.css'), import('@/themes/98/theme.css')]),
    fonts: ['11px "Pixelated MS Sans Serif"', 'bold 11px "Pixelated MS Sans Serif"'],
  },
  xp: {
    id: 'xp',
    name: 'XP',
    tagline: 'Luna blue and olive green',
    description: 'Glossy Luna title bars, rounded controls, and the green start button.',
    layout: 'classic',
    schemes: ['light'],
    themeColor: { light: '#245edb' },
    startLabel: 'start',
    credit: { label: 'XP.css by Adam Hammad', url: 'https://github.com/botoxparty/XP.css' },
    loadStyles: () => Promise.all([import('@/themes/classic.css'), import('@/themes/xp/theme.css')]),
  },
  '7': {
    id: '7',
    name: '7',
    tagline: 'Aero glass and soft light',
    description: 'Translucent glass frames, glowing caption buttons, and the start orb.',
    layout: 'classic',
    schemes: ['light'],
    themeColor: { light: '#1c5a8a' },
    credit: { label: '7.css by Khang Nguyen', url: 'https://github.com/khang-nd/7.css' },
    loadStyles: () => Promise.all([import('@/themes/classic.css'), import('@/themes/7/theme.css')]),
  },
};

/** Display order. Not derived from THEMES: integer-like keys ('7', '98') would sort first. */
export const THEME_IDS: readonly ThemeId[] = ['lok', '98', 'xp', '7'];
export const APPEARANCES: readonly Appearance[] = ['light', 'dark', 'system'];

export const isThemeId = (value: unknown): value is ThemeId => (
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(THEMES, value)
);

export const isAppearance = (value: unknown): value is Appearance => (
  typeof value === 'string' && (APPEARANCES as readonly string[]).includes(value)
);

export const normalizeThemePreference = (value: unknown): ThemePreference => {
  if (!value || typeof value !== 'object') return { ...DEFAULT_THEME_PREFERENCE };
  const candidate = value as Partial<ThemePreference>;
  return {
    theme: isThemeId(candidate.theme) ? candidate.theme : DEFAULT_THEME_PREFERENCE.theme,
    appearance: isAppearance(candidate.appearance) ? candidate.appearance : DEFAULT_THEME_PREFERENCE.appearance,
  };
};

export const parseStoredThemePreference = (raw: string | null, legacyAppearance: string | null = null): ThemePreference => {
  if (raw) {
    try {
      return normalizeThemePreference(JSON.parse(raw));
    } catch {
      // Fall through to defaults when storage holds something unexpected.
    }
  }
  return {
    ...DEFAULT_THEME_PREFERENCE,
    appearance: isAppearance(legacyAppearance) ? legacyAppearance : DEFAULT_THEME_PREFERENCE.appearance,
  };
};

/** Single-scheme themes always resolve to their own scheme. */
export const resolveColorScheme = (preference: ThemePreference, systemPrefersDark: boolean): ColorScheme => {
  const { schemes } = THEMES[preference.theme];
  if (schemes.length === 1) return schemes[0];
  if (preference.appearance === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference.appearance;
};

export const supportsAppearance = (theme: ThemeId) => THEMES[theme].schemes.length > 1;

const safeStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

/**
 * Reads the preference, letting a `?theme=` query parameter override storage.
 * The override is persisted so a shared link keeps its theme after the router
 * resets the URL.
 */
export const readThemePreference = (): ThemePreference => {
  const storage = safeStorage();
  const preference = parseStoredThemePreference(
    storage?.getItem(THEME_STORAGE_KEY) ?? null,
    storage?.getItem(LEGACY_APPEARANCE_KEY) ?? null,
  );

  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get(THEME_QUERY_PARAM);
    if (isThemeId(fromUrl)) {
      preference.theme = fromUrl;
      writeThemePreference(preference);
    }
  }

  return preference;
};

export const writeThemePreference = (preference: ThemePreference) => {
  try {
    safeStorage()?.setItem(THEME_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Private browsing or blocked storage: the theme still applies for this session.
  }
};

const styleLoads = new Map<ThemeId, Promise<void>>();

const warmFonts = async (fonts: readonly string[] = []) => {
  if (typeof document === 'undefined' || !document.fonts) return;
  // A missing font must never block a theme switch.
  await Promise.all(fonts.map((font) => document.fonts.load(font).catch(() => undefined)));
};

/** Loads a theme stylesheet and its fonts once. Resolves immediately for the built-in theme. */
export const loadThemeStyles = (theme: ThemeId): Promise<void> => {
  const { loadStyles, fonts } = THEMES[theme];
  if (!loadStyles) return Promise.resolve();

  let pending = styleLoads.get(theme);
  if (!pending) {
    pending = loadStyles()
      .then(() => warmFonts(fonts))
      .catch((error) => {
        styleLoads.delete(theme);
        throw error;
      });
    styleLoads.set(theme, pending);
  }
  return pending;
};

/**
 * Applies theme attributes to the document root. Transitions are suspended for
 * one frame so tokens swap atomically instead of animating every surface.
 */
export const applyThemeToDocument = (theme: ThemeId, scheme: ColorScheme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const changed = root.dataset.theme !== theme || root.classList.contains('dark') !== (scheme === 'dark');

  let restoreTransitions: (() => void) | undefined;
  if (changed) {
    const freeze = document.createElement('style');
    freeze.textContent = '*,*::before,*::after{transition:none!important;animation-duration:0s!important}';
    document.head.appendChild(freeze);
    restoreTransitions = () => {
      // Force a style flush before removing the freeze.
      void window.getComputedStyle(document.body).opacity;
      freeze.remove();
    };
  }

  root.dataset.theme = theme;
  root.dataset.layout = THEMES[theme].layout;
  root.classList.toggle('dark', scheme === 'dark');
  root.style.colorScheme = scheme;

  const themeColor = THEMES[theme].themeColor[scheme];
  if (themeColor) {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = themeColor;
  }

  if (restoreTransitions) requestAnimationFrame(restoreTransitions);
};
