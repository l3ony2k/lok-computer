import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';

/**
 * A bare <select> opens the operating system's list, which no theme can style.
 * Dropdowns go through components/ui/Select, whose list is drawn with the
 * theme's menu classes.
 */
describe('form controls', () => {
  it('builds every dropdown with Select', async () => {
    const offenders: string[] = [];
    for await (const file of new Glob('src/**/*.tsx').scan({ cwd: process.cwd() })) {
      if (file === 'src/components/ui/Select.tsx') continue;
      const lines = (await Bun.file(file).text()).split('\n');
      lines.forEach((line, index) => {
        if (/<select\b/.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  /**
   * Tab strips go through components/ui/TabStrip, which lays tabs out in rows
   * (the selected tab's row against the page) and gives them tab roles; a
   * hand-built `.app-tab-bar` would miss both.
   */
  it('builds every tab strip with TabStrip', async () => {
    const offenders: string[] = [];
    for await (const file of new Glob('src/**/*.tsx').scan({ cwd: process.cwd() })) {
      if (file === 'src/components/ui/TabStrip.tsx') continue;
      const lines = (await Bun.file(file).text()).split('\n');
      lines.forEach((line, index) => {
        if (/\bapp-tab-bar\b/.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  /**
   * A menu row's keyboard (or pointer-followed) highlight is `data-highlighted`,
   * the attribute every theme's menu highlight styles. A row marked another way
   * (the launcher once used `data-active`) misses each theme's highlight rules.
   */
  it('highlights menu rows with data-highlighted only', async () => {
    const offenders: string[] = [];
    for await (const file of new Glob('src/**/*.tsx').scan({ cwd: process.cwd() })) {
      const text = await Bun.file(file).text();
      if (!/\bmenu-item-button\b/.test(text)) continue;
      text.split('\n').forEach((line, index) => {
        if (/\bdata-active=/.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
