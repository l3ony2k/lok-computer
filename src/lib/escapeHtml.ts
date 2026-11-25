/**
 * The one HTML escaper. It escapes all five characters that matter, so its
 * output is safe both as element text and inside a quoted attribute
 * (`"..."` or `'...'`). Imported by the app, the Worker and the build
 * settings, so it keeps to plain TypeScript with no imports of its own.
 */
const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ENTITIES[char]);
