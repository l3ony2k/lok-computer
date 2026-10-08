/**
 * Client for the Ask AI Worker endpoints (see jev.js at the repository root).
 *
 * `planJev` asks the fast planner LLM to compile a request into typed Jev
 * questions; `runJev` sends a plan to Jev and returns the formed properties.
 * Two calls let the UI show the plan while Jev is still answering.
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
  state: JevState;
  questions: Record<string, JevQuestion>;
}

interface BaseProperty {
  question: string;
}

export interface NoulProperty extends BaseProperty {
  type: 'noul';
  value: boolean;
  probability: number;
}

export interface ChoiceProperty extends BaseProperty {
  type: 'choice';
  value: string;
  confidence: number;
  probabilities: Record<string, number>;
  options: Record<string, string | null>;
}

export interface ScoreProperty extends BaseProperty {
  type: 'score';
  value: number;
  level: number;
  label: string;
  max: number;
  confidence: number;
  probabilities: Record<string, number>;
  scale: string[];
}

export type JevProperty = NoulProperty | ChoiceProperty | ScoreProperty;

export interface JevAnswer {
  model: string;
  planner: { model: string } | null;
  plan: JevPlan;
  result: Record<string, boolean | string | number>;
  properties: Record<string, JevProperty>;
  usage: { input_tokens: number; output_tokens: number } | null;
  timing: { plannerMs: number | null; jevMs: number };
}

export interface JevPlanResponse {
  plan: JevPlan;
  planner: { model: string } | null;
  timing: { plannerMs: number };
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

/** Content typed as JSON is sent as structured state; anything else is text. */
export const parseStateInput = (input: string): JevState | undefined => {
  const text = input.trim();
  if (!text) return undefined;
  if (/^[[{]/.test(text)) {
    try {
      return JSON.parse(text) as JevState;
    } catch {
      return text;
    }
  }
  return text;
};

export const planJev = (prompt: string, state: JevState | undefined, signal?: AbortSignal) => (
  post<JevPlanResponse>(JEV_ENDPOINTS.plan, { prompt, ...(state === undefined ? {} : { state }) }, signal)
);

export const answerJev = (plan: JevPlan, signal?: AbortSignal) => (
  post<JevAnswer>(JEV_ENDPOINTS.answer, { plan }, signal)
);
