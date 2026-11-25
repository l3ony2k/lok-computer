/**
 * M8gic: a ball that answers yes-or-no questions. Our own twenty answers
 * (ten yes, five maybe, five no), drawn uniformly, and the line breaks that
 * fit each one inside the triangle on the die.
 */
import { defaultRng, type Rng } from './random';

export type M8gicKind = 'yes' | 'maybe' | 'no';

export interface M8gicAnswer {
  text: string;
  kind: M8gicKind;
}

export const M8GIC_ANSWERS: readonly M8gicAnswer[] = [
  { text: 'Yes, duh', kind: 'yes' },
  { text: 'Sure as rain', kind: 'yes' },
  { text: 'Of course', kind: 'yes' },
  { text: 'The stars agree', kind: 'yes' },
  { text: 'Go for it', kind: 'yes' },
  { text: 'Bet on it', kind: 'yes' },
  { text: 'Yes, and soon', kind: 'yes' },
  { text: 'Easy yes', kind: 'yes' },
  { text: 'Do it today', kind: 'yes' },
  { text: 'Every bone says yes', kind: 'yes' },
  { text: 'Coffee first', kind: 'maybe' },
  { text: 'Too foggy to tell', kind: 'maybe' },
  { text: 'Hmm. Shake again', kind: 'maybe' },
  { text: 'Ask me tomorrow', kind: 'maybe' },
  { text: 'Could go either way', kind: 'maybe' },
  { text: 'My sources say nope', kind: 'no' },
  { text: 'Not a chance', kind: 'no' },
  { text: 'Nope', kind: 'no' },
  { text: 'Let it go', kind: 'no' },
  { text: 'Not this time', kind: 'no' },
];

/** An index into M8GIC_ANSWERS, every answer equally likely. */
export const drawM8gic = (rng: Rng = defaultRng): number => (
  Math.min(M8GIC_ANSWERS.length - 1, Math.floor(rng() * M8GIC_ANSWERS.length))
);

/**
 * The die face, in the window's 100-unit box: an equilateral triangle
 * pointing up, inscribed in a circle of radius 44 around the window's centre,
 * so its incircle centre (two thirds of the height down from the apex) is the
 * window's centre too. Answers sit as a block centred on that point.
 */
export const DIE = {
  cx: 50,
  cy: 50,
  apexY: 6,
  baseY: 72,
  halfBase: 44 * Math.sin(Math.PI / 3),
} as const;

export const TRIANGLE_POINTS = [
  [DIE.cx, DIE.apexY],
  [DIE.cx + DIE.halfBase, DIE.baseY],
  [DIE.cx - DIE.halfBase, DIE.baseY],
].map(([x, y]) => `${+x.toFixed(3)},${y}`).join(' ');

/** The largest and smallest text size on the die, in the box's units. */
const MAX_SIZE = 9;
const MIN_SIZE = 4;
/** Capital height and line pitch, in ems (bold Helvetica/Arial). */
export const CAP_HEIGHT = 0.72;
const LINE_PITCH = 1.2;
/** Clear space between a line's ends and the triangle's sides, in box units. */
const SIDE_MARGIN = 3.2;

/** About how wide a bold capital line runs, in ems; narrow marks count less. */
export const lineEms = (line: string) => [...line].reduce((sum, char) => (
  sum + (char === ' ' ? 0.28 : /[.,'’I]/.test(char) ? 0.3 : /[MW]/.test(char) ? 0.86 : 0.7)
), 0);

/** The triangle's width at height y (zero above the apex). */
export const triangleWidthAt = (y: number) => Math.max(0, (2 * DIE.halfBase * (y - DIE.apexY)) / (DIE.baseY - DIE.apexY));

export interface DieLayout {
  lines: string[];
  /** Text size, in box units. */
  size: number;
  /** Each line's baseline, top to bottom. */
  baselines: number[];
}

/** Where each line's capitals sit when the block is centred on the incircle centre. */
const capCentres = (count: number, size: number) => Array.from({ length: count }, (_, index) => (
  DIE.cy + (index - (count - 1) / 2) * size * LINE_PITCH
));

/** The largest size at which these lines fit the triangle, each checked at the top of its capitals (its narrowest). */
const fitSize = (lines: string[]) => {
  for (let size = MAX_SIZE; size >= MIN_SIZE; size -= 0.1) {
    const centres = capCentres(lines.length, size);
    const fits = lines.every((line, index) => (
      lineEms(line) * size + 2 * SIDE_MARGIN <= triangleWidthAt(centres[index] - (size * CAP_HEIGHT) / 2)
    ));
    if (fits) return Math.round(size * 10) / 10;
  }
  return 0;
};

/** Every way to cut the words into one to three lines, in order. */
const splits = (words: string[], maxLines: number): string[][] => {
  if (maxLines === 1 || words.length === 1) return [[words.join(' ')]];
  const result: string[][] = [[words.join(' ')]];
  for (let cut = 1; cut < words.length; cut += 1) {
    for (const rest of splits(words.slice(cut), maxLines - 1)) result.push([words.slice(0, cut).join(' '), ...rest]);
  }
  return result;
};

/**
 * Lays an answer out on the die: of every split into one to three lines,
 * the one that allows the largest text (fewer lines unless more give clearly larger text), the block
 * centred vertically on the incircle centre. Null when nothing fits.
 */
export const layoutDie = (text: string): DieLayout | null => {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  let best: { lines: string[]; size: number } | null = null;
  // Fewest lines first, so a tie keeps the fewer lines.
  for (const lines of splits(words, 3).sort((a, b) => a.length - b.length)) {
    const size = fitSize(lines);
    if (size && (!best || size > best.size + 0.4)) best = { lines, size };
  }
  if (!best) return null;
  const baselines = capCentres(best.lines.length, best.size).map((centre) => +(centre + (best.size * CAP_HEIGHT) / 2).toFixed(2));
  return { ...best, baselines };
};

export const kindCounts = (kinds: readonly M8gicKind[]) => ({
  yes: kinds.filter((kind) => kind === 'yes').length,
  maybe: kinds.filter((kind) => kind === 'maybe').length,
  no: kinds.filter((kind) => kind === 'no').length,
});
