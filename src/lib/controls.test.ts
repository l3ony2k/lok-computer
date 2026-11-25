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
   * Radio groups go through components/ui/Segmented, which draws them with
   * RetroButton (so every skin draws them) and gives them arrow-key, Home and
   * End navigation with one tab stop. ThemePicker's swatch grid is a gallery of
   * cards, not a row of buttons, and keeps its own radios.
   */
  it('builds every radio group with Segmented', async () => {
    const allowed = new Set(['src/components/ui/Segmented.tsx', 'src/components/system/ThemePicker.tsx']);
    const offenders: string[] = [];
    for await (const file of new Glob('src/**/*.tsx').scan({ cwd: process.cwd() })) {
      if (allowed.has(file)) continue;
      const lines = (await Bun.file(file).text()).split('\n');
      lines.forEach((line, index) => {
        if (/role=\{?["']radio["']/.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  /**
   * Two-step "click again to confirm" buttons go through
   * components/ui/ConfirmButton, which clears its disarm timers; the
   * hand-written `onBlur={() => setTimeout(...)}` copies never did.
   */
  it('builds every click-twice confirmation with ConfirmButton', async () => {
    const offenders: string[] = [];
    for await (const file of new Glob('src/**/*.tsx').scan({ cwd: process.cwd() })) {
      if (file === 'src/components/ui/ConfirmButton.tsx') continue;
      const lines = (await Bun.file(file).text()).split('\n');
      lines.forEach((line, index) => {
        if (/onBlur=\{\s*\(\)\s*=>\s*setTimeout\(/.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
