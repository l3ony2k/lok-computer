/**
 * The I Ching, cast with three coins: the 64 hexagrams in King Wen order, the
 * lookup from six lines, the throw, and the question handed to Ask AI. Pure,
 * and every throw takes an `rng` like random.ts so tests can be deterministic.
 *
 * Each throw is three coins. The inscribed side (字) counts 2, the back (背)
 * counts 3, so a throw sums to 6, 7, 8 or 9: 6 old yin (changing), 7 young
 * yang, 8 young yin, 9 old yang (changing). Six throws build the hexagram
 * from the bottom line up. The coin's inscribed side is its "heads".
 */
import { defaultRng, flipCoins, type CoinSide, type Rng } from './random';

export type LineValue = 6 | 7 | 8 | 9;

export interface Hexagram {
  /** King Wen number, 1–64. */
  number: number;
  /** Traditional Chinese name. */
  chinese: string;
  /** Pinyin with tone marks. */
  pinyin: string;
  /** A short English name. */
  english: string;
  /** What it is about, in a few plain words (written for lok). */
  meaning: string;
}

type Row = [chinese: string, pinyin: string, english: string, meaning: string];

const ROWS: readonly Row[] = [
  ['乾', 'Qián', 'The Creative', 'Pure strength: act with steady drive.'],
  ['坤', 'Kūn', 'The Receptive', 'Yield and support, and let things grow.'],
  ['屯', 'Zhūn', 'Difficult beginnings', 'A messy start: keep at it and find help.'],
  ['蒙', 'Méng', 'Youthful folly', 'You are new at this: be willing to learn.'],
  ['需', 'Xū', 'Waiting', 'Be patient; the moment will come.'],
  ['訟', 'Sòng', 'Conflict', 'A dispute: look for middle ground, not a win.'],
  ['師', 'Shī', 'The army', 'A shared effort that needs clear leadership.'],
  ['比', 'Bǐ', 'Holding together', 'Join with others, and choose them well.'],
  ['小畜', 'Xiǎo Chù', 'Small taming', 'Held back a little: go in small steps.'],
  ['履', 'Lǚ', 'Treading', 'Step carefully and mind your manners.'],
  ['泰', 'Tài', 'Peace', 'Things fit together and flow well.'],
  ['否', 'Pǐ', 'Standstill', 'Blocked for now: keep your values and wait.'],
  ['同人', 'Tóng Rén', 'Fellowship', 'Make common cause with others, openly.'],
  ['大有', 'Dà Yǒu', 'Great possession', 'Plenty in hand: share it generously.'],
  ['謙', 'Qiān', 'Modesty', 'Stay humble and even things out.'],
  ['豫', 'Yù', 'Enthusiasm', 'Energy that rallies others; plan ahead.'],
  ['隨', 'Suí', 'Following', 'Adapt, and follow what is right.'],
  ['蠱', 'Gǔ', 'Repairing', 'Fix what was left to spoil.'],
  ['臨', 'Lín', 'Approach', 'Good things draw near: act while they last.'],
  ['觀', 'Guān', 'Contemplation', 'Step back and look before you act.'],
  ['噬嗑', 'Shì Kè', 'Biting through', 'Deal firmly with what is in the way.'],
  ['賁', 'Bì', 'Grace', 'Good form helps, but substance matters more.'],
  ['剝', 'Bō', 'Splitting apart', 'Things wear away: do not force it.'],
  ['復', 'Fù', 'Return', 'A turning point: things begin again.'],
  ['無妄', 'Wú Wàng', 'Innocence', 'Act sincerely, with no hidden motive.'],
  ['大畜', 'Dà Chù', 'Great taming', 'Store up your strength for later.'],
  ['頤', 'Yí', 'Nourishment', 'Mind what you take in and what you give.'],
  ['大過', 'Dà Guò', 'Great excess', 'Too much weight: act before it gives.'],
  ['坎', 'Kǎn', 'The abyss', 'Danger again and again: keep going, stay true.'],
  ['離', 'Lí', 'Clinging fire', 'Clarity, fed by what it holds on to.'],
  ['咸', 'Xián', 'Influence', 'A mutual pull: stay open to it.'],
  ['恆', 'Héng', 'Duration', 'Keep a steady course over time.'],
  ['遯', 'Dùn', 'Retreat', 'Pull back wisely; it is not defeat.'],
  ['大壯', 'Dà Zhuàng', 'Great power', 'Strong now: use it with restraint.'],
  ['晉', 'Jìn', 'Progress', 'Quick advance, and others notice.'],
  ['明夷', 'Míng Yí', 'Darkening of the light', 'Hard times: keep your light to yourself.'],
  ['家人', 'Jiā Rén', 'The family', 'Care and clear roles at home.'],
  ['睽', 'Kuí', 'Opposition', 'At odds: agree on the small things.'],
  ['蹇', 'Jiǎn', 'Obstruction', 'A wall ahead: turn back and ask for help.'],
  ['解', 'Xiè', 'Deliverance', 'A release: forgive and move on.'],
  ['損', 'Sǔn', 'Decrease', 'Less is more: simplify.'],
  ['益', 'Yì', 'Increase', 'A time of gain: act, and help others.'],
  ['夬', 'Guài', 'Breakthrough', 'Be resolute and say it openly.'],
  ['姤', 'Gòu', 'Coming to meet', 'An unexpected meeting: stay wary.'],
  ['萃', 'Cuì', 'Gathering together', 'People come together for a purpose.'],
  ['升', 'Shēng', 'Pushing upward', 'Steady growth, one step at a time.'],
  ['困', 'Kùn', 'Oppression', 'Worn out: keep faith and say little.'],
  ['井', 'Jǐng', 'The well', 'A shared source: look after it.'],
  ['革', 'Gé', 'Revolution', 'Change, when the time is right.'],
  ['鼎', 'Dǐng', 'The cauldron', 'Transformation that feeds others.'],
  ['震', 'Zhèn', 'Thunder', 'A shock: stay calm and learn from it.'],
  ['艮', 'Gèn', 'Keeping still', 'Stop, and quiet your mind.'],
  ['漸', 'Jiàn', 'Development', 'Slow, steady progress.'],
  ['歸妹', 'Guī Mèi', 'The marrying maiden', 'Know your place in this.'],
  ['豐', 'Fēng', 'Abundance', 'A high point: enjoy it, it will pass.'],
  ['旅', 'Lǚ', 'The wanderer', 'Travel light and be a careful guest.'],
  ['巽', 'Xùn', 'The gentle wind', 'Gentle persistence gets through.'],
  ['兌', 'Duì', 'The joyous lake', 'Joy, shared with others.'],
  ['渙', 'Huàn', 'Dispersion', 'Dissolve what keeps people apart.'],
  ['節', 'Jié', 'Limitation', 'Set sensible limits.'],
  ['中孚', 'Zhōng Fú', 'Inner truth', 'Sincerity wins others over.'],
  ['小過', 'Xiǎo Guò', 'Small excess', 'Mind the small things; aim low.'],
  ['既濟', 'Jì Jì', 'After completion', 'Done, but stay alert: order slips.'],
  ['未濟', 'Wèi Jì', 'Before completion', 'Nearly there: take care at the end.'],
];

export const HEXAGRAMS: readonly Hexagram[] = ROWS.map(([chinese, pinyin, english, meaning], index) => ({
  number: index + 1,
  chinese,
  pinyin,
  english,
  meaning,
}));

/** The trigrams, lines bottom to top, 1 = yang. */
export const TRIGRAMS = {
  qian: '111',
  dui: '110',
  li: '101',
  zhen: '100',
  xun: '011',
  kan: '010',
  gen: '001',
  kun: '000',
} as const;

type Trigram = keyof typeof TRIGRAMS;

const COLUMNS: readonly Trigram[] = ['qian', 'zhen', 'kan', 'gen', 'kun', 'xun', 'li', 'dui'];

/** King Wen numbers: rows are the lower trigram, columns the upper (in COLUMNS order). */
const KING_WEN: Record<Trigram, readonly number[]> = {
  qian: [1, 34, 5, 26, 11, 9, 14, 43],
  zhen: [25, 51, 3, 27, 24, 42, 21, 17],
  kan: [6, 40, 29, 4, 7, 59, 64, 47],
  gen: [33, 62, 39, 52, 15, 53, 56, 31],
  kun: [12, 16, 8, 23, 2, 20, 35, 45],
  xun: [44, 32, 48, 18, 46, 57, 50, 28],
  li: [13, 55, 63, 22, 36, 37, 30, 49],
  dui: [10, 54, 60, 41, 19, 61, 38, 58],
};

const trigramOf = (bits: string): Trigram => {
  const found = (Object.keys(TRIGRAMS) as Trigram[]).find((name) => TRIGRAMS[name] === bits);
  if (!found) throw new Error(`Not a trigram: ${bits}`);
  return found;
};

/** The hexagram of six lines, bottom to top, true = yang. */
export const hexagramOf = (yang: readonly boolean[]): Hexagram => {
  if (yang.length !== 6) throw new Error('A hexagram has six lines');
  const bits = yang.map((line) => (line ? '1' : '0')).join('');
  const lower = trigramOf(bits.slice(0, 3));
  const upper = trigramOf(bits.slice(3));
  return HEXAGRAMS[KING_WEN[lower][COLUMNS.indexOf(upper)] - 1];
};

export const isYang = (value: LineValue) => value === 7 || value === 9;
export const isChanging = (value: LineValue) => value === 6 || value === 9;

/** What each sum is called. */
export const LINE_NAMES: Record<LineValue, string> = {
  6: 'old yin',
  7: 'young yang',
  8: 'young yin',
  9: 'old yang',
};

/** The inscribed side (字, the coin's "heads") counts 2, the back (背) 3. */
export const coinValue = (side: CoinSide) => (side === 'heads' ? 2 : 3);

export const lineValueOf = (coins: readonly CoinSide[]): LineValue => coins.reduce<number>((sum, side) => sum + coinValue(side), 0) as LineValue;

export interface LineThrow {
  coins: CoinSide[];
  value: LineValue;
}

/** One throw of three coins. */
export const throwLine = (rng: Rng = defaultRng): LineThrow => {
  const coins = flipCoins(3, rng);
  return { coins, value: lineValueOf(coins) };
};

export interface Reading {
  primary: Hexagram;
  /** Line numbers (1 = bottom) that change. */
  changing: number[];
  /** The hexagram after the changing lines turn, if any do. */
  resulting: Hexagram | null;
}

/** Reads six cast lines, bottom to top. */
export const readLines = (lines: readonly LineValue[]): Reading => {
  const primary = hexagramOf(lines.map(isYang));
  const changing = lines.flatMap((value, index) => (isChanging(value) ? [index + 1] : []));
  const resulting = changing.length ? hexagramOf(lines.map((value) => (isChanging(value) ? !isYang(value) : isYang(value)))) : null;
  return { primary, changing, resulting };
};

/** "line 3", "lines 2 and 5", "lines 1, 4 and 6". */
export const listLines = (lines: readonly number[]) => {
  if (lines.length === 1) return `line ${lines[0]}`;
  return `lines ${lines.slice(0, -1).join(', ')} and ${lines[lines.length - 1]}`;
};

/** "2 inscribed (字), 1 back (背)". */
export const describeThrow = (coins: readonly CoinSide[]) => {
  const inscribed = coins.filter((side) => side === 'heads').length;
  return `${inscribed} inscribed (字), ${coins.length - inscribed} back (背)`;
};

const name = (hexagram: Hexagram) => `hexagram ${hexagram.number}, ${hexagram.chinese} ${hexagram.pinyin} (${hexagram.english})`;

/** The question handed to Ask AI for a finished cast. */
export const ichingQuestion = (lines: readonly LineValue[]): string => {
  const { primary, changing, resulting } = readLines(lines);
  const cast = `I cast the I Ching with three coins and got ${name(primary)}`;
  if (!resulting) return `${cast}, with no changing lines. What does this reading mean?`;
  const turn = changing.length === 1 ? 'changes' : 'change';
  return `${cast}. ${listLines(changing).replace(/^l/, 'L')} ${turn}, turning it into ${name(resulting)}. How should I interpret this reading?`;
};
