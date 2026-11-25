import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';

/**
 * The page's stacking order is the `--z-*` scale at the top of src/index.css.
 * A component or stylesheet that writes its own large z-index escapes it, and
 * the order of the layers can no longer be read in one place. Small values
 * (up to 10) that order things inside one window or component stay literal.
 * Windows are numbered by the window manager from FIRST_Z_INDEX
 * (src/lib/windowZOrder.ts), which this test does not match.
 */
const LOCAL_MAX = 10;

const scan = async (pattern: string, rules: RegExp[]) => {
  const offenders: string[] = [];
  for await (const file of new Glob(pattern).scan({ cwd: process.cwd() })) {
    if (/\.test\.tsx?$/.test(file)) continue;
    const lines = (await Bun.file(file).text()).split('\n');
    lines.forEach((line, index) => {
      for (const rule of rules) {
        for (const match of line.matchAll(rule)) {
          if (Math.abs(Number(match[1])) > LOCAL_MAX) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      }
    });
  }
  return offenders;
};

describe('z-index scale', () => {
  it('keeps stylesheets on the --z-* scale', async () => {
    expect(await scan('src/**/*.css', [/z-index:\s*(-?\d+)/g])).toEqual([]);
  });

  it('keeps components on the --z-* scale', async () => {
    const rules = [
      /\bz-\[(-?\d+)\]/g, // Tailwind arbitrary value: z-[10000]
      /(?<![\w-])-?z-(\d+)\b/g, // Tailwind scale class: z-50
      /zIndex:\s*['"]?(-?\d+)/g, // inline style: zIndex: 9999
    ];
    expect(await scan('src/**/*.{ts,tsx}', rules)).toEqual([]);
  });

  it('defines the scale once, on :root in index.css', async () => {
    const css = await Bun.file('src/index.css').text();
    const names = [...css.matchAll(/^\s*(--z-[\w-]+):/gm)].map((match) => match[1]);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);

    const unknown: string[] = [];
    for await (const file of new Glob('src/**/*.{css,ts,tsx}').scan({ cwd: process.cwd() })) {
      const text = await Bun.file(file).text();
      for (const match of text.matchAll(/var\((--z-[\w-]+)\)/g)) {
        if (!names.includes(match[1])) unknown.push(`${file}: ${match[1]}`);
      }
    }
    expect(unknown).toEqual([]);
  });
});
