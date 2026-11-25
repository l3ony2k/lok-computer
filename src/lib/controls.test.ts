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

  /**
   * A window footer is an `.app-footer-row` (with `.app-footer-note` for small
   * muted status text and `.app-footer-actions` for its buttons), so every theme
   * styles one footer. A hand-written footer row (Are.na once had its own)
   * misses the themes' status-bar rules.
   */
  it('builds every window footer from app-footer-row', async () => {
    const offenders: string[] = [];
    for await (const file of new Glob('src/**/*.tsx').scan({ cwd: process.cwd() })) {
      const lines = (await Bun.file(file).text()).split('\n');
      lines.forEach((line, index) => {
        if (!/\bfooter=\{/.test(line)) return;
        if (!/\bapp-footer-row\b/.test(lines.slice(index, index + 4).join('\n'))) offenders.push(`${file}:${index + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  /**
   * Popups portal into getOverlayRoot(), so inside the Palm phone frame they
   * open in the frame. The Palm confirmation is the one exception: it covers
   * the whole screen before the frame exists.
   */
  it('portals popups into the overlay root', async () => {
    const allowed = new Set(['src/components/system/ThemePicker.tsx']);
    const offenders: string[] = [];
    for await (const file of new Glob('src/**/*.tsx').scan({ cwd: process.cwd() })) {
      if (allowed.has(file)) continue;
      const text = await Bun.file(file).text();
      if (!/\bcreatePortal\(/.test(text)) continue;
      text.split('\n').forEach((line, index) => {
        if (/^\s*document\.body\s*,?\s*\)?\s*$|,\s*document\.body\s*\)/.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
