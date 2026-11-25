/**
 * Moon blocks (筊杯, jiaobei): two crescent blocks thrown together to ask a
 * yes-or-no question. Each block lands on its own, flat side up or round
 * side up with even odds, and the answer is read from the pair afterwards:
 * the outcome is never chosen first. Every draw takes an `rng` so tests can
 * be deterministic.
 */
import { defaultRng, type Rng } from './random';

export type BlockFace = 'flat' | 'round';
export type BlockPair = readonly [BlockFace, BlockFace];
export type MoonAnswer = 'yes' | 'laughing' | 'no';

/** Three yeses in a row settle the question. */
export const SETTLE_STREAK = 3;

export const MOON_ANSWERS: Record<MoonAnswer, { hanzi: string; pinyin: string; name: string; explanation: string }> = {
  yes: { hanzi: '聖筊', pinyin: 'shèng jiǎo', name: 'Yes', explanation: 'One flat side up, one round: yes.' },
  laughing: { hanzi: '笑筊', pinyin: 'xiào jiǎo', name: 'Laughing', explanation: 'Both flat sides up: the gods laugh.' },
  no: { hanzi: '陰筊', pinyin: 'yīn jiǎo', name: 'No', explanation: 'Both round sides up: no.' },
};

/** One block: flat side up or round side up, each half the time. */
export const throwBlock = (rng: Rng = defaultRng): BlockFace => (rng() < 0.5 ? 'flat' : 'round');

/** Both blocks, each drawn on its own. */
export const throwBlocks = (rng: Rng = defaultRng): BlockPair => [throwBlock(rng), throwBlock(rng)];

/** The answer the pair shows: one of each is yes, two flat laugh, two round say no. */
export const readBlocks = ([first, second]: BlockPair): MoonAnswer => {
  if (first !== second) return 'yes';
  return first === 'flat' ? 'laughing' : 'no';
};

// ---------- Questions ----------

/**
 * A question, the way temples ask one: it starts with its first throw and
 * runs until it is answered. 陰筊 always ends it as no; 笑筊 means unclear
 * and never ends it. How many 聖筊 make a yes depends on how serious the
 * question is:
 * - simple: one 聖筊 answers yes; 笑筊 just means ask again.
 * - usual: three 聖筊 in total; 笑筊 means ask again and nothing is lost.
 * - serious: three 聖筊 in a row; 笑筊 starts the count over.
 * The throw after a question ends starts a new one.
 */
export type MoonMode = 'simple' | 'usual' | 'serious';
export type QuestionStatus = 'asking' | 'confirmed' | 'declined';

export const MOON_MODES: ReadonlyArray<{ id: MoonMode; label: string; rule: string; need: number; inARow: boolean }> = [
  { id: 'simple', label: 'Simple', rule: 'One 聖筊 answers it.', need: 1, inARow: false },
  { id: 'usual', label: 'Usual', rule: 'Three 聖筊 answer it; 笑筊 just means ask again.', need: 3, inARow: false },
  { id: 'serious', label: 'Serious', rule: 'Three 聖筊 in a row; 笑筊 starts the count over.', need: 3, inARow: true },
];

export const DEFAULT_MOON_MODE: MoonMode = 'usual';

export const isMoonMode = (value: unknown): value is MoonMode => MOON_MODES.some((mode) => mode.id === value);

export const moonMode = (id: MoonMode) => MOON_MODES.find((mode) => mode.id === id) ?? MOON_MODES[1];

export interface QuestionState {
  status: QuestionStatus;
  /** 聖筊 counted so far: in total, or in a row for a serious question. */
  yeses: number;
}

export const NEW_QUESTION: QuestionState = { status: 'asking', yeses: 0 };

export const questionEnded = (state: QuestionState) => state.status !== 'asking';

/** The question after one more throw. An ended question is never continued. */
export const nextQuestion = (state: QuestionState, answer: MoonAnswer, mode: MoonMode): QuestionState => {
  if (questionEnded(state)) return nextQuestion(NEW_QUESTION, answer, mode);
  const rule = moonMode(mode);
  if (answer === 'no') return { status: 'declined', yeses: state.yeses };
  if (answer === 'laughing') return { status: 'asking', yeses: rule.inARow ? 0 : state.yeses };
  const yeses = state.yeses + 1;
  return { status: yeses >= rule.need ? 'confirmed' : 'asking', yeses };
};

/** Where one question stands after its throws (oldest first). */
export const questionOf = (answers: readonly MoonAnswer[], mode: MoonMode) =>
  answers.reduce((state, answer) => nextQuestion(state, answer, mode), NEW_QUESTION);

/**
 * Splits a run of throws (oldest first) into questions: each ends on a yes
 * or a no, and the last may still be open. Returns the questions oldest
 * first, each with its throws and where it stands.
 */
export const groupQuestions = <T extends { answer: MoonAnswer }>(throws: readonly T[], mode: MoonMode) => {
  const questions: Array<{ throws: T[]; state: QuestionState }> = [];
  throws.forEach((entry) => {
    const current = questions[questions.length - 1];
    if (!current || questionEnded(current.state)) {
      questions.push({ throws: [entry], state: nextQuestion(NEW_QUESTION, entry.answer, mode) });
    } else {
      current.throws.push(entry);
      current.state = nextQuestion(current.state, entry.answer, mode);
    }
  });
  return questions;
};

export const countQuestions = (states: readonly QuestionState[]) => ({
  total: states.length,
  confirmed: states.filter((state) => state.status === 'confirmed').length,
  declined: states.filter((state) => state.status === 'declined').length,
  open: states.filter((state) => state.status === 'asking').length,
});

export const countAnswers = (answers: readonly MoonAnswer[]) => {
  const counts: Record<MoonAnswer, number> = { yes: 0, laughing: 0, no: 0 };
  answers.forEach((answer) => { counts[answer] += 1; });
  return counts;
};

/** Where a block comes to rest: its centre as a share of the table, and its angle in degrees. */
export interface BlockPose { x: number; y: number; angle: number }

/** How one block travels: each block draws its own, so the two never move in step. */
export interface BlockMotion {
  delay: number;
  duration: number;
  /** Height of the arc, as a share of the block's width. */
  arc: number;
  /** Sideways drift at the top of the arc, as a share of the block's width. */
  drift: number;
  /** 1 clockwise, -1 counter-clockwise. */
  spin: 1 | -1;
  /** Whole turns in the air. */
  turns: number;
  /** Times it turns over between faces before landing. */
  flips: number;
}

export interface BlockThrow { face: BlockFace; pose: BlockPose; motion: BlockMotion }

const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);

/** Resting spots: each block keeps to its own half, far enough apart never to touch. */
const SPOTS = [
  { x: [0.2, 0.34], y: [0.38, 0.62] },
  { x: [0.66, 0.8], y: [0.38, 0.62] },
] as const;

export const blockPose = (index: 0 | 1, rng: Rng = defaultRng): BlockPose => ({
  x: between(rng, SPOTS[index].x[0], SPOTS[index].x[1]),
  y: between(rng, SPOTS[index].y[0], SPOTS[index].y[1]),
  angle: between(rng, -180, 180),
});

export const blockMotion = (rng: Rng = defaultRng): BlockMotion => ({
  delay: Math.round(between(rng, 0, 240)),
  duration: Math.round(between(rng, 900, 1250)),
  arc: between(rng, 0.7, 1.5),
  drift: between(rng, -0.9, 0.9),
  spin: rng() < 0.5 ? 1 : -1,
  turns: 1 + Math.floor(rng() * 3),
  flips: 3 + Math.floor(rng() * 5),
});

/**
 * How the two blocks of a throw fly and land, around faces already drawn.
 * Their starts and their angles are kept visibly apart.
 */
export const planThrow = (faces: BlockPair, rng: Rng = defaultRng): [BlockThrow, BlockThrow] => {
  const first: BlockThrow = { face: faces[0], pose: blockPose(0, rng), motion: blockMotion(rng) };
  const second: BlockThrow = { face: faces[1], pose: blockPose(1, rng), motion: blockMotion(rng) };
  if (Math.abs(first.motion.delay - second.motion.delay) < 70) {
    second.motion.delay = first.motion.delay < 140 ? first.motion.delay + 70 + Math.round(rng() * 100) : first.motion.delay - 70 - Math.round(rng() * 70);
  }
  if (Math.abs(first.motion.duration - second.motion.duration) < 80) second.motion.duration = first.motion.duration + (first.motion.duration > 1075 ? -120 : 120);
  const turn = (((second.pose.angle - first.pose.angle) % 360) + 540) % 360 - 180;
  if (Math.abs(turn) < 30) second.pose.angle += turn < 0 ? -40 : 40;
  return [first, second];
};

/** The whole throw, from the first block leaving to the last one settling. */
export const throwLength = (blocks: readonly BlockThrow[]) => Math.max(...blocks.map(({ motion }) => motion.delay + motion.duration));
