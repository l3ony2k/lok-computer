/**
 * Ask AI pipeline: a person asks a question, a fast LLM decides how Jev
 * should answer it, and Jev answers with calibrated probabilities.
 *
 * Jev (TypeSafe's System One model, https://docs.typesafe.ai) does not
 * generate text. It evaluates a `state` against typed questions (noul,
 * choice, score). The planner LLM reads the question and replies with one of:
 * - `plan`: the state plus a primary question that answers the person
 *   directly and up to four supporting questions for analytics;
 * - `needs_input`: the question refers to material the person has not given
 *   (or personal facts only they know), with 1-3 fields to ask for;
 * - `refuse`: Jev cannot judge it (generation, arithmetic, no answer space).
 * This module validates the reply, calls Jev, checks the primary choice
 * against option-order bias, and forms the best answer with evidence.
 *
 * Environment:
 * - TYPESAFE_API_KEY: Jev API key (secret)
 * - JEV_MODEL: Jev model or alias (default `jev-latest`)
 * - JEV_PLANNER_MODEL: planner model on AI_BASE_URL (default AI_MODEL)
 * - JEV_PLANNER_REASONING_EFFORT: planner reasoning_effort (default "none"; "" omits it)
 * - AI_BASE_URL / AI_API_KEY: OpenAI-compatible endpoint shared with /api/chat
 */

export const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const DEFAULT_JEV_MODEL = 'jev-latest';
/** Appended to the primary choice's key for the reversed-order duplicate. */
export const ORDER_CHECK_SUFFIX = '__reordered';

export const LIMITS = {
  promptChars: 2000,
  stateChars: 20000,
  questions: 8,
  supportingQuestions: 4,
  choiceOptions: 24,
  scoreLevels: 10,
  textChars: 600,
  labelChars: 60,
  instructionChars: 2000,
  levelChars: 600,
  questionsChars: 16000,
  inputFields: 3,
  inputs: 6,
  inputChars: 8000,
};

/** Confidence bands for the best answer; TypeSafe suggests not acting below 0.5. */
export const CERTAINTY = { high: 0.8, medium: 0.5 };

export class JevError extends Error {
  /**
   * @param {string} message Safe to show to visitors.
   * @param {number} status HTTP status for the API response.
   * @param {{ code?: 'invalid_plan', details?: string }} [options]
   */
  constructor(message, status = 500, options = {}) {
    super(message);
    this.name = 'JevError';
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

const invalidPlan = (message) => new JevError(message, 422, { code: 'invalid_plan' });

export const PLANNER_SYSTEM_PROMPT = `You are the planner for Ask AI. A person asks a question; you decide how Jev, a decision model, should answer it, or what is missing.

About Jev: it does not write text. It reads a STATE (the material being judged) and answers typed QUESTIONS about it with calibrated probabilities:
- "noul": a yes/no question. Returns the probability of yes.
- "choice": one option from a closed set. Returns a probability for every option.
- "score": a position on an ordered scale of 3-5 levels. Returns a value between levels.
Every question is answered on its own, so each must stand alone.

Reply with one JSON object in exactly one of these shapes.

1. PLAN, when the question can be judged now:
{"kind": "plan",
 "summary": "<one short sentence saying what Jev will judge>",
 "rationale": "<one short sentence on why this question type fits>",
 "state": <the material to judge: a string, or an object with descriptive field names>,
 "answer": <QUESTION that answers the person's question directly>,
 "analytics": [<0-3 QUESTIONs that add useful supporting evidence>]}
QUESTION = {"key": "<snake_case>", "label": "<2-5 word title>", "type": "noul" | "choice" | "score", "instructions": "<the complete question>", "criteria": <see below>}
- noul criteria: {"true": "<what yes means>", "false": "<what no means>"}
- choice criteria: {"<option_key>": "<one line on what this option means>", ...} with 2-8 options
- score criteria: ["<lowest level>", ..., "<highest level>"] with 3-5 levels, each a concrete situation rather than a degree word

2. NEEDS_INPUT, when the question is about material the person has not given ("this email", "my essay", "the contract"), or the answer depends on personal facts only they know:
{"kind": "needs_input",
 "message": "<one or two friendly sentences asking for it>",
 "fields": [{"key": "<snake_case>", "label": "<short label>", "placeholder": "<what to paste or type>", "multiline": true | false, "required": true | false}]}
Personal decisions ("Should I quit my job?", "Is my plan realistic?", "Is my essay good?") need the person's situation or material: ask for it unless the question already describes it.
Ask for 1-3 fields, only what the judgment needs. "required": false means you could answer without it, but better with it. Never ask for facts you can supply from general knowledge.

3. REFUSE, when Jev cannot answer:
{"kind": "refuse", "message": "<one sentence on why>", "suggestion": "<a rephrased question Jev could answer>"}
Refuse requests to write, summarize, translate, list, or explain something (Jev does not generate text); exact arithmetic, counting, or date calculations; and questions with no judgeable answer.

Choosing the answer type:
- noul for a clear yes/no condition. Phrase it so that yes means the condition holds.
- choice when the answer is one of several categories, names, places, or alternatives. List every plausible option, add "other" or "none_of_these" when the list may not cover the answer, and do not put the expected answer first.
- score for degree or intensity (how risky, how formal, how spicy).
- "Should I ..." questions: noul when the decision is binary; choice between the alternatives the person names.
- "Which/what ..." questions with an open answer: a choice over the most plausible candidates.

Writing questions (Jev reads literally and never sees keys or labels):
- "instructions" states the exact condition in full. Refer to state fields in backticks, e.g. \`email.body\`.
- One judgment about one thing per question. Never ask about "each" of several items in one question; compare them in a choice instead.
- Supporting questions are judgments that bear on the answer: a deciding factor, a risk, a counterpoint, or a related condition. Each must be answerable from the state and general knowledge alone. Never restate the answer question, never ask whether information is known or available, never ask about the person's own circumstances unless they gave them, and never ask about dates, years, counts, or amounts. Fewer, sharper questions beat more: return an empty "analytics" list rather than a weak question.
- Criteria say what an option or level means. They never argue for an option or contain the verdict, and they never contradict the instructions.
- Write instructions and criteria in English. Write summary, rationale, message, labels, and placeholders in the person's language.

The state:
- When SUPPLIED STATE is given, Jev receives it as the state. Set "state" to null, or to an object holding only extra background the judgment needs; never repeat the supplied material.
- When the person pastes material into the question itself, copy that material verbatim into the state.
- For general-knowledge questions, describe the subject neutrally, e.g. {"subject": "Pluto, the trans-Neptunian object"}. Add background facts only when a reader needs them to understand the question, and never state the answer, a verdict, or an opinion.
- The state holds material only: no questions, no instructions, and no dates unless the question is about timing.

Examples (abridged):
Q: Is Pluto a planet?
{"kind": "plan", "summary": "Checking how Pluto is officially classified today.", "rationale": "Its status is one of a few official categories.", "state": {"subject": "Pluto, the trans-Neptunian object"}, "answer": {"key": "classification", "label": "Official classification", "type": "choice", "instructions": "How does the International Astronomical Union officially classify \`subject\` today?", "criteria": {"planet": "One of the major planets", "dwarf_planet": "A dwarf planet", "asteroid": "An asteroid or minor planet", "moon": "A natural satellite of a planet"}}, "analytics": [{"key": "was_a_planet", "label": "Once a planet", "type": "noul", "instructions": "Was \`subject\` ever officially classified as a planet?", "criteria": {"true": "It was officially a planet at some point", "false": "It was never officially a planet"}}]}
Q: Is this email a phishing attempt?
{"kind": "needs_input", "message": "Paste the email and I'll check it. The sender address helps too.", "fields": [{"key": "email", "label": "Email", "placeholder": "Paste the full email text", "multiline": true, "required": true}, {"key": "sender", "label": "Sender address", "placeholder": "e.g. support@paypa1.com", "multiline": false, "required": false}]}
Q: Should I quit my job?
{"kind": "needs_input", "message": "That depends on your situation. Tell me a little about it.", "fields": [{"key": "situation", "label": "Your situation", "placeholder": "What is pushing you to leave, and what keeps you there?", "multiline": true, "required": true}, {"key": "plan", "label": "Plan after quitting", "placeholder": "e.g. another offer, savings for six months, no plan yet", "multiline": false, "required": false}]}
Q: Write me a poem about autumn.
{"kind": "refuse", "message": "Jev judges and chooses; it does not write text.", "suggestion": "Which season do poets write about most: spring, summer, autumn, or winter?"}`;

const SUPPLIED_STATE_NOTE = 'SUPPLIED STATE (Jev receives exactly this as the state, merged with any extra background object you return; refer to its fields in backticks):';
const ANSWER_ANYWAY_NOTE = 'The person chose to continue without giving more input. Do not return "needs_input": return a plan from what is available, or refuse if the question cannot be judged at all.';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const toPropertyName = (value) => {
  const name = String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  if (!name) return null;
  return /^[a-z]/.test(name) ? name : `p_${name}`;
};

/** "dwarf_planet" → "Dwarf planet". */
export const humanizeKey = (key) => {
  const text = String(key ?? '').replace(/_+/g, ' ').trim();
  return text ? text[0].toUpperCase() + text.slice(1) : '';
};

const clipText = (value, max = LIMITS.textChars) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
};

const serializedLength = (value) => {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return Infinity;
  }
};

/** Accepts a string, object, or array state within the size budget. */
export const normalizeState = (state) => {
  if (state === null || state === undefined) return null;
  if (typeof state === 'string') {
    const text = state.trim();
    if (!text) return null;
    if (text.length > LIMITS.stateChars) throw new JevError(`Content is limited to ${LIMITS.stateChars} characters.`, 400);
    return text;
  }
  if (typeof state === 'object') {
    if (serializedLength(state) > LIMITS.stateChars) throw new JevError(`Content is limited to ${LIMITS.stateChars} characters.`, 400);
    return state;
  }
  if (typeof state === 'number' || typeof state === 'boolean') return String(state);
  throw new JevError('State must be text or JSON.', 400);
};

/** Follow-up answers keyed by the requested field keys; empty answers are dropped. */
export const normalizeInputs = (inputs) => {
  if (inputs === null || inputs === undefined) return null;
  if (!isPlainObject(inputs)) throw new JevError('Inputs must be an object of field answers.', 400);
  const entries = [];
  for (const [rawKey, rawValue] of Object.entries(inputs)) {
    const key = toPropertyName(rawKey);
    if (!key || rawValue === null || rawValue === undefined) continue;
    const value = String(rawValue).trim();
    if (!value) continue;
    if (value.length > LIMITS.inputChars) throw new JevError(`Each answer is limited to ${LIMITS.inputChars} characters.`, 400);
    entries.push([key, value]);
  }
  if (entries.length > LIMITS.inputs) throw new JevError(`A question takes at most ${LIMITS.inputs} answers.`, 400);
  return entries.length ? Object.fromEntries(entries) : null;
};

/** Combines content supplied through the API (`state`) with follow-up answers (`inputs`). */
export const buildSuppliedState = ({ state, inputs } = {}) => {
  const base = normalizeState(state ?? null);
  const answers = normalizeInputs(inputs);
  if (!answers) return base;
  if (base === null) return normalizeState(answers);
  if (isPlainObject(base)) return normalizeState({ ...base, ...answers });
  return normalizeState({ content: base, ...answers });
};

const squash = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Supplied material always reaches Jev unchanged. The planner may add
 * background fields, but copies of the supplied material are dropped so the
 * state carries no duplicated distractors.
 */
const mergeState = (plannerState, supplied) => {
  if (supplied === null) return plannerState;
  if (!isPlainObject(supplied) || !isPlainObject(plannerState)) return supplied;
  const suppliedTexts = Object.values(supplied).filter((value) => typeof value === 'string').map(squash);
  const extra = Object.fromEntries(Object.entries(plannerState).filter(([key, value]) => {
    if (key in supplied) return false;
    if (typeof value !== 'string') return true;
    const text = squash(value);
    return !suppliedTexts.some((source) => source.includes(text) || (text.length > 80 && text.includes(source)));
  }));
  return normalizeState({ ...extra, ...supplied });
};

const normalizeInstructions = (value, property) => {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) throw invalidPlan(`Question "${property}" has no instructions.`);
    return text.slice(0, LIMITS.instructionChars);
  }
  if (isPlainObject(value) || Array.isArray(value)) {
    if (serializedLength(value) > LIMITS.instructionChars) throw invalidPlan(`Question "${property}" instructions are too long.`);
    return value;
  }
  throw invalidPlan(`Question "${property}" has no instructions.`);
};

const normalizeQuestion = (property, raw) => {
  if (!isPlainObject(raw)) throw invalidPlan(`Question "${property}" must be an object.`);
  const type = String(raw.type ?? '').toLowerCase();
  const instructions = normalizeInstructions(raw.instructions ?? raw.question, property);

  if (type === 'noul') {
    const question = { type, instructions };
    if (isPlainObject(raw.criteria)) {
      const yes = clipText(raw.criteria.true ?? raw.criteria.yes);
      const no = clipText(raw.criteria.false ?? raw.criteria.no);
      if (yes || no) question.criteria = { ...(yes ? { true: yes } : {}), ...(no ? { false: no } : {}) };
    }
    return question;
  }

  if (type === 'choice') {
    let entries = [];
    if (isPlainObject(raw.criteria)) entries = Object.entries(raw.criteria);
    else if (Array.isArray(raw.criteria)) entries = raw.criteria.map((option) => [option, null]);
    const criteria = {};
    for (const [key, description] of entries) {
      const option = toPropertyName(key);
      if (!option || option in criteria) continue;
      criteria[option] = description === null || description === undefined ? null : clipText(description);
    }
    const count = Object.keys(criteria).length;
    if (count < 2) throw invalidPlan(`Choice "${property}" needs at least two options.`);
    if (count > LIMITS.choiceOptions) throw invalidPlan(`Choice "${property}" has more than ${LIMITS.choiceOptions} options.`);
    return { type, instructions, criteria };
  }

  if (type === 'score') {
    const levels = (Array.isArray(raw.criteria) ? raw.criteria : [])
      .map((level) => (typeof level === 'string' ? clipText(level, LIMITS.levelChars) : isPlainObject(level) ? level : null))
      .filter(Boolean);
    if (levels.some((level) => typeof level !== 'string' && serializedLength(level) > LIMITS.levelChars)) {
      throw invalidPlan(`Score "${property}" has a level longer than ${LIMITS.levelChars} characters.`);
    }
    if (levels.length < 2) throw invalidPlan(`Score "${property}" needs at least two levels.`);
    if (levels.length > LIMITS.scoreLevels) throw invalidPlan(`Score "${property}" has more than ${LIMITS.scoreLevels} levels.`);
    return { type, instructions, criteria: levels };
  }

  throw invalidPlan(`Question "${property}" has unknown type "${raw.type}".`);
};

/** Planner questions arrive as a list of {key, label, ...}; stored plans as a map. */
const questionEntries = (value) => {
  if (Array.isArray(value)) return value.map((question) => [question?.key ?? question?.label, question]);
  if (isPlainObject(value)) return Object.entries(value);
  return [];
};

/**
 * Validates a plan from the planner (`answer` + `analytics`) or from a person
 * editing a stored plan (`primary` + `questions`). Supplied material always
 * wins over the planner's state. The primary question comes first.
 */
export const normalizePlan = (raw, suppliedState = null) => {
  if (!isPlainObject(raw)) throw invalidPlan('The plan must be a JSON object.');

  const ordered = [];
  if (raw.answer !== undefined) {
    if (!isPlainObject(raw.answer)) throw invalidPlan('The plan needs an "answer" question.');
    ordered.push([raw.answer.key ?? raw.answer.label ?? 'answer', raw.answer]);
    ordered.push(...questionEntries(raw.analytics).slice(0, LIMITS.supportingQuestions));
  } else {
    const entries = questionEntries(raw.questions);
    const primaryKey = toPropertyName(raw.primary);
    const found = primaryKey ? entries.findIndex(([key]) => toPropertyName(key) === primaryKey) : 0;
    if (found === -1) throw invalidPlan(`The primary question "${primaryKey}" is not in "questions".`);
    if (entries.length) ordered.push(entries[found], ...entries.filter((_, index) => index !== found));
  }
  if (!ordered.length) throw invalidPlan('The plan has no questions.');

  const rawLabels = isPlainObject(raw.labels) ? raw.labels : {};
  const questions = {};
  const labels = {};
  for (const [rawKey, value] of ordered) {
    const property = toPropertyName(rawKey);
    if (!property || property in questions) continue;
    questions[property] = normalizeQuestion(property, value);
    labels[property] = clipText(value?.label ?? rawLabels[rawKey] ?? rawLabels[property], LIMITS.labelChars) ?? humanizeKey(property);
    if (Object.keys(questions).length > LIMITS.questions) {
      throw invalidPlan(`A request is limited to ${LIMITS.questions} questions.`);
    }
  }
  if (!Object.keys(questions).length) throw invalidPlan('The plan has no questions.');
  if (serializedLength(questions) > LIMITS.questionsChars) {
    throw invalidPlan(`Questions are limited to ${LIMITS.questionsChars} characters in total.`);
  }

  const state = mergeState(normalizeState(raw.state ?? null), suppliedState);
  if (state === null) throw invalidPlan('The plan has no content to evaluate.');

  const primary = Object.keys(questions)[0];
  return {
    summary: clipText(raw.summary, 240) ?? `Judging ${labels[primary].toLowerCase()}.`,
    rationale: clipText(raw.rationale, 240),
    state,
    primary,
    labels,
    questions,
  };
};

const normalizeInputRequest = (raw) => {
  const fields = [];
  for (const [rawKey, field] of questionEntries(raw.fields)) {
    if (fields.length === LIMITS.inputFields) break;
    const spec = isPlainObject(field) ? field : { label: field };
    const key = toPropertyName(spec.key ?? rawKey ?? spec.label);
    if (!key || fields.some((existing) => existing.key === key)) continue;
    fields.push({
      key,
      label: clipText(spec.label, 80) ?? humanizeKey(key),
      placeholder: clipText(spec.placeholder, 200) ?? '',
      multiline: spec.multiline === true,
      required: spec.required !== false,
    });
  }
  if (!fields.length) throw invalidPlan('A "needs_input" reply must list at least one field.');
  return {
    kind: 'needs_input',
    message: clipText(raw.message, 400) ?? 'A little more detail would help Jev answer this.',
    fields,
    optional: fields.every((field) => !field.required),
  };
};

const normalizeRefusal = (raw) => ({
  kind: 'refuse',
  message: clipText(raw.message ?? raw.error, 400) ?? 'Jev cannot judge that question.',
  suggestion: clipText(raw.suggestion, 300),
});

/**
 * Validates a planner reply into `{kind: 'plan', plan}`, `{kind: 'needs_input', ...}`
 * or `{kind: 'refuse', ...}`. Invalid replies throw with code `invalid_plan`.
 */
export const normalizePlannerReply = (raw, { suppliedState = null, answerAnyway = false } = {}) => {
  if (!isPlainObject(raw)) throw invalidPlan('The reply must be a JSON object.');
  const kind = String(raw.kind ?? '').toLowerCase().replace(/[^a-z]+/g, '_');

  if (kind === 'refuse' || kind === 'refusal' || (!kind && typeof raw.error === 'string' && raw.error.trim())) {
    return normalizeRefusal(raw);
  }
  if (kind === 'needs_input' || kind === 'need_input') {
    if (answerAnyway) throw invalidPlan(ANSWER_ANYWAY_NOTE);
    return normalizeInputRequest(raw);
  }
  if (kind === 'plan' || raw.answer !== undefined || raw.questions !== undefined) {
    return { kind: 'plan', plan: normalizePlan(raw, suppliedState) };
  }
  throw invalidPlan('Set "kind" to "plan", "needs_input", or "refuse".');
};

/** Pulls the first JSON object out of a model reply, tolerating code fences and prose. */
export const extractJsonObject = (text) => {
  if (isPlainObject(text)) return text;
  const source = String(text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(source);
  } catch {
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(source.slice(start, end + 1));
      } catch {
        // Fall through to the error below.
      }
    }
  }
  throw invalidPlan('The planner did not return JSON.');
};

/**
 * The Jev question map for a plan. Jev leans toward the first option of a
 * Choice (docs: model jaggedness), so the primary choice is asked a second
 * time with its options reversed; formResult averages and compares the two.
 */
export const buildJevQuestions = (plan) => {
  const questions = { ...plan.questions };
  const primary = plan.questions[plan.primary];
  if (primary?.type === 'choice') {
    questions[`${plan.primary}${ORDER_CHECK_SUFFIX}`] = {
      ...primary,
      criteria: Object.fromEntries(Object.entries(primary.criteria).reverse()),
    };
  }
  return questions;
};

const round = (value, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
};

const sortedDistribution = (probabilities) => Object.fromEntries(
  Object.entries(probabilities)
    .map(([key, value]) => [key, round(value)])
    .sort((a, b) => b[1] - a[1]),
);

const numericDistribution = (probabilities) => Object.fromEntries(
  Object.entries(isPlainObject(probabilities) ? probabilities : {})
    .map(([key, value]) => [key, Number(value)])
    .filter(([, value]) => Number.isFinite(value)),
);

/** TypeSafe's Choice confidence: how far the top option sits above an even split. */
export const choiceConfidence = (probabilities) => {
  const values = Object.values(probabilities);
  if (values.length < 2) return 1;
  const n = values.length;
  return Math.max(0, Math.min(1, (Math.max(...values) - 1 / n) / (1 - 1 / n)));
};

const certaintyFor = (confidence) => (
  confidence >= CERTAINTY.high ? 'high' : confidence >= CERTAINTY.medium ? 'medium' : 'low'
);

const describeInstructions = (instructions) => (
  typeof instructions === 'string' ? instructions : JSON.stringify(instructions)
);

const levelText = (level) => (typeof level === 'string' ? level : JSON.stringify(level));

const percentText = (value) => `${Math.round(value * 100)}%`;

const topTwo = (probabilities) => Object.entries(probabilities).sort((a, b) => b[1] - a[1]).slice(0, 2);

/**
 * Forms the response from Jev's answers:
 * - `best`: the primary question's answer in plain words, with its probability,
 *   confidence, and certainty band;
 * - `properties`: per-question evidence (distributions, confidence, order check);
 * - `result`: plain values keyed by question, for code;
 * - `notes`: close calls, low confidence, and the order check.
 */
export const formResult = (plan, answers) => {
  const result = {};
  const properties = {};
  const notes = [];

  for (const [key, question] of Object.entries(plan.questions)) {
    const answer = answers?.[key];
    if (!answer) continue;
    const base = {
      type: question.type,
      title: plan.labels?.[key] ?? humanizeKey(key),
      question: describeInstructions(question.instructions),
      primary: key === plan.primary,
    };

    if (question.type === 'noul' && Number.isFinite(Number(answer.noul))) {
      const probability = round(answer.noul);
      result[key] = probability >= 0.5;
      properties[key] = {
        ...base,
        value: probability >= 0.5,
        probability,
        // Nouls carry no confidence; TypeSafe suggests |2p - 1| on the same scale.
        confidence: round(Math.abs(2 * probability - 1)),
        criteria: question.criteria ?? null,
      };
    } else if (question.type === 'choice' && typeof answer.choice === 'string') {
      let probabilities = numericDistribution(answer.probabilities);
      let orderCheck = null;
      const reordered = answers?.[`${key}${ORDER_CHECK_SUFFIX}`];
      if (base.primary && reordered && typeof reordered.choice === 'string') {
        const second = numericDistribution(reordered.probabilities);
        const listed = { choice: answer.choice, probability: round(probabilities[answer.choice] ?? 0) };
        const reversed = { choice: reordered.choice, probability: round(second[reordered.choice] ?? 0) };
        probabilities = Object.fromEntries(Object.keys(question.criteria).map((option) => (
          [option, ((probabilities[option] ?? 0) + (second[option] ?? 0)) / 2]
        )));
        orderCheck = { consistent: listed.choice === reversed.choice, listed, reversed };
      }
      const value = orderCheck
        ? Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0]
        : answer.choice;
      const confidence = orderCheck || !Number.isFinite(Number(answer.confidence))
        ? choiceConfidence(probabilities)
        : Number(answer.confidence);
      result[key] = value;
      properties[key] = {
        ...base,
        value,
        confidence: round(confidence),
        probabilities: sortedDistribution(probabilities),
        options: question.criteria,
        ...(orderCheck ? { orderCheck } : {}),
      };
    } else if (question.type === 'score' && Number.isFinite(Number(answer.score))) {
      const scale = question.criteria.map(levelText);
      const level = Math.min(scale.length - 1, Math.max(0, Math.round(answer.score)));
      const value = round(answer.score, 2);
      result[key] = value;
      properties[key] = {
        ...base,
        value,
        level,
        levelText: scale[level],
        max: scale.length - 1,
        confidence: round(answer.confidence),
        probabilities: Object.fromEntries(
          Object.entries(numericDistribution(answer.probabilities)).map(([index, probability]) => [index, round(probability)]),
        ),
        scale,
      };
    }
  }

  const primary = properties[plan.primary];
  let best = null;
  if (primary) {
    let answerText;
    let detail = null;
    let probability;
    if (primary.type === 'noul') {
      answerText = primary.value ? 'Yes' : 'No';
      detail = primary.criteria?.[primary.value ? 'true' : 'false'] ?? null;
      probability = primary.value ? primary.probability : round(1 - primary.probability);
      if (primary.probability > 0.35 && primary.probability < 0.65) {
        notes.push({ tone: 'warn', text: `Close to a coin flip: p(yes) = ${primary.probability.toFixed(2)}.` });
      }
    } else if (primary.type === 'choice') {
      answerText = humanizeKey(primary.value);
      detail = primary.options?.[primary.value] ?? null;
      probability = primary.probabilities[primary.value] ?? 0;
      const [first, second] = topTwo(primary.probabilities);
      if (second && second[1] >= 0.15 && second[1] >= first[1] * 0.6) {
        notes.push({ tone: 'warn', text: `Close call: ${humanizeKey(first[0])} ${percentText(first[1])} vs ${humanizeKey(second[0])} ${percentText(second[1])}.` });
      }
      if (primary.orderCheck) {
        notes.push(primary.orderCheck.consistent
          ? { tone: 'ok', text: 'Same answer with the options listed in reverse order.' }
          : { tone: 'warn', text: `The answer changed when the options were reversed (${humanizeKey(primary.orderCheck.listed.choice)} vs ${humanizeKey(primary.orderCheck.reversed.choice)}), so it is less settled than the numbers suggest.` });
      }
    } else {
      answerText = primary.levelText;
      probability = primary.probabilities[String(primary.level)] ?? 0;
      if (primary.confidence < 0.3) {
        notes.push({ tone: 'warn', text: 'Probability is spread across distant levels; the scale may not fit the question well.' });
      }
    }

    let certainty = certaintyFor(primary.confidence);
    if (primary.orderCheck && !primary.orderCheck.consistent) certainty = 'low';
    if (certainty === 'low') {
      notes.unshift({ tone: 'warn', text: `Jev is unsure (confidence ${primary.confidence.toFixed(2)}). Treat this as a lean, not an answer.` });
    }

    best = {
      key: plan.primary,
      title: primary.title,
      question: primary.question,
      type: primary.type,
      value: primary.value,
      answer: answerText,
      detail,
      probability: round(probability),
      confidence: primary.confidence,
      certainty,
    };
  }

  for (const [key, property] of Object.entries(properties)) {
    if (key !== plan.primary && property.confidence < CERTAINTY.medium) {
      notes.push({ tone: 'info', text: `Low confidence on “${property.title}” (${property.confidence.toFixed(2)}).` });
    }
  }

  return { best, result, properties, notes };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readUpstreamError = async (response) => {
  const text = await response.text().catch(() => '');
  try {
    const body = JSON.parse(text);
    const detail = body?.detail ?? body?.error ?? body;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item) => item?.msg ?? JSON.stringify(item)).join('; ');
    if (detail?.message) return detail.message;
    return JSON.stringify(detail).slice(0, 300);
  } catch {
    return text.slice(0, 300) || response.statusText;
  }
};

/** Network and decoding failures upstream are gateway errors, not server bugs. */
const fetchUpstream = async (fetchImpl, url, init, service) => {
  try {
    return await fetchImpl(url, init);
  } catch (error) {
    throw new JevError(`${service} is unreachable right now.`, 502, { details: String(error) });
  }
};

const readUpstreamJson = async (response, service) => {
  try {
    return await response.json();
  } catch (error) {
    throw new JevError(`${service} returned an unreadable reply.`, 502, { details: String(error) });
  }
};

/**
 * Calls Jev with a request body ({model, state, questions}), retrying rate
 * limits and overload with short backoff.
 */
export const askJev = async (request, env, fetchImpl = (...args) => fetch(...args)) => {
  if (!env.TYPESAFE_API_KEY) throw new JevError('Jev is not configured on this server.', 503);
  const body = JSON.stringify(request);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetchUpstream(fetchImpl, JEV_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
        'User-Agent': 'lok-computer-worker/1.0',
      },
      body,
    }, 'Jev');

    if (response.ok) return readUpstreamJson(response, 'Jev');

    if ((response.status === 429 || response.status === 529) && attempt < 2) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Math.min(4000, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 400 * 2 ** attempt));
      continue;
    }

    const message = await readUpstreamError(response);
    if (response.status === 422 || response.status === 400) throw new JevError(`Jev rejected the questions: ${message}`, 422);
    if (response.status === 401 || response.status === 403) throw new JevError('Jev rejected the server credentials.', 502);
    if (response.status === 429 || response.status === 529) throw new JevError('Jev is busy right now. Try again in a moment.', 503);
    throw new JevError(`Jev request failed (${response.status}).`, 502, { details: message });
  }
  throw new JevError('Jev is busy right now. Try again in a moment.', 503);
};

const buildPlannerMessages = ({ question, suppliedState, answerAnyway, today }, feedback) => {
  const parts = [`TODAY (for judging what is current; not part of the state): ${today}`, `QUESTION:\n${question}`];
  if (suppliedState !== null) parts.push(`${SUPPLIED_STATE_NOTE}\n${JSON.stringify(suppliedState, null, 2)}`);
  if (answerAnyway) parts.push(ANSWER_ANYWAY_NOTE);
  const messages = [
    { role: 'system', content: PLANNER_SYSTEM_PROMPT },
    { role: 'user', content: parts.join('\n\n') },
  ];
  if (feedback) {
    messages.push({ role: 'assistant', content: feedback.output });
    messages.push({ role: 'user', content: `That reply was invalid: ${feedback.error} Return the corrected JSON object only.` });
  }
  return messages;
};

/**
 * Planning is a short structured task, so hidden reasoning only adds latency
 * (about 13s instead of 5s on gemini-2.5-flash-lite). Set
 * JEV_PLANNER_REASONING_EFFORT to another level, or to "" to omit the field.
 */
const plannerReasoningEffort = (env) => env.JEV_PLANNER_REASONING_EFFORT ?? 'none';

const callPlanner = async (messages, env, fetchImpl, extras) => {
  if (!env.AI_BASE_URL || !env.AI_API_KEY) throw new JevError('The question planner is not configured on this server.', 503);
  const effort = plannerReasoningEffort(env);
  const response = await fetchUpstream(fetchImpl, `${env.AI_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.JEV_PLANNER_MODEL || env.AI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      ...(extras ? { response_format: { type: 'json_object' }, ...(effort ? { reasoning_effort: effort } : {}) } : {}),
    }),
  }, 'The question planner');

  if (!response.ok) {
    const message = await readUpstreamError(response);
    // Some OpenAI-compatible providers reject response_format or reasoning_effort; retry once without both.
    if (extras && response.status === 400) return callPlanner(messages, env, fetchImpl, false);
    throw new JevError(`The question planner failed (${response.status}).`, 502, { details: message });
  }

  const data = await readUpstreamJson(response, 'The question planner');
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new JevError('The question planner returned an empty reply.', 502);
  return { content, model: data.model ?? env.JEV_PLANNER_MODEL ?? env.AI_MODEL ?? null };
};

/** Reads the question from `question` (or the older `prompt`). */
const readQuestion = (body) => {
  const question = clipText(body?.question ?? body?.prompt, LIMITS.promptChars + 1);
  if (!question) throw new JevError('Ask a question.', 400);
  if (question.length > LIMITS.promptChars) throw new JevError(`Questions are limited to ${LIMITS.promptChars} characters.`, 400);
  return question;
};

/**
 * Plans a question: returns a plan, a request for more input, or a refusal.
 * Malformed replies get one corrective retry with the validation error.
 */
export const planQuestions = async (body, env, fetchImpl = (...args) => fetch(...args)) => {
  const question = readQuestion(body);
  const suppliedState = buildSuppliedState({ state: body?.state, inputs: body?.inputs });
  const answerAnyway = body?.answerAnyway === true;
  const context = { question, suppliedState, answerAnyway, today: new Date().toISOString().slice(0, 10) };

  let feedback = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const reply = await callPlanner(buildPlannerMessages(context, feedback), env, fetchImpl, true);
    try {
      const outcome = normalizePlannerReply(extractJsonObject(reply.content), { suppliedState, answerAnyway });
      return { ...outcome, plannerModel: reply.model };
    } catch (error) {
      // Malformed replies get one corrective retry; other failures surface as-is.
      if (attempt === 1 || !(error instanceof JevError) || error.code !== 'invalid_plan') throw error;
      feedback = { output: reply.content, error: error.message };
    }
  }
  throw new JevError('The question planner could not produce a valid plan.', 502);
};

/**
 * Full pipeline for one request. A supplied `plan` skips the planner;
 * otherwise a `needs_input` or `refuse` outcome returns without calling Jev.
 */
export const runJevRequest = async (body, env, fetchImpl = (...args) => fetch(...args)) => {
  const timing = { plannerMs: null, jevMs: 0 };
  let plan;
  let plannerModel = null;

  if (body?.plan) {
    plan = normalizePlan(body.plan, buildSuppliedState({ state: body.state, inputs: body.inputs }));
  } else {
    const started = Date.now();
    const planned = await planQuestions(body ?? {}, env, fetchImpl);
    timing.plannerMs = Date.now() - started;
    plannerModel = planned.plannerModel;
    if (planned.kind !== 'plan') {
      const { plannerModel: model, ...outcome } = planned;
      return { ...outcome, planner: model ? { model } : null, timing };
    }
    plan = planned.plan;
  }

  const request = {
    model: env.JEV_MODEL || DEFAULT_JEV_MODEL,
    state: plan.state,
    questions: buildJevQuestions(plan),
  };
  const started = Date.now();
  const response = await askJev(request, env, fetchImpl);
  timing.jevMs = Date.now() - started;
  const { best, result, properties, notes } = formResult(plan, response.answers);

  return {
    kind: 'answer',
    model: response.model ?? request.model,
    planner: plannerModel ? { model: plannerModel } : null,
    plan,
    best,
    result,
    properties,
    notes,
    jev: { request, response },
    usage: response.usage ?? null,
    timing,
  };
};
