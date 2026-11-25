/**
 * A short id that is unique enough for one browser: the time in base 36 and
 * six random characters, with an optional prefix (`run-…`, `route-…`). Ids are
 * opaque: they key lists, mark handled requests and persist with the data,
 * but nothing parses them. Every module makes ids here (sharedHelpers.test.ts checks).
 */
export const createId = (prefix?: string): string => {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return prefix ? `${prefix}-${id}` : id;
};
