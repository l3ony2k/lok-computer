import { defaultRng, type Rng } from './random';

/**
 * The decision wheel: presets, the option lists people edit, and the spin.
 * The winner is picked first (uniformly); the angle only shows it. Angles are
 * in degrees, clockwise from the top, where the pointer sits.
 */

export type WheelPresetId = 'lunch' | 'movie' | 'weekend' | 'pays' | 'mine';

export interface WheelPreset {
  id: WheelPresetId;
  label: string;
  options: readonly string[];
}

export const WHEEL_PRESETS: readonly WheelPreset[] = [
  { id: 'lunch', label: 'Lunch', options: ['Ramen', 'Dumplings', 'Burrito', 'Pho', 'Salad', 'Curry', 'Pizza', 'Sushi'] },
  { id: 'movie', label: 'Movie night', options: ['Comedy', 'Horror', 'Sci-fi', 'Documentary', 'Animation', 'Thriller', 'Romance', 'Western'] },
  { id: 'weekend', label: 'Weekend', options: ['Hike', 'Museum', 'Bike ride', 'Cook something new', 'Board games', 'Flea market', 'Read all day', 'Day trip'] },
  { id: 'pays', label: 'Who pays', options: ['Me', 'You', 'Split it', 'Whoever ate most', 'The youngest', 'The oldest'] },
  { id: 'mine', label: 'Mine', options: ['Tea', 'Coffee', 'Hot chocolate'] },
];

export const DEFAULT_WHEEL_PRESET: WheelPresetId = 'lunch';
export const MIN_WHEEL_OPTIONS = 2;
export const MAX_WHEEL_OPTIONS = 16;
/** Longer options are cut: the wheel and the history have no room for essays. */
export const MAX_OPTION_LENGTH = 40;

export const isWheelPresetId = (value: unknown): value is WheelPresetId => WHEEL_PRESETS.some((preset) => preset.id === value);

export const wheelPreset = (id: WheelPresetId): WheelPreset => WHEEL_PRESETS.find((preset) => preset.id === id) ?? WHEEL_PRESETS[0];

/** One option as typed: spaces collapsed and trimmed, cut to the maximum length. */
export const cleanOption = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, MAX_OPTION_LENGTH).trim();

const optionKey = (text: string) => text.toLocaleLowerCase();

/** A list as stored or edited: strings only, cleaned, no blanks, no repeats (ignoring case), at most 16. */
export const normalizeOptions = (options: unknown): string[] => {
  if (!Array.isArray(options)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const option of options) {
    if (typeof option !== 'string') continue;
    const text = cleanOption(option);
    if (!text || seen.has(optionKey(text))) continue;
    seen.add(optionKey(text));
    result.push(text);
    if (result.length >= MAX_WHEEL_OPTIONS) break;
  }
  return result;
};

export type AddOptionResult = { ok: true; options: string[] } | { ok: false; reason: 'empty' | 'duplicate' | 'full' };

export const addOption = (options: readonly string[], text: string): AddOptionResult => {
  const option = cleanOption(text);
  if (!option) return { ok: false, reason: 'empty' };
  if (options.some((current) => optionKey(current) === optionKey(option))) return { ok: false, reason: 'duplicate' };
  if (options.length >= MAX_WHEEL_OPTIONS) return { ok: false, reason: 'full' };
  return { ok: true, options: [...options, option] };
};

export const sameOptions = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((option, index) => option === b[index]);

// ---------- Saved state ----------

export interface WheelState {
  preset: WheelPresetId;
  /** Lists people edited, by preset; a preset not here shows its default list. */
  lists: Partial<Record<WheelPresetId, string[]>>;
}

export const DEFAULT_WHEEL_STATE: WheelState = { preset: DEFAULT_WHEEL_PRESET, lists: {} };

export const normalizeWheelState = (stored: unknown): WheelState => {
  if (!stored || typeof stored !== 'object') return DEFAULT_WHEEL_STATE;
  const candidate = stored as { preset?: unknown; lists?: unknown };
  const lists: WheelState['lists'] = {};
  if (candidate.lists && typeof candidate.lists === 'object') {
    for (const [id, options] of Object.entries(candidate.lists as Record<string, unknown>)) {
      if (isWheelPresetId(id) && Array.isArray(options)) lists[id] = normalizeOptions(options);
    }
  }
  return { preset: isWheelPresetId(candidate.preset) ? candidate.preset : DEFAULT_WHEEL_PRESET, lists };
};

export const wheelOptions = (state: WheelState, id: WheelPresetId = state.preset): string[] => state.lists[id] ?? [...wheelPreset(id).options];

// ---------- The spin ----------

export const sliceAngle = (count: number) => 360 / count;

const mod = (value: number, by: number) => ((value % by) + by) % by;

/** The slice under the pointer when the wheel is turned `rotation` degrees clockwise. */
export const sliceAtPointer = (rotation: number, count: number) => Math.min(count - 1, Math.floor(mod(-rotation, 360) / sliceAngle(count)));

export interface SpinPlan {
  winner: number;
  /** The rotation to end on: always ahead of `from`, by whole turns plus the landing. */
  to: number;
  turns: number;
  durationMs: number;
}

export const SPIN_TURNS = { min: 4, max: 6 } as const;
export const SPIN_MS = { min: 3500, max: 4500 } as const;
/** How far from a slice's edges the pointer may land, as a share of the slice. */
const EDGE_MARGIN = 0.12;

/**
 * Picks the winner uniformly, then the rotation that ends with the pointer
 * inside its slice: a few whole turns past `from`, landing at a random point
 * of the slice (not its centre, not on a line).
 */
export const planSpin = (from: number, count: number, rng: Rng = defaultRng): SpinPlan => {
  const winner = Math.min(count - 1, Math.floor(rng() * count));
  const turns = SPIN_TURNS.min + Math.min(SPIN_TURNS.max - SPIN_TURNS.min, Math.floor(rng() * (SPIN_TURNS.max - SPIN_TURNS.min + 1)));
  const within = EDGE_MARGIN + rng() * (1 - 2 * EDGE_MARGIN);
  const durationMs = Math.round(SPIN_MS.min + rng() * (SPIN_MS.max - SPIN_MS.min));
  // The wheel's own angle that must sit under the pointer, at the top.
  const landing = (winner + within) * sliceAngle(count);
  const base = from + turns * 360;
  // The rotation r puts wheel angle -r under the pointer, so r ≡ -landing.
  const to = base + mod(-landing - base, 360);
  return { winner, to, turns, durationMs };
};
