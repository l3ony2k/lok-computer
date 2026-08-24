/**
 * Prevent an infinite query from requesting the same page forever when an
 * upstream provider repeats its cursor at the end of a feed.
 */
export function getNextCursor(currentCursor: string | undefined, candidate: string | undefined): string | undefined {
  if (!candidate || candidate === currentCursor) return undefined;
  return candidate;
}
