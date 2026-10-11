/**
 * Pure time-zone helpers for the Clock app. Everything goes through Intl so
 * daylight saving and historical offsets come from the browser's own zone
 * database instead of a bundled table.
 */

export interface ClockZone {
  id: string;
  label: string;
}

export interface ClockState {
  zones: ClockZone[];
}

export type DayRelation = 'same' | 'tomorrow' | 'yesterday';

export const CLOCK_STATE_KEY = 'app:clock';

/** Enough rows for every whole-hour offset without the list becoming a scroll chore. */
export const MAX_ZONES = 24;

/** Intl rejects an unknown zone with a RangeError, which is the only portable check. */
export const isSupportedZone = (id: string): boolean => {
  if (typeof id !== 'string' || id.trim() === '') return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: id });
    return true;
  } catch {
    return false;
  }
};

/** "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export const zoneLabel = (id: string): string => {
  const segment = id.split('/').pop() ?? id;
  return segment.replace(/_/g, ' ');
};

// tzdata 2022b renamed Ukraine's capital; older zone databases only know the old spelling.
const KYIV_ZONE = isSupportedZone('Europe/Kyiv') ? 'Europe/Kyiv' : 'Europe/Kiev';

export const DEFAULT_ZONES: readonly ClockZone[] = [
  { id: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { id: 'Asia/Tokyo', label: 'Tokyo' },
  { id: 'Asia/Ho_Chi_Minh', label: 'Hà Nội' },
  { id: 'America/Los_Angeles', label: 'Los Angeles' },
  { id: 'America/New_York', label: 'New York' },
  { id: 'Europe/London', label: 'London' },
  { id: KYIV_ZONE, label: 'Kyiv' },
];

const DEFAULT_LABELS = new Map<string, string>([
  ...DEFAULT_ZONES.map((zone) => [zone.id, zone.label] as const),
  ['Europe/Kyiv', 'Kyiv'],
  ['Europe/Kiev', 'Kyiv'],
]);

/** The default label where one exists (Hà Nội, Kyiv), otherwise the city from the id. */
export const labelForZone = (id: string): string => DEFAULT_LABELS.get(id) ?? zoneLabel(id);

export const defaultClockState = (): ClockState => ({ zones: DEFAULT_ZONES.map((zone) => ({ ...zone })) });

/** All zones the browser can format, or the defaults when it cannot enumerate them. */
export const supportedZones = (): string[] => {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const zones = Intl.supportedValuesOf('timeZone');
      if (zones.length > 0) return zones;
    }
  } catch {
    // Enumeration is optional; the defaults still work.
  }
  return DEFAULT_ZONES.map((zone) => zone.id);
};

/** The browser's zone, or UTC when it reports nothing usable. */
export const localZoneId = (): string => {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isSupportedZone(zone) ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
};

type Preset = 'wall' | 'time' | 'clock' | 'date';

const PRESETS: Record<Preset, Intl.DateTimeFormatOptions> = {
  wall: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  clock: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  date: { weekday: 'short', day: 'numeric', month: 'short' },
};

// Formatters are costly to build and the app renders two dozen of them twice a second.
const formatters = new Map<string, Intl.DateTimeFormat>();

const formatter = (preset: Preset, timeZone: string): Intl.DateTimeFormat => {
  const key = `${preset}|${timeZone}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat('en-GB', { ...PRESETS[preset], timeZone, hourCycle: 'h23' });
    formatters.set(key, cached);
  }
  return cached;
};

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const wallClock = (id: string, date: Date): WallClock => {
  const parts = formatter('wall', id).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    // Some engines print midnight as "24" even under h23.
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  };
};

/** Minutes east of UTC for `id` at `date`, so Hong Kong is 480 and Los Angeles −420 in summer. */
export const zoneOffsetMinutes = (id: string, date: Date): number => {
  const wall = wallClock(id, date);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  const utc = date.getTime() - date.getUTCMilliseconds();
  return Math.round((asUtc - utc) / 60_000);
};

const MINUS = '−';

const splitOffset = (minutes: number): { sign: string; hours: number; rest: string } => {
  const abs = Math.abs(minutes);
  const rest = abs % 60;
  return {
    sign: minutes < 0 ? MINUS : '+',
    hours: Math.floor(abs / 60),
    rest: rest === 0 ? '' : rest.toString().padStart(2, '0'),
  };
};

/** "UTC+8", "UTC−5", "UTC+5:30", or "UTC" at zero. */
export const formatUtcOffset = (minutes: number): string => {
  if (minutes === 0) return 'UTC';
  const { sign, hours, rest } = splitOffset(minutes);
  return `UTC${sign}${hours}${rest ? `:${rest}` : ''}`;
};

/** The difference to local time: "+7h", "−5h", "+5h30", or "same". */
export const formatDelta = (minutes: number): string => {
  if (minutes === 0) return 'same';
  const { sign, hours, rest } = splitOffset(minutes);
  return `${sign}${hours}h${rest}`;
};

const dayNumber = (id: string, date: Date): number => {
  const wall = wallClock(id, date);
  return Date.UTC(wall.year, wall.month - 1, wall.day);
};

/** Whether `id` is already on tomorrow's date, or still on yesterday's, relative to `localZone`. */
export const dayRelation = (id: string, localZone: string, date: Date): DayRelation => {
  const diff = dayNumber(id, date) - dayNumber(localZone, date);
  if (diff === 0) return 'same';
  return diff > 0 ? 'tomorrow' : 'yesterday';
};

/** 24-hour wall time in `id`: "14:05", or "14:05:09" with seconds. */
export const formatZoneTime = (id: string, date: Date, withSeconds = false): string =>
  formatter(withSeconds ? 'clock' : 'time', id).format(date);

/** "Sat 11 Oct" in `id`. */
export const formatZoneDate = (id: string, date: Date): string => formatter('date', id).format(date);

const readEntry = (entry: unknown): { id: unknown; label: unknown } => {
  if (typeof entry === 'string') return { id: entry, label: undefined };
  if (entry && typeof entry === 'object') {
    const record = entry as { id?: unknown; label?: unknown };
    return { id: record.id, label: record.label };
  }
  return { id: undefined, label: undefined };
};

/**
 * Repairs a stored state: anything that is not a zone list becomes the
 * defaults, while a list keeps only supported, distinct zones (an emptied
 * list stays empty, since Reset is one click away).
 */
export const normalizeClockState = (stored: unknown): ClockState => {
  const raw = stored && typeof stored === 'object' ? (stored as { zones?: unknown }).zones : undefined;
  if (!Array.isArray(raw)) return defaultClockState();

  const seen = new Set<string>();
  const zones: ClockZone[] = [];
  for (const entry of raw) {
    if (zones.length >= MAX_ZONES) break;
    const { id, label } = readEntry(entry);
    if (typeof id !== 'string' || !isSupportedZone(id)) continue;
    // Intl accepts any casing, so "asia/tokyo" would otherwise sit beside "Asia/Tokyo".
    const key = id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const trimmed = typeof label === 'string' ? label.trim() : '';
    zones.push({ id, label: trimmed || labelForZone(id) });
  }
  return { zones };
};
