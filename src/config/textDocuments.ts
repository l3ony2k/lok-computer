/**
 * The text documents with no application of their own: their deep links open
 * the Document window. Kept apart from the documents themselves
 * (src/config/documents.ts) so the route table does not pull their text into
 * the entry bundle.
 */

export const TEXT_DOCUMENT_PATHS = ["/privacy", "/contact", "/developers", "/docs"] as const;

export type TextDocumentPath = (typeof TEXT_DOCUMENT_PATHS)[number];

export function isTextDocumentPath(value: unknown): value is TextDocumentPath {
  return typeof value === "string" && (TEXT_DOCUMENT_PATHS as readonly string[]).includes(value);
}

/** The Document window's title: the path as a Markdown file name, e.g. privacy.md. */
export function textDocumentFileName(path: TextDocumentPath): string {
  return `${path.slice(1)}.md`;
}
