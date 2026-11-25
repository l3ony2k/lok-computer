import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';
import { createId } from './id';

const SELF = 'src/lib/sharedHelpers.test.ts';

/** Lines in src/**\/*.{ts,tsx} matching `pattern`, outside the files allowed to have it. */
const offenders = async (pattern: RegExp, allowed: readonly string[]) => {
  const found: string[] = [];
  for await (const file of new Glob('src/**/*.{ts,tsx}').scan({ cwd: process.cwd() })) {
    if (file === SELF || allowed.includes(file)) continue;
    const lines = (await Bun.file(file).text()).split('\n');
    lines.forEach((line, index) => {
      if (pattern.test(line)) found.push(`${file}:${index + 1}: ${line.trim()}`);
    });
  }
  return found;
};

describe('createId', () => {
  it('makes distinct ids, with the prefix in front when given', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createId()));
    expect(ids.size).toBe(200);
    expect(createId()).toMatch(/^[0-9a-z]+-[0-9a-z]+$/);
    expect(createId('run')).toMatch(/^run-[0-9a-z]+-[0-9a-z]+$/);
  });
});

/**
 * Small helpers that every app shares, so a copy written by hand cannot drift
 * from the others (one toast wording, one feature check, one id format).
 */
describe('shared helpers', () => {
  it('makes ids with createId (lib/id.ts)', async () => {
    expect(await offenders(/Math\.random\(\)\.toString\(36\)/, ['src/lib/id.ts'])).toEqual([]);
  });

  it('checks reduced motion in script with prefersReducedMotion (lib/motion.ts)', async () => {
    // Stylesheets keep their own `@media (prefers-reduced-motion)` rules.
    expect(await offenders(/prefers-reduced-motion/, ['src/lib/motion.ts'])).toEqual([]);
  });

  it('copies to the clipboard with copyText (lib/clipboard.ts)', async () => {
    expect(await offenders(/clipboard\.writeText/, ['src/lib/clipboard.ts'])).toEqual([]);
  });

  /**
   * Measuring an element goes through hooks/useResizeObserver. The files listed
   * observe as part of something larger (scroll and mutation tracking, a canvas
   * loop, infinite scroll), read the observer's own entries, or clean up beyond
   * disconnecting, so they keep their own observer.
   */
  it('measures elements with useResizeObserver', async () => {
    expect(await offenders(/new ResizeObserver\b/, [
      'src/hooks/useResizeObserver.ts',
      'src/hooks/useScrollFade.ts',
      'src/components/window/DraggableWindow.tsx',
      'src/apps/chance/useTableFit.ts',
      'src/apps/weather/WeatherApp.tsx',
      'src/apps/arena/components/ArenaFileView.tsx',
      'src/apps/media/SpectrumAnalyzer.tsx',
    ])).toEqual([]);
  });
});
