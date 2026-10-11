import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';

/**
 * On phones, 100vh is the viewport with the browser toolbar collapsed. A layer
 * that tall ends behind the toolbar, and the body is overflow: clip, so nothing
 * can scroll it into view (the first-run setup footer was unreachable). Size
 * full-height layers with 100dvh, or from a fixed, inset: 0 parent.
 */
describe('viewport height units', () => {
  it('never size a layer with 100vh', async () => {
    const forbidden = /100vh|\bh-screen\b|\bmin-h-screen\b|\bmax-h-screen\b/;
    const offenders: string[] = [];
    for await (const file of new Glob('src/**/*.{css,ts,tsx}').scan({ cwd: process.cwd() })) {
      if (file.endsWith('.test.ts')) continue;
      const lines = (await Bun.file(file).text()).split('\n');
      lines.forEach((line, index) => {
        if (forbidden.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
