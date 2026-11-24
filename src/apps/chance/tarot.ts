/**
 * The 78-card tarot deck with short keyword meanings (Rider–Waite tradition).
 * A minor card's meaning is its rank's; its suit names the sphere of life the
 * meaning plays out in, shown on its own line. The Ask AI hand-off is there for
 * anyone who wants more than keywords.
 */

export type TarotArcana = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

export interface TarotCard {
  id: string;
  name: string;
  arcana: TarotArcana;
  /** Roman numeral for the majors, the rank for the minors. */
  label: string;
  /** The minors' suit and the short sphere of life it stands for. */
  suit?: TarotSuit;
  upright: string;
  reversed: string;
}

export interface TarotSuit {
  name: string;
  sphere: string;
}

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

const MAJOR: Array<[string, string, string]> = [
  ['The Fool', 'beginnings, innocence, a leap of faith', 'recklessness, hesitation, a false start'],
  ['The Magician', 'will, skill, making it happen', 'manipulation, scattered energy, untapped talent'],
  ['The High Priestess', 'intuition, mystery, the unconscious', 'secrets withheld, a silenced inner voice'],
  ['The Empress', 'abundance, nurturing, creativity', 'dependence, neglect, a creative block'],
  ['The Emperor', 'structure, authority, stability', 'rigidity, domination, lack of discipline'],
  ['The Hierophant', 'tradition, guidance, shared belief', 'rebellion, dogma, questioning the rules'],
  ['The Lovers', 'union, a heartfelt choice, harmony', 'imbalance, misalignment, avoidance'],
  ['The Chariot', 'drive, control, victory through will', 'aggression, lack of direction, a stalled push'],
  ['Strength', 'courage, patience, quiet inner strength', 'self-doubt, raw force, low energy'],
  ['The Hermit', 'introspection, solitude, seeking guidance', 'isolation, withdrawal, loneliness'],
  ['Wheel of Fortune', 'change, cycles, a turn of luck', 'resistance to change, a run of bad luck'],
  ['Justice', 'fairness, truth, cause and effect', 'dishonesty, unfairness, dodging consequences'],
  ['The Hanged Man', 'pause, surrender, a new point of view', 'stalling, needless sacrifice, resistance'],
  ['Death', 'an ending, transformation, transition', 'fear of change, stagnation, clinging on'],
  ['Temperance', 'balance, moderation, patience', 'excess, imbalance, a lack of long-term vision'],
  ['The Devil', 'attachment, temptation, the shadow side', 'release, breaking free, reclaimed power'],
  ['The Tower', 'upheaval, revelation, sudden change', 'disaster averted, fear of change, slow collapse'],
  ['The Star', 'hope, renewal, inspiration', 'despair, lost faith, disconnection'],
  ['The Moon', 'illusion, intuition, uncertainty', 'clarity returning, fear released, confusion lifting'],
  ['The Sun', 'joy, success, vitality', 'temporary sadness, overconfidence, a clouded view'],
  ['Judgement', 'reckoning, awakening, renewal', 'self-doubt, harsh judgement, refusing the call'],
  ['The World', 'completion, wholeness, travel', 'incompletion, delays, seeking closure'],
];

const SUITS: Array<TarotSuit & { id: Exclude<TarotArcana, 'major'> }> = [
  { id: 'wands', name: 'Wands', sphere: 'drive and ambition' },
  { id: 'cups', name: 'Cups', sphere: 'feelings and relationships' },
  { id: 'swords', name: 'Swords', sphere: 'thought and conflict' },
  { id: 'pentacles', name: 'Pentacles', sphere: 'work and money' },
];

const RANKS: Array<[string, string, string]> = [
  ['Ace', 'a new beginning', 'a missed start, blocked potential'],
  ['Two', 'a choice, balance, partnership', 'indecision, imbalance'],
  ['Three', 'growth, collaboration, first results', 'delays, poor teamwork'],
  ['Four', 'stability, rest, consolidation', 'restlessness, stagnation'],
  ['Five', 'conflict, loss, a struggle', 'recovery, a conflict easing'],
  ['Six', 'harmony, generosity, a transition', 'a difficult passage, unfair exchange'],
  ['Seven', 'assessment, perseverance, patience', 'impatience, giving up too soon'],
  ['Eight', 'movement, mastery, momentum', 'feeling stuck, repetitive effort'],
  ['Nine', 'fruition, resilience, nearly there', 'exhaustion, anxiety near the end'],
  ['Ten', 'completion, legacy, a full load', 'burden, an ending that drags'],
  ['Page', 'a message, curiosity, a student', 'immaturity, bad news, distraction'],
  ['Knight', 'action, pursuit, a quest', 'haste, recklessness, a stalled quest'],
  ['Queen', 'nurturing mastery, depth, care', 'insecurity, smothering, coldness'],
  ['King', 'authority, mastery, leadership', 'control, rigidity, misuse of power'],
];

export const TAROT_DECK: TarotCard[] = [
  ...MAJOR.map(([name, upright, reversed], index) => ({
    id: `major-${index}`,
    name,
    arcana: 'major' as const,
    label: ROMAN[index],
    upright,
    reversed,
  })),
  ...SUITS.flatMap(({ id, name, sphere }) => RANKS.map(([rank, upright, reversed]) => ({
    id: `${id}-${rank.toLowerCase()}`,
    name: `${rank} of ${name}`,
    arcana: id,
    label: rank,
    suit: { name, sphere },
    upright,
    reversed,
  }))),
];

/**
 * Pixel size of every card scan (src/assets/tarot, tarotImages.ts), so a card
 * holds its space before the art loads. tarotImages.test.ts checks the files.
 */
export const TAROT_IMAGE_SIZE = { width: 600, height: 1004 } as const;

export const arcanaLabel = (arcana: TarotArcana) => (
  arcana === 'major' ? 'Major Arcana' : `Suit of ${SUITS.find((suit) => suit.id === arcana)?.name ?? arcana}`
);
