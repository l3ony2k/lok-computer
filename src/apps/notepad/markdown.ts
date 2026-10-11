/**
 * A small Markdown renderer for notes: headings, paragraphs with soft line
 * breaks, bold, italic, strikethrough, inline code, fenced code, links,
 * block quotes, lists and rules. Text is escaped before any markup is added,
 * and links only keep http, https and mailto addresses, so the output is safe
 * to insert as HTML.
 */

const escapeHtml = (text: string) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const safeHref = (href: string) => (/^(https?:\/\/|mailto:)/i.test(href.trim()) ? escapeHtml(href.trim()) : null);

/** Inline markup on already-escaped text. */
export const renderInline = (escaped: string): string => {
  let text = escaped;
  // Code spans are lifted out first (private-use markers never occur in notes) so nothing inside them is treated as markup.
  const codes: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) => {
    codes.push(`<code>${code}</code>`);
    return `\uE000${codes.length - 1}\uE001`;
  });
  text = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
    const safe = safeHref(href);
    return safe ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>` : match;
  });
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
  text = text.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
  return text.replace(/\uE000(\d+)\uE001/g, (_, index: string) => codes[Number(index)]);
};

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; lines: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'rule' };

const parseBlocks = (source: string): Block[] => {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (/^```/.test(line)) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ kind: 'code', lines: code });
      continue;
    }
    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    if (/^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: 'rule' });
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({ kind: 'quote', lines: quote });
      continue;
    }
    const bullet = /^\s*[-*+]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const marker = ordered ? numbered : bullet;
      const items: string[] = [];
      while (index < lines.length && marker.test(lines[index])) {
        items.push(lines[index].replace(marker, ''));
        index += 1;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !/^```/.test(lines[index])
      && !/^#{1,6}\s/.test(lines[index])
      && !/^>\s?/.test(lines[index])
      && !bullet.test(lines[index])
      && !numbered.test(lines[index])
      && !/^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ kind: 'paragraph', lines: paragraph });
  }
  return blocks;
};

const renderBlock = (block: Block): string => {
  switch (block.kind) {
    case 'heading':
      return `<h${block.level}>${renderInline(escapeHtml(block.text))}</h${block.level}>`;
    case 'code':
      return `<pre><code>${escapeHtml(block.lines.join('\n'))}</code></pre>`;
    case 'quote':
      return `<blockquote>${renderMarkdown(block.lines.join('\n'))}</blockquote>`;
    case 'list':
      return `<${block.ordered ? 'ol' : 'ul'}>${block.items.map((item) => `<li>${renderInline(escapeHtml(item))}</li>`).join('')}</${block.ordered ? 'ol' : 'ul'}>`;
    case 'rule':
      return '<hr>';
    case 'paragraph':
      // Notes keep their line breaks; a single newline is a break, not a space.
      return `<p>${block.lines.map((line) => renderInline(escapeHtml(line))).join('<br>')}</p>`;
  }
};

export const renderMarkdown = (source: string): string => parseBlocks(source).map(renderBlock).join('\n');
