/**
 * Client for the Ask AI Worker endpoints (see jev.js at the repository root).
 *
 * `planJev` sends a question to the planner, which replies with a plan, a
 * request for more input, a direct answer (when Jev has nothing to judge the
 * planner, a language model itself, answers), or a refusal. `answerJev` sends a plan to Jev and
 * returns the best answer with per-question evidence. Two calls let the UI
 * show the plan while Jev is still answering.
 */

export type JevQuestionType = 'noul' | 'choice' | 'score';
export type JevState = string | Record<string, unknown> | unknown[];

export interface JevQuestion {
  type: JevQuestionType;
  instructions: string | Record<string, unknown> | unknown[];
  criteria?: Record<string, string | null> | Array<string | Record<string, unknown>>;
}

export interface JevPlan {
  summary: string;
  /** One line on why the primary question has its type. */
  rationale: string | null;
  state: JevState;
  /** Key of the question that answers the person directly; always first. */
  primary: string;
  labels: Record<string, string>;
  questions: Record<string, JevQuestion>;
}

export interface InputField {
  key: string;
  label: string;
  placeholder: string;
  multiline: boolean;
  required: boolean;
}

export interface InputRequest {
  message: string;
  fields: InputField[];
  /** Every field is optional, so the planner can answer without them. */
  optional: boolean;
}

export interface Refusal {
  message: string;
  suggestion: string | null;
}

/** The planner's own answer, for questions Jev cannot judge (writing, explaining, arithmetic). */
export interface DirectAnswer {
  /** Plain text; paragraphs are separated by blank lines. */
  text: string;
  /** Why Jev did not judge it. */
  note: string | null;
}

interface PlannerMeta {
  planner: { model: string } | null;
  timing: { plannerMs: number };
}

export type JevPlanResponse =
  | ({ kind: 'plan'; plan: JevPlan } & PlannerMeta)
  | ({ kind: 'needs_input' } & InputRequest & PlannerMeta)
  | ({ kind: 'answer' } & DirectAnswer & PlannerMeta)
  | ({ kind: 'refuse' } & Refusal & PlannerMeta);

interface BaseProperty {
  title: string;
  question: string;
  primary: boolean;
  /** 0-1; for yes/no questions this is |2p - 1|. */
  confidence: number;
}

export interface NoulProperty extends BaseProperty {
  type: 'noul';
  value: boolean;
  probability: number;
  criteria: { true?: string; false?: string } | null;
}

export interface ChoiceProperty extends BaseProperty {
  type: 'choice';
  value: string;
  probabilities: Record<string, number>;
  options: Record<string, string | null>;
  /** Display names that keep the casing of each option's description ("Donald Trump"). */
  optionLabels?: Record<string, string>;
  /** The primary choice is also asked with its options reversed. */
  orderCheck?: {
    consistent: boolean;
    listed: { choice: string; probability: number };
    reversed: { choice: string; probability: number };
  };
}

export interface ScoreProperty extends BaseProperty {
  type: 'score';
  value: number;
  level: number;
  levelText: string;
  max: number;
  probabilities: Record<string, number>;
  scale: string[];
}

export type JevProperty = NoulProperty | ChoiceProperty | ScoreProperty;

export type Certainty = 'high' | 'medium' | 'low';

export interface BestAnswer {
  key: string;
  title: string;
  question: string;
  type: JevQuestionType;
  value: boolean | string | number;
  /** The answer in plain words: "Yes", "Dwarf planet", or a score level. */
  answer: string;
  /** What the chosen option or yes/no means, when the plan described it. */
  detail: string | null;
  probability: number;
  confidence: number;
  certainty: Certainty;
}

export interface AnswerNote {
  tone: 'ok' | 'info' | 'warn';
  text: string;
}

export interface JevAnswer {
  kind: 'answer';
  model: string;
  planner: { model: string } | null;
  plan: JevPlan;
  best: BestAnswer | null;
  result: Record<string, boolean | string | number>;
  properties: Record<string, JevProperty>;
  notes: AnswerNote[];
  /** The exact request sent to Jev and its raw response. */
  jev: { request: Record<string, unknown>; response: Record<string, unknown> };
  usage: { input_tokens: number; output_tokens: number } | null;
  timing: { plannerMs: number | null; jevMs: number };
}

export const JEV_ENDPOINTS = {
  plan: '/api/jev/plan',
  answer: '/api/jev',
} as const;

export class JevRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'JevRequestError';
  }
}

const post = async <T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new JevRequestError('The network request failed. Check the connection and try again.', 0);
  }

  const data = await response.json().catch(() => null) as (T & { error?: string; code?: string }) | null;
  if (!response.ok || !data) {
    const message = data?.error ?? (response.status === 404
      ? 'Ask AI is not available on this server yet.'
      : `The request failed (${response.status}).`);
    throw new JevRequestError(message, response.status, data?.code);
  }
  return data;
};

export interface PlanRequest {
  question: string;
  /** Answers to a previous `needs_input` reply, keyed by field key. */
  inputs?: Record<string, string>;
  /** Plan from what is available instead of asking for more. */
  answerAnyway?: boolean;
}

export const planJev = (request: PlanRequest, signal?: AbortSignal) => (
  post<JevPlanResponse>(JEV_ENDPOINTS.plan, request, signal)
);

export const answerJev = (plan: JevPlan, signal?: AbortSignal) => (
  post<JevAnswer>(JEV_ENDPOINTS.answer, { plan }, signal)
);
