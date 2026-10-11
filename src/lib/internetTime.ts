/**
 * Swatch Internet Time: one day is 1000 .beats counted from midnight in
 * Biel, Switzerland (UTC+1, no daylight saving), so the same reading holds
 * everywhere at once.
 */

const BIEL_OFFSET_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** One beat is 86.4 s, so a centibeat is 864 ms. */
const CENTIBEAT_MS = 864;
const CENTIBEATS_PER_DAY = 100_000;

/** Formats `date` as "412.33": three-digit beats, a dot, two centibeats. */
export const swatchBeats = (date: Date): string => {
  // Integer milliseconds keep exact boundaries exact; dividing by 86.4 in
  // floating point read 999.99 at Biel midnight.
  const utcMs = ((date.getUTCHours() * 60 + date.getUTCMinutes()) * 60 + date.getUTCSeconds()) * 1000
    + date.getUTCMilliseconds();
  const bielMs = (utcMs + BIEL_OFFSET_MS) % DAY_MS;
  const centibeats = Math.floor(bielMs / CENTIBEAT_MS) % CENTIBEATS_PER_DAY;
  const beats = Math.floor(centibeats / 100).toString().padStart(3, '0');
  const fraction = (centibeats % 100).toString().padStart(2, '0');
  return `${beats}.${fraction}`;
};
