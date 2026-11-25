import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';

/**
 * lok's channel list is one React Query query (hooks/useUserChannels), so a
 * background cache refresh reaches every place that shows it. A component that
 * calls getUserChannels itself would keep its first copy forever.
 */
describe('the Are.na channel list', () => {
  it('is loaded only through useUserChannels', async () => {
    const offenders: string[] = [];
    for await (const file of new Glob('src/**/*.{ts,tsx}').scan({ cwd: process.cwd() })) {
      if (file.endsWith('.test.ts') || file === 'src/lib/api.ts' || file === 'src/hooks/useUserChannels.ts') continue;
      const lines = (await Bun.file(file).text()).split('\n');
      lines.forEach((line, index) => {
        if (/\bgetUserChannels\s*\(|import[^;]*\bgetUserChannels\b/.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
