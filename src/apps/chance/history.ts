/** Entries each Chance history keeps, newest first (Moon blocks keeps fewer: whole questions). */
export const HISTORY_LIMIT = 30;

/** Puts `entry` at the front of a newest-first history and drops what falls past `cap`. */
export const pushHistory = <T,>(prev: readonly T[], entry: T, cap: number = HISTORY_LIMIT): T[] => [entry, ...prev].slice(0, cap);
