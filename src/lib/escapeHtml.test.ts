import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';
import { escapeHtml } from '@/lib/escapeHtml';
import { renderMarkdown } from '@/apps/notepad/markdown';

describe('escapeHtml', () => {
  it('escapes the five characters that matter in text and quoted attributes', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
    expect(escapeHtml('plain text')).toBe('plain text');
  });

  it('is the only escaper in the codebase', async () => {
    const offenders: string[] = [];
    for (const pattern of ['src/**/*.{ts,tsx}', 'worker/**/*.{ts,js}']) {
      for await (const file of new Glob(pattern).scan({ cwd: process.cwd() })) {
        if (file === 'src/lib/escapeHtml.ts' || file.endsWith('.test.ts')) continue;
        const lines = (await Bun.file(file).text()).split('\n');
        lines.forEach((line, index) => {
          if (/replace(All)?\([^)]*['"`](&amp;|&lt;|&quot;)/.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('Notepad links', () => {
  it('keep a query string with & intact (escaped once, not twice)', () => {
    const html = renderMarkdown('[q](https://a.com/?x=1&y=2)');
    expect(html).toContain('href="https://a.com/?x=1&amp;y=2"');
    expect(html).not.toContain('&amp;amp;');
  });

  it('still refuse javascript: links and cannot break out of the attribute', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('<a ');
    expect(renderMarkdown('[x](https://a.com/"onmouseover="alert(1))')).not.toContain('" onmouseover');
    expect(renderMarkdown('[x](https://a.com/"onmouseover="alert(1))')).not.toMatch(/href="[^"]*"onmouseover/);
  });
});
