import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';

/**
 * Text has three colours, defined once per theme: --text-color (main),
 * --text-secondary (de-emphasised body copy) and --log-muted (meta, captions,
 * footers; Tailwind's text-muted-foreground is the same colour). Hand-made
 * fades of the text colour drifted to thirteen strengths and several fell
 * below a readable contrast, so app code uses the tokens instead.
 *
 * Opacity stays right for disabled controls, icons, images and hints on rows
 * that invert when selected (menus, the launcher): it follows whatever colour
 * the row has. Theme skins (src/themes) are their designers' palettes.
 */

const sources = async (pattern: string): Promise<Array<{ file: string; lines: string[] }>> => {
  const found: Array<{ file: string; lines: string[] }> = [];
  for await (const file of new Glob(pattern).scan({ cwd: process.cwd() })) {
    if (file.startsWith('src/themes/') || file.endsWith('.test.ts')) continue;
    found.push({ file, lines: (await Bun.file(file).text()).split('\n') });
  }
  return found;
};

describe('text colour tokens', () => {
  it('never fades text by mixing the text colour by hand', async () => {
    const forbidden = /(^|[\s;{])color:\s*color-mix\(\s*in srgb,\s*var\(--text-color\)/;
    const offenders: string[] = [];
    for (const { file, lines } of await sources('src/**/*.css')) {
      lines.forEach((line, index) => {
        if (forbidden.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('never fades text with an opacity class', async () => {
    // State variants (disabled:, hover:) fade whole controls; a decorative emoji
    // placeholder (noto-emoji) is not text anyone reads.
    const forbidden = /(?<![\w:-])opacity-\d+\b/;
    const offenders: string[] = [];
    for (const { file, lines } of await sources('src/**/*.tsx')) {
      lines.forEach((line, index) => {
        if (forbidden.test(line) && !line.includes('noto-emoji')) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

/** Reads one `--name: #rrggbb;` or `--name: H S% L%;` value from a block of index.css. */
const readBlock = (css: string, opener: string): Record<string, string> => {
  const start = css.indexOf(opener);
  const body = css.slice(start, css.indexOf('\n    }', start));
  const values: Record<string, string> = {};
  for (const match of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) values[match[1]] = match[2].trim();
  return values;
};

const toRgb = (value: string): [number, number, number] => {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) as [number, number, number];
  const hsl = value.match(/^0 0% (\d+(?:\.\d+)?)%/);
  if (hsl) {
    const grey = Math.round((Number(hsl[1]) / 100) * 255);
    return [grey, grey, grey];
  }
  throw new Error(`Unreadable colour: ${value}`);
};

const luminance = ([r, g, b]: [number, number, number]) => {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('lok text colours are readable', async () => {
  const css = await Bun.file('src/index.css').text();
  const modes = { light: readBlock(css, '    :root {'), dark: readBlock(css, '    .dark {') };
  const surfaces = ['detail-bg', 'detail-header-bg', 'detail-meta-bg', 'block-bg'];

  for (const [mode, tokens] of Object.entries(modes)) {
    it(`${mode}: every text role passes 4.5:1 on every surface`, () => {
      const failures: string[] = [];
      for (const role of ['text-color', 'text-secondary', 'log-muted']) {
        for (const surface of surfaces) {
          const ratio = contrast(tokens[role], tokens[surface]);
          if (ratio < 4.5) failures.push(`--${role} on --${surface}: ${ratio.toFixed(2)}:1`);
        }
      }
      expect(failures).toEqual([]);
    });

    it(`${mode}: Tailwind's muted foreground is the same colour as --log-muted`, () => {
      expect(toRgb(tokens['muted-foreground'])).toEqual(toRgb(tokens['log-muted']));
    });
  }
});
