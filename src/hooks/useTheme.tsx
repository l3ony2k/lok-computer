/* eslint-disable react-refresh/only-export-components -- provider and hook share one module */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  THEMES,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  loadThemeStyles,
  parseStoredThemePreference,
  readThemePreference,
  resolveColorScheme,
  writeThemePreference,
  type Appearance,
  type ColorScheme,
  type ThemeDefinition,
  type ThemeId,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeContextValue {
  theme: ThemeId;
  appearance: Appearance;
  /** The scheme actually rendered after applying theme constraints and the OS preference. */
  colorScheme: ColorScheme;
  definition: ThemeDefinition;
  /** Theme currently downloading its stylesheet, if any. */
  pendingTheme: ThemeId | null;
  setTheme: (theme: ThemeId) => Promise<void>;
  setAppearance: (appearance: Appearance) => void;
  /** Warms a theme stylesheet, e.g. on hover, so selecting it is instant. */
  prefetchTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

const getSystemPrefersDark = () => (
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY).matches
    : false
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);
  const [pendingTheme, setPendingTheme] = useState<ThemeId | null>(null);
  const requestedTheme = useRef<ThemeId>(preference.theme);

  const colorScheme = resolveColorScheme(preference, systemPrefersDark);

  // Layout effect: the root attribute flips in the same commit as layout-dependent React output.
  useLayoutEffect(() => {
    applyThemeToDocument(preference.theme, colorScheme);
  }, [preference.theme, colorScheme]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Keep other tabs in sync; they load the stylesheet before switching.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = parseStoredThemePreference(event.newValue);
      // The other tab's choice supersedes any selection still loading here.
      requestedTheme.current = next.theme;
      setPendingTheme(null);
      void loadThemeStyles(next.theme).then(
        () => {
          if (requestedTheme.current === next.theme) setPreference(next);
        },
        (error) => {
          // A classic layout without its stylesheet is broken; follow only the appearance.
          console.error(`[Theme] Failed to load ${next.theme}:`, error);
          setPreference((current) => ({ ...current, appearance: next.appearance }));
        },
      );
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback(async (theme: ThemeId) => {
    requestedTheme.current = theme;
    setPendingTheme(theme);
    try {
      await loadThemeStyles(theme);
    } catch (error) {
      console.error(`[Theme] Failed to load ${theme}:`, error);
      if (requestedTheme.current === theme) setPendingTheme(null);
      throw error;
    }

    // A newer selection wins if the user clicked through themes quickly.
    if (requestedTheme.current !== theme) return;
    setPendingTheme(null);
    setPreference((current) => {
      const next = { ...current, theme };
      writeThemePreference(next);
      return next;
    });
    console.info(`[Theme] ${THEMES[theme].name} applied`);
  }, []);

  const setAppearance = useCallback((appearance: Appearance) => {
    setPreference((current) => {
      const next = { ...current, appearance };
      writeThemePreference(next);
      return next;
    });
  }, []);

  const prefetchTheme = useCallback((theme: ThemeId) => {
    void loadThemeStyles(theme).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme: preference.theme,
    appearance: preference.appearance,
    colorScheme,
    definition: THEMES[preference.theme],
    pendingTheme,
    setTheme,
    setAppearance,
    prefetchTheme,
  }), [colorScheme, pendingTheme, preference.appearance, preference.theme, prefetchTheme, setAppearance, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

