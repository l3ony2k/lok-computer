/**
 * Ask AI pipeline: a fast LLM plans typed questions, Jev answers them.
 *
 * Jev (TypeSafe's System One model, https://docs.typesafe.ai) does not
 * generate text. It evaluates a `state` against typed questions (choice,
 * score, noul) and returns calibrated answers. A planner LLM turns a free-form
 * request into that request shape; this module validates the plan, calls Jev,
 * and forms a JSON object keyed by the requested properties.
 *
 * Environment:
 * - TYPESAFE_API_KEY: Jev API key (secret)
 * - JEV_MODEL: Jev model or alias (default `jev-latest`)
 * - JEV_PLANNER_MODEL: planner model on AI_BASE_URL (default AI_MODEL)
 * - AI_BASE_URL / AI_API_KEY: OpenAI-compatible endpoint shared with /api/chat
 */

export const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const DEFAULT_JEV_MODEL = 'jev-latest';

export const LIMITS = {
  promptChars: 2000,
  stateChars: 20000,
  questions: 8,
  choiceOptions: 24,
  scoreLevels: 10,
  textChars: 600,
  instructionChars: 2000,
  levelChars: 600,
  questionsChars: 16000,
};

export class JevError extends Error {
  /**
   * @param {string} message Safe to show to visitors.
   * @param {number} status HTTP status for the API response.
   * @param {{ code?: 'invalid_plan' | 'refused', details?: string }} [options]
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

export const PLANNER_SYSTEM_PROMPT = `You compile a person's request into a request for Jev, a decision model.

Jev does not write text. It reads a STATE (the content being judged) and answers typed QUESTIONS about it, each evaluated independently and in parallel:
- "noul": a yes/no question. Returns the probability that the answer is yes.
- "choice": pick one option from a closed set. Returns the option and a probability for every option.
- "score": place the state on an ordered rubric of 2-10 levels. Returns a position between levels.

Return only a JSON object with exactly these keys:
{
  "summary": "one short sentence saying what will be judged",
  "state": <string, or an object with descriptive field names>,
  "questions": {
    "<property_name>": { "type": "noul", "instructions": "<yes/no question>", "criteria": { "true": "<what yes means>", "false": "<what no means>" } },
    "<property_name>": { "type": "choice", "instructions": "<question>", "criteria": { "<option_key>": "<what this option means>", ... } },
    "<property_name>": { "type": "score", "instructions": "<question>", "criteria": ["<lowest level>", "...", "<highest level>"] }
  }
}

Rules:
1. Property names are the properties the person wants back, in snake_case (e.g. "sentiment", "is_urgent", "toxicity"). Use 1 to 8 questions.
2. One snap judgment per question, the kind an expert makes in a second. Split compound requests into several atomic questions instead of one broad one.
3. Write the complete question in "instructions"; property names are never shown to Jev. Be literal and specific: Jev answers exactly what is written.
4. Choice: 2 to 12 mutually exclusive options with snake_case keys and a one-line description each. Add "other" or "none" when the list might not cover every case.
5. Score: 3 to 5 levels ordered from least to most, each a concrete description. Use score for degrees (urgency, quality, formality), noul for clean yes/no conditions.
6. Noul: phrase as a yes/no question; "true" must describe yes and "false" must describe no.
7. State holds the content to evaluate and nothing else. When the person quotes or pastes content, copy it verbatim. When the state has several parts, use an object with named fields and refer to them in instructions with backticks, e.g. \`review.text\`.
8. If the request is about general knowledge rather than supplied content, make the state a short neutral description of the subject, e.g. {"subject": "the Python programming language"}.
9. Keep arithmetic, counting, and date comparisons out of questions; Jev is not a calculator. Never ask Jev to write or extract free text; turn it into a choice over plausible options instead.
10. Write instructions and criteria in English even when the content is in another language.
11. If no judgment can be made at all, return {"error": "<one sentence explaining what the person could ask instead>"}.`;

const SUPPLIED_STATE_NOTE = 'The person supplied the STATE separately (shown below as JSON). Use it as-is: set "state" to null in your answer and write questions about it. When it is an object, refer to its fields with backticks.';

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

/**
 * Validates a plan from the planner or from a person editing it.
 * A supplied state always wins over the planner's state.
 */
export const normalizePlan = (raw, suppliedState = null) => {
  if (!isPlainObject(raw)) throw invalidPlan('The plan must be a JSON object.');
  if (typeof raw.error === 'string' && raw.error.trim()) throw new JevError(raw.error.trim(), 422, { code: 'refused' });

  const state = suppliedState ?? normalizeState(raw.state);
  if (state === null) throw invalidPlan('The plan has no content to evaluate.');
  if (!isPlainObject(raw.questions)) throw invalidPlan('The plan has no questions.');

  const questions = {};
  for (const [key, value] of Object.entries(raw.questions)) {
    const property = toPropertyName(key);
    if (!property || property in questions) continue;
    questions[property] = normalizeQuestion(property, value);
    if (Object.keys(questions).length > LIMITS.questions) {
      throw invalidPlan(`A request is limited to ${LIMITS.questions} questions.`);
    }
  }
  if (!Object.keys(questions).length) throw invalidPlan('The plan has no questions.');
  if (serializedLength(questions) > LIMITS.questionsChars) {
    throw invalidPlan(`Questions are limited to ${LIMITS.questionsChars} characters in total.`);
  }

  return {
    summary: clipText(raw.summary, 240) ?? `Judging ${Object.keys(questions).join(', ')}`,
    state,
    questions,
  };
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

const round = (value, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
};

const roundedDistribution = (probabilities) => Object.fromEntries(
  Object.entries(isPlainObject(probabilities) ? probabilities : {})
    .map(([key, value]) => [key, round(value)])
    .sort((a, b) => b[1] - a[1]),
);

const describeInstructions = (instructions) => (
  typeof instructions === 'string' ? instructions : JSON.stringify(instructions)
);

const levelLabel = (level) => (typeof level === 'string' ? level : JSON.stringify(level));

/**
 * Forms the response: `result` maps each requested property to a plain value,
 * `properties` keeps the evidence (probabilities, confidence, scale).
 */
export const formResult = (plan, answers) => {
  const result = {};
  const properties = {};

  for (const [property, question] of Object.entries(plan.questions)) {
    const answer = answers?.[property];
    if (!answer) continue;
    const base = { type: question.type, question: describeInstructions(question.instructions) };

    if (question.type === 'noul' && typeof answer.noul === 'number') {
      const probability = round(answer.noul);
      result[property] = probability >= 0.5;
      properties[property] = { ...base, value: probability >= 0.5, probability };
    } else if (question.type === 'choice' && typeof answer.choice === 'string') {
      result[property] = answer.choice;
      properties[property] = {
        ...base,
        value: answer.choice,
        confidence: round(answer.confidence),
        probabilities: roundedDistribution(answer.probabilities),
        options: question.criteria,
      };
    } else if (question.type === 'score' && typeof answer.score === 'number') {
      const scale = question.criteria.map(levelLabel);
      const level = Math.min(scale.length - 1, Math.max(0, Math.round(answer.score)));
      const value = round(answer.score, 2);
      result[property] = value;
      properties[property] = {
        ...base,
        value,
        level,
        label: scale[level],
        max: scale.length - 1,
        confidence: round(answer.confidence),
        probabilities: Object.fromEntries(
          Object.entries(isPlainObject(answer.probabilities) ? answer.probabilities : {})
            .map(([key, probability]) => [key, round(probability)]),
        ),
        scale,
      };
    }
  }

  return { result, properties };
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

/** Calls Jev, retrying rate limits and overload with short backoff. */
export const askJev = async (plan, env, fetchImpl = (...args) => fetch(...args)) => {
  if (!env.TYPESAFE_API_KEY) throw new JevError('Jev is not configured on this server.', 503);
  const model = env.JEV_MODEL || DEFAULT_JEV_MODEL;
  const body = JSON.stringify({ model, state: plan.state, questions: plan.questions });

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

const buildPlannerMessages = (prompt, suppliedState, feedback) => {
  const parts = [`REQUEST:\n${prompt}`];
  if (suppliedState !== null) parts.push(`${SUPPLIED_STATE_NOTE}\n\nSTATE:\n${JSON.stringify(suppliedState, null, 2)}`);
  const messages = [
    { role: 'system', content: PLANNER_SYSTEM_PROMPT },
    { role: 'user', content: parts.join('\n\n') },
  ];
  if (feedback) {
    messages.push({ role: 'assistant', content: feedback.output });
    messages.push({ role: 'user', content: `That plan was invalid: ${feedback.error} Return the corrected JSON object only.` });
  }
  return messages;
};

const callPlanner = async (messages, env, fetchImpl, useJsonMode) => {
  if (!env.AI_BASE_URL || !env.AI_API_KEY) throw new JevError('The question planner is not configured on this server.', 503);
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
      ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  }, 'The question planner');

  if (!response.ok) {
    const message = await readUpstreamError(response);
    // Some OpenAI-compatible providers reject response_format; retry without it once.
    if (useJsonMode && response.status === 400) return callPlanner(messages, env, fetchImpl, false);
    throw new JevError(`The question planner failed (${response.status}).`, 502, { details: message });
  }

  const data = await readUpstreamJson(response, 'The question planner');
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new JevError('The question planner returned an empty reply.', 502);
  return { content, model: data.model ?? env.JEV_PLANNER_MODEL ?? env.AI_MODEL ?? null };
};

/** Plans questions for a prompt, retrying once with the validation error as feedback. */
export const planQuestions = async ({ prompt, state }, env, fetchImpl = (...args) => fetch(...args)) => {
  const request = clipText(prompt, LIMITS.promptChars + 1);
  if (!request) throw new JevError('Describe what you want to know.', 400);
  if (request.length > LIMITS.promptChars) throw new JevError(`Requests are limited to ${LIMITS.promptChars} characters.`, 400);
  const suppliedState = normalizeState(state);

  let feedback = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const reply = await callPlanner(buildPlannerMessages(request, suppliedState, feedback), env, fetchImpl, true);
    try {
      return { plan: normalizePlan(extractJsonObject(reply.content), suppliedState), plannerModel: reply.model };
    } catch (error) {
      // Malformed plans get one corrective retry; refusals and other failures surface as-is.
      if (attempt === 1 || !(error instanceof JevError) || error.code !== 'invalid_plan') throw error;
      feedback = { output: reply.content, error: error.message };
    }
  }
  throw new JevError('The question planner could not produce a valid plan.', 502);
};

/** Full pipeline for one request; `plan` skips the planner. */
export const runJevRequest = async (body, env, fetchImpl = (...args) => fetch(...args)) => {
  const timing = { plannerMs: null, jevMs: 0 };
  let plan;
  let plannerModel = null;

  if (body?.plan) {
    plan = normalizePlan(body.plan, normalizeState(body.state ?? null));
  } else {
    const started = Date.now();
    const planned = await planQuestions(body ?? {}, env, fetchImpl);
    timing.plannerMs = Date.now() - started;
    plan = planned.plan;
    plannerModel = planned.plannerModel;
  }

  const started = Date.now();
  const response = await askJev(plan, env, fetchImpl);
  timing.jevMs = Date.now() - started;
  const { result, properties } = formResult(plan, response.answers);

  return {
    model: response.model ?? env.JEV_MODEL ?? DEFAULT_JEV_MODEL,
    planner: plannerModel ? { model: plannerModel } : null,
    plan,
    result,
    properties,
    usage: response.usage ?? null,
    timing,
  };
};
