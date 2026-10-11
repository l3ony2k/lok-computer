import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_THEME_PREFERENCE,
  THEMES,
  THEME_IDS,
  THEME_QUERY_PARAM,
  THEME_STORAGE_KEY,
  normalizeThemePreference,
  parseStoredThemePreference,
  resolveColorScheme,
  supportsAppearance,
} from './theme';

describe('theme registry', () => {
  test('lists every theme once, with lok first', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_IDS].sort());
    expect(THEME_IDS[0]).toBe('lok');
  });

  test('classic themes load scoped styles and credit their source', () => {
    for (const id of THEME_IDS) {
      const theme = THEMES[id];
      expect(theme.id).toBe(id);
      if (theme.chrome === 'classic') {
        expect(theme.loadStyles).toBeDefined();
        expect(theme.credit?.url).toStartWith('https://');
        // A project with a public license is credited with it; beos-css states none.
        if (theme.credit?.license !== undefined) expect(theme.credit.license).toMatch(/^(MIT|Apache-2\.0)$/);
      } else {
        expect(theme.loadStyles).toBeUndefined();
      }
      for (const scheme of theme.schemes) {
        expect(theme.themeColor[scheme]).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('theme preference', () => {
  test('normalizes unknown values to defaults', () => {
    expect(normalizeThemePreference(null)).toEqual(DEFAULT_THEME_PREFERENCE);
    expect(normalizeThemePreference({ theme: 'vista', appearance: 'sepia' })).toEqual(DEFAULT_THEME_PREFERENCE);
    expect(normalizeThemePreference({ theme: 'xp', appearance: 'dark' })).toEqual({ theme: 'xp', appearance: 'dark' });
  });

  test('parses stored JSON and migrates the legacy appearance key', () => {
    expect(parseStoredThemePreference('{"theme":"98","appearance":"light"}')).toEqual({ theme: '98', appearance: 'light' });
    expect(parseStoredThemePreference(null, 'dark')).toEqual({ theme: 'lok', appearance: 'dark' });
    expect(parseStoredThemePreference('not json', 'nonsense')).toEqual(DEFAULT_THEME_PREFERENCE);
  });

  test('resolves color schemes against theme capabilities', () => {
    expect(resolveColorScheme({ theme: 'lok', appearance: 'system' }, true)).toBe('dark');
    expect(resolveColorScheme({ theme: 'lok', appearance: 'system' }, false)).toBe('light');
    expect(resolveColorScheme({ theme: 'lok', appearance: 'dark' }, false)).toBe('dark');
    expect(resolveColorScheme({ theme: '98', appearance: 'dark' }, true)).toBe('light');
    expect(supportsAppearance('lok')).toBeTrue();
    expect(supportsAppearance('7')).toBeFalse();
  });
});

describe('pre-paint script', () => {
  test('mirrors the registry so the first paint uses the stored theme', async () => {
    const html = await Bun.file('index.html').text();
    const script = html.match(/<script>\s*\(function \(\) \{[\s\S]*?\}\)\(\);\s*<\/script>/)?.[0] ?? '';

    expect(script).toContain(`"${THEME_STORAGE_KEY}"`);
    expect(script).toContain(`get("${THEME_QUERY_PARAM}")`);

    const layouts = JSON.parse(script.match(/var layouts = (\{[^}]*\});/)?.[1] ?? '{}');
    const chromes = JSON.parse(script.match(/var chromes = (\{[^}]*\});/)?.[1] ?? '{}');
    const darkCapable = JSON.parse(script.match(/var darkCapable = (\{[^}]*\});/)?.[1] ?? '{}');
    expect(layouts).toEqual(Object.fromEntries(THEME_IDS.map((id) => [id, THEMES[id].layout])));
    expect(chromes).toEqual(Object.fromEntries(THEME_IDS.map((id) => [id, THEMES[id].chrome])));
    expect(Object.keys(darkCapable).sort()).toEqual(THEME_IDS.filter(supportsAppearance).sort());
  });
});
