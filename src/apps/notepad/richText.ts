/**
 * Rich-text helpers for Notepad: a whitelist sanitiser for the HTML a
 * contentEditable produces (and for anything pasted into it), and conversions
 * between HTML and plain text when a note changes format.
 */

const ALLOWED_TAGS = new Set(['P', 'BR', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'A', 'HR']);

const sanitizeNode = (node: Node, output: Node) => {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      output.appendChild(child.cloneNode());
      continue;
    }
    if (!(child instanceof HTMLElement)) continue;
    if (!ALLOWED_TAGS.has(child.tagName)) {
      // Unknown wrappers (fonts, styles, scripts' siblings) keep their text, lose the element.
      if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') sanitizeNode(child, output);
      continue;
    }
    const clean = document.createElement(child.tagName.toLowerCase());
    if (child.tagName === 'A') {
      const href = child.getAttribute('href') ?? '';
      if (/^(https?:\/\/|mailto:)/i.test(href)) {
        clean.setAttribute('href', href);
        clean.setAttribute('target', '_blank');
        clean.setAttribute('rel', 'noopener noreferrer');
      }
    }
    sanitizeNode(child, clean);
    output.appendChild(clean);
  }
};

/** Keeps structure and emphasis, drops attributes, styles, and anything executable. */
export const sanitizeHtml = (html: string): string => {
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const container = document.createElement('div');
  sanitizeNode(parsed.body, container);
  return container.innerHTML;
};

/** Plain text with one line per block, for turning a rich note into text or Markdown. */
export const htmlToText = (html: string): string => {
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const lines: string[] = [];
  let current = '';
  const flush = () => {
    lines.push(current);
    current = '';
  };
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        current += child.textContent ?? '';
        continue;
      }
      if (!(child instanceof HTMLElement)) continue;
      const block = /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE|HR)$/.test(child.tagName);
      if (child.tagName === 'BR') {
        flush();
        continue;
      }
      if (block && current) flush();
      walk(child);
      if (block) flush();
    }
  };
  walk(parsed.body);
  if (current) flush();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const escapeHtml = (text: string) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/** Plain text to paragraphs, for turning a text note into a rich one. */
export const textToHtml = (text: string): string => (
  text.split(/\n{2,}/).filter((paragraph) => paragraph.trim()).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('')
);
