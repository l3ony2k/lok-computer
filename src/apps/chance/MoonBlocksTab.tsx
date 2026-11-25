import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { usePersistedState } from '@/hooks/useStorage';
import { ChanceTable } from './ChanceTable';
import {
  MOON_ANSWERS,
  DEFAULT_MOON_MODE,
  MOON_MODES,
  NEW_QUESTION,
  isMoonMode,
  moonMode,
  countQuestions,
  nextQuestion,
  planThrow,
  questionEnded,
  readBlocks,
  throwBlocks,
  throwLength,
  type BlockFace,
  type BlockPair,
  type BlockThrow,
  type MoonAnswer,
  type MoonMode,
  type QuestionState,
} from './moonBlocks';
import './moonBlocks.css';

/**
 * Moon blocks (筊杯): two red crescents thrown to ask a yes-or-no question.
 * Each block draws its own face and its own flight; the answer is read from
 * how the pair came down. A question runs until three 聖筊 in a row confirm
 * it or a 陰筊 says no (moonBlocks.ts).
 */

interface MoonThrow { id: string; faces: BlockPair; answer: MoonAnswer; state: QuestionState }
interface MoonQuestion { id: string; mode: MoonMode; state: QuestionState; /** Newest first. */ throws: MoonThrow[] }

/** Remembered between visits: how serious the next question is. */
interface MoonSettings { mode: MoonMode }

const SETTINGS_KEY = 'app:chance-moon';
const DEFAULT_SETTINGS: MoonSettings = { mode: DEFAULT_MOON_MODE };
const normalizeSettings = (stored: unknown): MoonSettings => {
  const mode = stored && typeof stored === 'object' ? (stored as Partial<MoonSettings>).mode : undefined;
  return { mode: isMoonMode(mode) ? mode : DEFAULT_MOON_MODE };
};

/** Questions kept in the history, newest first, and throws kept per question. */
const QUESTIONS = 15;
const THROWS_PER_QUESTION = 40;
/** How long the three-yes celebration plays. */
const CELEBRATION_MS = 1500;

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How the blocks lie before the first throw. */
const RESTING: [BlockThrow, BlockThrow] = [
  { face: 'flat', pose: { x: 0.29, y: 0.46, angle: -14 }, motion: { delay: 0, duration: 1000, arc: 1, drift: 0, spin: 1, turns: 1, flips: 3 } },
  { face: 'round', pose: { x: 0.71, y: 0.55, angle: 158 }, motion: { delay: 120, duration: 1100, arc: 1, drift: 0, spin: -1, turns: 1, flips: 4 } },
];

// eslint-disable-next-line react-refresh/only-export-components
export const useMoonBlocksTable = () => {
  const [blocks, setBlocks] = useState<[BlockThrow, BlockThrow]>(RESTING);
  const [questions, setQuestions] = useState<MoonQuestion[]>([]);
  const [settings, setSettings] = usePersistedState<MoonSettings>({ key: SETTINGS_KEY, defaultValue: DEFAULT_SETTINGS, normalize: normalizeSettings });
  // The throw in the air: when it started, so a tab opened mid-throw picks it up.
  const [flight, setFlight] = useState<{ id: string; startedAt: number } | null>(null);
  // The three-yes celebration, by when it started (a tab opened later skips it).
  const [celebration, setCelebration] = useState<{ id: string; startedAt: number } | null>(null);
  const landTimer = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = questions[0] ?? null;
  const ended = current ? questionEnded(current.state) : false;
  // A question keeps the mode it started with; a new choice applies to the next one.
  const locked = Boolean(current && !ended && current.throws.length);
  // The questions as last rendered, for reading inside the landing timer.
  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  useEffect(() => () => {
    if (landTimer.current) window.clearTimeout(landTimer.current);
  }, []);

  const throwNow = () => {
    if (flight) return;
    // Each block lands on its own; the answer is only read from the pair.
    const faces = throwBlocks();
    const answer = readBlocks(faces);
    const plan = planThrow(faces);
    const id = createId();
    const { mode } = settings;
    const land = () => {
      landTimer.current = null;
      setFlight(null);
      const before = questionsRef.current[0];
      const continues = before && !questionEnded(before.state);
      const confirmed = nextQuestion(continues ? before.state : NEW_QUESTION, answer, continues ? before.mode : mode).status === 'confirmed';
      setQuestions((prev) => {
        const head = prev[0];
        const open = head && !questionEnded(head.state);
        const state = nextQuestion(open ? head.state : NEW_QUESTION, answer, open ? head.mode : mode);
        const entry: MoonThrow = { id, faces, answer, state };
        return open
          ? [{ ...head, state, throws: [entry, ...head.throws].slice(0, THROWS_PER_QUESTION) }, ...prev.slice(1)]
          : [{ id: createId(), mode, state, throws: [entry] }, ...prev].slice(0, QUESTIONS);
      });
      if (confirmed) setCelebration({ id, startedAt: performance.now() });
    };
    setBlocks(plan);
    if (reducedMotion()) {
      land();
      return;
    }
    setFlight({ id, startedAt: performance.now() });
    landTimer.current = window.setTimeout(land, throwLength(plan));
  };

  return {
    blocks,
    questions,
    current,
    ended,
    flight,
    celebration,
    buttonRef,
    throwNow,
    mode: settings.mode,
    locked,
    setMode: (mode: MoonMode) => {
      if (!locked) setSettings({ mode });
    },
    clear: () => {
      setQuestions([]);
      setCelebration(null);
    },
  };
};

type MoonTable = ReturnType<typeof useMoonBlocksTable>;

// ---------- Drawing ----------

/**
 * The flat face: a half-moon cut straight across, its chord a crisp edge and
 * sharp tips. The round back: a fuller dome with rounded tips.
 */
const FLAT_PATH = 'M4 50 C 6 16, 30 5, 50 5 C 70 5, 94 16, 96 50 C 80 43, 64 41, 50 41 C 36 41, 20 43, 4 50 Z';
const ROUND_PATH = 'M8 50 C 2 44, 10 3, 50 3 C 90 3, 98 44, 92 50 C 86 55, 70 47, 50 47 C 30 47, 14 55, 8 50 Z';

const BlockFaceArt = ({ face, className }: { face: BlockFace; className?: string }) => {
  const id = useId().replace(/:/g, '');
  return face === 'flat' ? (
    // Matte and plain: a lighter lacquer, one flat tone, a thin rim and the grain.
    <svg className={className} data-side="flat" viewBox="0 0 100 64" aria-hidden="true">
      <path d={FLAT_PATH} fill="#dc6a52" stroke="#8a2a1b" strokeWidth="1.6" strokeLinejoin="miter" />
      <path d="M10 47 C 12 20, 32 11, 50 11 C 68 11, 88 20, 90 47" fill="none" stroke="#f3a48f" strokeOpacity="0.7" strokeWidth="1" />
      <g fill="none" stroke="#b4452f" strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round">
        <path d="M14 39 C 30 34, 70 34, 86 39" />
        <path d="M20 30 C 34 25, 66 25, 80 30" />
        <path d="M29 21 C 40 17, 60 17, 71 21" />
        <path d="M40 14 C 46 12.5, 54 12.5, 60 14" />
      </g>
      {/* The cut edge, straight across. */}
      <path d="M4 50 C 20 43, 36 41, 50 41 C 64 41, 80 43, 96 50" fill="none" stroke="#7a2015" strokeWidth="2.2" strokeLinecap="square" />
    </svg>
  ) : (
    // Domed and glossy: deep red shading to near black, a bright highlight on top.
    <svg className={className} data-side="round" viewBox="0 0 100 64" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-dome`} cx="0.42" cy="0.3" r="0.78">
          <stop offset="0" stopColor="#e2523d" />
          <stop offset="0.32" stopColor="#a31f18" />
          <stop offset="0.72" stopColor="#6a0e09" />
          <stop offset="1" stopColor="#3f0604" />
        </radialGradient>
        <radialGradient id={`${id}-shine`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}><path d={ROUND_PATH} /></clipPath>
      </defs>
      <path d={ROUND_PATH} fill={`url(#${id}-dome)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {/* The underside turning away, in shadow. */}
        <path d="M6 52 C 20 44, 36 42, 50 42 C 64 42, 80 44, 94 52" fill="none" stroke="#1e0302" strokeOpacity="0.55" strokeWidth="7" />
      </g>
      <ellipse cx="38" cy="16" rx="17" ry="5.5" transform="rotate(-10 38 16)" fill={`url(#${id}-shine)`} />
      <path d="M68 12 C 76 15, 84 22, 88 32" fill="none" stroke="#ff9a85" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      <path d={ROUND_PATH} fill="none" stroke="#360503" strokeWidth="1.6" />
    </svg>
  );
};

/** A block in the history: flat as a light outline, round as a solid dark dome. */
const BlockGlyph = ({ face }: { face: BlockFace }) => (
  <svg className="moon-glyph" data-side={face} viewBox="0 0 100 64" aria-hidden="true">
    {face === 'flat'
      ? <path d={FLAT_PATH} fill="#dc6a52" fillOpacity="0.2" stroke="#d4503b" strokeWidth="9" strokeLinejoin="miter" />
      : <path d={ROUND_PATH} fill="#7a120c" stroke="#4a0806" strokeWidth="4" />}
  </svg>
);

const faceName = (face: BlockFace) => (face === 'flat' ? 'flat side up' : 'round side up');

// ---------- Throwing ----------

/** Share of its flight at which a block first touches the table. */
const LAND_AT = 0.7;
/** When it leaves the hand. */
const LIFT_AT = 0.05;

/**
 * Plays every block's own flight: from the button, up an arc of its own
 * height and drift, spinning its own way and turning over between faces,
 * down onto its spot, a bounce (a block on its round back rocks) and rest.
 */
const playThrow = (table: HTMLElement, from: DOMRect | undefined, blocks: readonly BlockThrow[]) => {
  const animations: Animation[] = [];
  // The arc stays inside the pane, which would clip a block thrown above it.
  const pane = (table.closest('.chance-main') ?? table).getBoundingClientRect();
  const spots = Array.from(table.querySelectorAll<HTMLElement>('.moon-block-spot'));
  spots.forEach((spot, index) => {
    const block = blocks[index];
    if (!block) return;
    const { motion, pose, face } = block;
    const rect = spot.getBoundingClientRect();
    const size = rect.width;
    const dx = from ? from.left + from.width / 2 - (rect.left + rect.width / 2) : 0;
    const dy = from ? from.top + from.height / 2 - (rect.top + rect.height / 2) : size;
    const peak = LAND_AT * 0.48;
    const rocks = face === 'flat';
    const timing = { duration: motion.duration, delay: motion.delay, fill: 'backwards' as const };
    const play = (element: Element | null, keyframes: Keyframe[]) => {
      if (element) animations.push(element.animate(keyframes, timing));
    };

    // Flight: up and over to the spot, a bounce, rest.
    const peakScale = 1.22 + motion.arc * 0.12;
    const centreX = rect.left + rect.width / 2;
    const reach = size * 0.5 * peakScale + 6;
    const peakX = Math.min(Math.max(dx * 0.35 + motion.drift * size, pane.left + reach - centreX), pane.right - reach - centreX);
    const headroom = rect.top + rect.height / 2 - pane.top - reach;
    const peakY = Math.max(Math.min(dy * 0.35, 0) - motion.arc * size, -Math.max(headroom, 0));
    const bounce = (rocks ? 0.05 : 0.11) * size;
    play(spot.querySelector('.moon-block-flight'), [
      { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' },
      { opacity: 1, offset: LIFT_AT * 1.6 },
      { transform: `translate(${peakX}px, ${peakY}px) scale(${peakScale})`, offset: peak, easing: 'cubic-bezier(0.5, 0, 0.9, 0.55)' },
      { transform: 'translate(0, 0) scale(1)', offset: LAND_AT, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
      { transform: `translate(${motion.drift * size * 0.04}px, ${-bounce}px) scale(1.02)`, offset: LAND_AT + 0.09, easing: 'cubic-bezier(0.5, 0, 0.8, 0.5)' },
      { transform: 'translate(0, 0) scale(1)', offset: LAND_AT + 0.18 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    ]);

    // Spin: whole turns its own way, ending on the landing angle; a slide or a rock after.
    const start = pose.angle - motion.spin * (motion.turns * 360 + 40);
    const settle = rocks
      ? [
        { transform: `rotate(${pose.angle + motion.spin * 7}deg)`, offset: LAND_AT + 0.08, easing: 'ease-in-out' },
        { transform: `rotate(${pose.angle - motion.spin * 4}deg)`, offset: LAND_AT + 0.17, easing: 'ease-in-out' },
        { transform: `rotate(${pose.angle + motion.spin * 1.5}deg)`, offset: LAND_AT + 0.25, easing: 'ease-in-out' },
      ]
      : [{ transform: `rotate(${pose.angle + motion.spin * 3}deg)`, offset: LAND_AT + 0.1, easing: 'ease-out' }];
    const turn: Keyframe[] = [
      { transform: `rotate(${start}deg)`, easing: 'cubic-bezier(0.3, 0.4, 0.4, 1)' },
      { transform: `rotate(${pose.angle - motion.spin * 12}deg)`, offset: LAND_AT, easing: 'ease-out' },
      ...settle,
      { transform: `rotate(${pose.angle}deg)` },
    ];
    play(spot.querySelector('.moon-block-turn'), turn);
    play(spot.querySelector('.moon-shadow-turn'), turn);

    // Turning over: the block goes edge-on (scaleY through 0) and shows its
    // other face, `flips` times, so it lands on the face it drew.
    const steps = motion.flips * 8;
    const flip: Keyframe[] = [];
    for (let step = 0; step <= steps; step += 1) {
      const scale = Math.max(Math.abs(Math.cos((step / 8) * Math.PI)), 0.1);
      flip.push({ transform: `scaleY(${scale.toFixed(3)})`, offset: LIFT_AT + (LAND_AT - LIFT_AT) * (step / steps) });
    }
    const rock = rocks
      ? [{ transform: 'scaleY(0.84)', offset: LAND_AT + 0.08 }, { transform: 'scaleY(1)', offset: LAND_AT + 0.16 }, { transform: 'scaleY(0.93)', offset: LAND_AT + 0.23 }]
      : [{ transform: 'scaleY(0.95)', offset: LAND_AT + 0.05 }];
    const flipFrames: Keyframe[] = [{ transform: 'scaleY(1)', offset: 0 }, ...flip, ...rock, { transform: 'scaleY(1)', offset: 1 }];
    play(spot.querySelector('.moon-block-flip'), flipFrames);
    play(spot.querySelector('.moon-shadow-flip'), flipFrames);

    // The faces swap each time it passes edge-on.
    const other: BlockFace = face === 'flat' ? 'round' : 'flat';
    const firstFace = motion.flips % 2 === 0 ? face : other;
    (['flat', 'round'] as const).forEach((side) => {
      const shown = (current: BlockFace) => (current === side ? 1 : 0);
      let current = firstFace;
      const frames: Keyframe[] = [{ opacity: shown(current), offset: 0 }];
      for (let crossing = 0; crossing < motion.flips; crossing += 1) {
        const offset = LIFT_AT + (LAND_AT - LIFT_AT) * ((crossing + 0.5) / motion.flips);
        frames.push({ opacity: shown(current), offset });
        current = current === 'flat' ? 'round' : 'flat';
        frames.push({ opacity: shown(current), offset });
      }
      frames.push({ opacity: shown(current), offset: 1 });
      play(spot.querySelector(`.moon-block-face[data-side="${side}"]`), frames);
    });

    // The shadow waits on the spot: faint and small while the block is high.
    play(spot.querySelector('.moon-block-shadow'), [
      { opacity: 0, transform: 'scale(0.4)' },
      { opacity: 0.25, transform: 'scale(0.6)', offset: peak },
      { opacity: 1, transform: 'scale(1)', offset: LAND_AT },
      { opacity: 0.7, transform: 'scale(0.92)', offset: LAND_AT + 0.09 },
      { opacity: 1, transform: 'scale(1)', offset: LAND_AT + 0.18 },
      { opacity: 1, transform: 'scale(1)' },
    ]);
  });
  return animations;
};

// ---------- Celebration ----------

const CONFETTI = ['#d6281c', '#f2c14e', '#ffde85', '#b3160f', '#f7a72b', '#fff3c4'];

/**
 * Three 聖筊: the blocks glow gold and a burst of red and gold paper flies
 * up from each and falls away. Pieces go in `layer`; the caller removes them.
 */
const playCelebration = (table: HTMLElement, layer: HTMLElement) => {
  const animations: Animation[] = [];
  const box = table.getBoundingClientRect();
  table.querySelectorAll<HTMLElement>('.moon-block-spot').forEach((spot, index) => {
    const rect = spot.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - box.left;
    const y = rect.top + rect.height / 2 - box.top;
    const size = rect.width;
    const glow = spot.querySelector('.moon-block-flip');
    if (glow) animations.push(glow.animate([
      { filter: 'drop-shadow(0 0 0 rgb(255 196 64 / 0))' },
      { filter: `drop-shadow(0 0 ${Math.round(size * 0.09)}px rgb(255 196 64 / 0.95))`, offset: 0.25 },
      { filter: `drop-shadow(0 0 ${Math.round(size * 0.06)}px rgb(255 196 64 / 0.7))`, offset: 0.7 },
      { filter: 'drop-shadow(0 0 0 rgb(255 196 64 / 0))' },
    ], { duration: CELEBRATION_MS, easing: 'ease-out' }));

    for (let piece = 0; piece < 16; piece += 1) {
      const element = document.createElement('span');
      element.className = 'moon-confetti-piece';
      const wide = Math.random() < 0.5;
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.width = `${wide ? 7 : 4}px`;
      element.style.height = `${wide ? 4 : 9}px`;
      element.style.background = CONFETTI[(piece + index * 3) % CONFETTI.length];
      layer.appendChild(element);
      // Up and out from the block, then falling and fluttering away.
      const angle = (-90 + (Math.random() - 0.5) * 150) * (Math.PI / 180);
      const reach = size * (0.55 + Math.random() * 0.75);
      const dx = Math.cos(angle) * reach;
      const dy = Math.sin(angle) * reach;
      const fall = size * (0.5 + Math.random() * 0.5);
      const spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540);
      animations.push(element.animate([
        { transform: 'translate(-50%, -50%) rotate(0deg) scale(0.4)', opacity: 1, easing: 'cubic-bezier(0.15, 0.7, 0.3, 1)' },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin * 0.45}deg) scale(1)`, opacity: 1, offset: 0.4, easing: 'cubic-bezier(0.4, 0, 0.8, 0.6)' },
        { transform: `translate(calc(-50% + ${dx * 1.25}px), calc(-50% + ${dy + fall}px)) rotate(${spin}deg) scale(0.9)`, opacity: 0 },
      ], { duration: CELEBRATION_MS * (0.75 + Math.random() * 0.25), delay: Math.random() * 140, fill: 'both' }));
    }
  });
  return animations;
};

// ---------- The tab ----------

const outcomeOf = (state: QuestionState, mode: MoonMode) => (
  state.status === 'confirmed' ? 'Yes'
    : state.status === 'declined' ? 'No'
      : moonMode(mode).need > 1 ? `Asking ${state.yeses}/${moonMode(mode).need}` : 'Asking'
);

/** Where the yeses stand, as the progress row says it. */
const countLine = (yeses: number, mode: MoonMode) => {
  const rule = moonMode(mode);
  return rule.inARow ? `${yeses} of ${rule.need} in a row` : `${yeses} of ${rule.need} ${rule.need === 1 ? 'yes' : 'yeses'}`;
};

export const MoonBlocksTab = ({ table }: { table: MoonTable }) => {
  const { blocks, questions, current, ended, flight, celebration, locked } = table;
  const tableRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const throwing = flight !== null;
  const flightId = flight?.id;
  const startedAt = flight?.startedAt;
  const celebrationId = celebration?.id;
  const celebratedAt = celebration?.startedAt;

  // Each throw plays once; a tab opened mid-throw joins it where it is.
  useLayoutEffect(() => {
    const element = tableRef.current;
    if (!flightId || startedAt === undefined || !element) return;
    const animations = playThrow(element, table.buttonRef.current?.getBoundingClientRect(), blocks);
    const elapsed = performance.now() - startedAt;
    if (elapsed > 30) animations.forEach((animation) => { animation.currentTime = elapsed; });
    return () => animations.forEach((animation) => animation.cancel());
    // The blocks change with the flight id; the button ref is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightId, startedAt]);

  useLayoutEffect(() => {
    const element = tableRef.current;
    const layer = confettiRef.current;
    if (!celebrationId || celebratedAt === undefined || !element || !layer || reducedMotion()) return;
    const elapsed = performance.now() - celebratedAt;
    if (elapsed > CELEBRATION_MS) return;
    const animations = playCelebration(element, layer);
    if (elapsed > 30) animations.forEach((animation) => { animation.currentTime = elapsed; });
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => layer.replaceChildren());
    return () => {
      animations.forEach((animation) => animation.cancel());
      layer.replaceChildren();
    };
  }, [celebrationId, celebratedAt]);

  const latest = current?.throws[0] ?? null;
  const state = current?.state ?? NEW_QUESTION;
  const shown = latest && !throwing ? MOON_ANSWERS[latest.answer] : null;
  const asked = questions.filter((question) => question.throws.length);
  const tally = countQuestions(asked.map((question) => question.state));
  const throwCount = asked.reduce((sum, question) => sum + question.throws.length, 0);
  const label = throwing
    ? 'Two moon blocks in the air'
    : `Two moon blocks: ${faceName(blocks[0].face)} and ${faceName(blocks[1].face)}`;

  // One thing leads at a time: this throw while the question is open, the
  // answer once it has ended. The phase label above says which.
  const answered = ended && !throwing;
  const nextThrow = ended || !current ? 1 : current.throws.length + 1;
  const phase = answered ? 'answered' : throwing ? 'throwing' : latest ? 'asking' : 'new';
  const phaseLabel = answered ? 'Answered'
    : latest || throwing ? `${ended || !latest ? 'New question' : 'Asking'} · throw ${throwing ? nextThrow : current?.throws.length ?? 1}`
      : 'New question';
  // The rule in force: the open question's own, or the chosen one for the next.
  const activeMode: MoonMode = current && !ended && current.throws.length ? current.mode : table.mode;
  const shownMode: MoonMode = answered && current ? current.mode : activeMode;
  const rule = moonMode(shownMode);
  const yeses = throwing && ended ? 0 : state.yeses;
  const fresh = !latest || (throwing && ended);
  const progressNote = answered
    ? (state.status === 'confirmed' ? (rule.need === 1 ? 'One 聖筊.' : rule.inARow ? 'Three 聖筊 in a row.' : 'Three 聖筊.') : '陰筊 ends the question.')
    : fresh ? (rule.need === 1 ? 'One 聖筊 answers it. 陰筊 says no.' : `${countLine(0, shownMode)}. 陰筊 says no.`)
      : latest.answer === 'laughing'
        ? (rule.inARow ? `${countLine(yeses, shownMode)} · 笑筊 starts the count over.` : rule.need === 1 ? '笑筊: ask again.' : `${countLine(yeses, shownMode)} · 笑筊: ask again.`)
        : rule.need === 1 ? 'One 聖筊 answers it.' : countLine(yeses, shownMode);

  return (
    <ChanceTable
      label="Moon blocks"
      setup={
        <div className="moon-setup">
          <div className="moon-mode-row">
            <div className="chance-segmented" role="radiogroup" aria-label="How serious is the question" title={locked ? 'Finish or answer this question first' : undefined}>
              {MOON_MODES.map((mode) => (
                <button type="button" role="radio" aria-checked={activeMode === mode.id} disabled={locked || throwing} key={mode.id} onClick={() => table.setMode(mode.id)}>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <span className="chance-result-note">{locked ? 'Locked until this question is answered.' : moonMode(activeMode).rule}</span>
        </div>
      }
      result={
        <div className="moon-result" data-phase={phase} aria-live="polite">
          <span className="moon-phase">{phaseLabel}</span>
          <div className="moon-headline">
            {answered ? <strong className="moon-final">{state.status === 'confirmed' ? 'Yes' : 'No'}</strong>
              : throwing ? <span className="chance-result-note">Throwing…</span>
                : shown ? <strong className="chance-readout-value"><span lang="zh-Hant">{shown.hanzi}</span> · {shown.name}</strong>
                  : <span className="chance-hint">Hold your question in mind, then throw.</span>}
          </div>
          <span className="chance-result-note moon-subline">
            {answered && latest ? `Last throw: ${MOON_ANSWERS[latest.answer].hanzi}, ${latest.answer === 'no' ? 'both round sides up' : 'one flat side up, one round'}.`
              : shown && !throwing ? shown.explanation
                : !latest && !throwing ? 'One flat side up and one round means yes.'
                  : '\u00a0'}
          </span>
          <div className="moon-progress">
            {answered && state.status === 'declined'
              ? <span className="moon-no-mark" aria-hidden="true">×</span>
              : rule.need > 1 && (
                <span className="moon-streak-pips" aria-hidden="true">
                  {Array.from({ length: rule.need }, (_, index) => (
                    <span className="moon-streak-pip" data-on={index < yeses || undefined} key={index} />
                  ))}
                </span>
              )}
            <span className="chance-result-note">{progressNote}</span>
          </div>
        </div>
      }
      action={{
        label: throwing ? 'Throwing…' : ended ? 'Ask a new question' : 'Throw the blocks',
        onClick: table.throwNow,
        disabled: throwing,
        buttonRef: table.buttonRef,
      }}
      history={{
        title: 'History',
        count: throwCount,
        empty: 'Questions and their throws show up here.',
        summary: [
          `${asked.length} ${asked.length === 1 ? 'question' : 'questions'}`,
          tally.confirmed && `${tally.confirmed} yes`,
          tally.declined && `${tally.declined} no`,
          tally.open && `${tally.open} open`,
        ].filter(Boolean).join(' · '),
        onClear: table.clear,
        children: asked.map((question) => {
          const isCurrent = question === current;
          return (
            <li className="moon-history-question" data-current={isCurrent || undefined} data-status={question.state.status} key={question.id}>
              <div className="moon-history-head">
                <span className="moon-history-outcome">{outcomeOf(question.state, question.mode)}</span>
                <span className="moon-history-count">{moonMode(question.mode).label} · {question.throws.length}</span>
              </div>
              <ol className="moon-history-throws">
                {question.throws.map((entry, index) => {
                  const answer = MOON_ANSWERS[entry.answer];
                  return (
                    <li className="chance-history-entry" data-latest={(isCurrent && index === 0) || undefined} key={entry.id} title={`${faceName(entry.faces[0])}, ${faceName(entry.faces[1])}`}>
                      <span className="chance-history-items moon-glyphs" role="img" aria-label={`${faceName(entry.faces[0])} and ${faceName(entry.faces[1])}`}>
                        <BlockGlyph face={entry.faces[0]} />
                        <BlockGlyph face={entry.faces[1]} />
                      </span>
                      <span className="moon-history-name"><span lang="zh-Hant">{answer.hanzi}</span> {answer.name}</span>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        }),
      }}
    >
      <div ref={tableRef} className="moon-table" role="img" aria-label={label} aria-busy={throwing} data-answered={answered ? state.status : undefined}>
        {blocks.map((block, index) => (
          <div
            className="moon-block-spot"
            data-face={block.face}
            key={index}
            style={{ left: `${block.pose.x * 100}%`, top: `${block.pose.y * 100}%`, ['--moon-angle' as string]: `${block.pose.angle}deg` }}
          >
            <div className="moon-block-shadow">
              <div className="moon-shadow-turn">
                <div className="moon-shadow-flip">
                  <svg viewBox="0 0 100 64" aria-hidden="true"><path d={ROUND_PATH} /></svg>
                </div>
              </div>
            </div>
            <div className="moon-block-flight">
              <div className="moon-block-turn">
                <div className="moon-block-flip">
                  <BlockFaceArt face="flat" className="moon-block-face" />
                  <BlockFaceArt face="round" className="moon-block-face" />
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={confettiRef} className="moon-confetti" aria-hidden="true" />
      </div>
    </ChanceTable>
  );
};
