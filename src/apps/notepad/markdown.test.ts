import { describe, expect, test } from 'bun:test';
import { renderInline, renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  test('renders headings, paragraphs with soft breaks, and rules', () => {
    expect(renderMarkdown('# Title\n\nline one\nline two\n\n---')).toBe('<h1>Title</h1>\n<p>line one<br>line two</p>\n<hr>');
  });

  test('renders lists, quotes and fenced code', () => {
    expect(renderMarkdown('- a\n- b\n\n1. one\n2) two')).toBe('<ul><li>a</li><li>b</li></ul>\n<ol><li>one</li><li>two</li></ol>');
    expect(renderMarkdown('> quoted\n> **bold**')).toBe('<blockquote><p>quoted<br><strong>bold</strong></p></blockquote>');
    expect(renderMarkdown('```\nconst x = <b>1</b>;\n```')).toBe('<pre><code>const x = &lt;b&gt;1&lt;/b&gt;;</code></pre>');
  });

  test('escapes HTML and keeps only safe links', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    expect(renderInline('[ok](https://lok.computer)')).toBe('<a href="https://lok.computer" target="_blank" rel="noopener noreferrer">ok</a>');
    expect(renderInline('[bad](javascript:alert(1))')).toBe('[bad](javascript:alert(1))');
  });

  test('handles inline markup without touching code spans', () => {
    expect(renderInline('**b** *i* _i_ ~~s~~ `**not bold**`')).toBe('<strong>b</strong> <em>i</em> <em>i</em> <s>s</s> <code>**not bold**</code>');
    expect(renderInline('snake_case_name stays')).toBe('snake_case_name stays');
  });
});
