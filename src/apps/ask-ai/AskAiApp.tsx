import React, { useCallback, useEffect, useRef, useState } from 'react';
import { scrollIntoViewWithin } from '@/lib/utils';
import { ArrowRight, Copy, Pencil, Play, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';
import { TypoText } from './TypoText';
import {
  JevRequestError,
  answerJev,
  planJev,
  type ChoiceProperty,
  type DirectAnswer,
  type InputRequest,
  type JevAnswer,
  type JevPlan,
  type JevProperty,
  type NoulProperty,
  type Refusal,
  type ScoreProperty,
} from './jevClient';
import './ask-ai.css';

type RunStatus = 'planning' | 'needs_input' | 'answered' | 'refused' | 'asking' | 'done' | 'error';

interface AskRun {
  id: string;
  question: string;
  createdAt: number;
  status: RunStatus;
  /** Answers to the planner's follow-up fields. */
  inputs?: Record<string, string>;
  request?: InputRequest;
  /** The planner answered itself: nothing for Jev to judge. */
  direct?: DirectAnswer;
  refusal?: Refusal;
  plan?: JevPlan;
  plannerModel?: string;
  plannerMs?: number;
  answer?: JevAnswer;
  error?: string;
  /** The plan was edited by hand, so the planner did not run. */
  edited?: boolean;
}

interface AskAiState {
  runs: AskRun[];
}

const STORAGE_KEY = 'app:ask-ai';
const MAX_RUNS = 20;
const COMPOSER_MAX_HEIGHT = 120;

const EXAMPLES = [
  'Is Sisyphus happy?',
  'Is an iPad a computer?',
  'Tabs or spaces?',
  'Vim or Emacs?',
  'Is a hot dog a sandwich?',
];

const HELP_TEXT = 'This is a thinking machine. It reads your question, works out what kind of answer it needs, '
  + 'and asks Jev, a model that answers with probabilities instead of prose. You get the best answer and how sure it is. '
  + 'When there is nothing to judge (a poem, a reading, a sum), the planner answers in prose itself. '
  + 'Powered by Jev and GPT.';

const STATUS_TEXT: Record<RunStatus, string> = {
  planning: 'Planning',
  needs_input: 'More detail needed',
  answered: 'Answered by the planner',
  refused: 'Jev cannot answer this',
  asking: 'Asking Jev',
  done: 'Answered',
  error: 'Failed',
};

const createRunId = () => `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeRun = (stored: unknown): AskRun | null => {
  if (!isRecord(stored) || typeof stored.id !== 'string') return null;
  // Runs saved before the question-first rewrite used `prompt`.
  const question = typeof stored.question === 'string' ? stored.question : stored.prompt;
  if (typeof question !== 'string') return null;
  const run = { ...stored, question } as unknown as AskRun;
  if (run.status === 'planning' || run.status === 'asking') {
    return { ...run, status: 'error', error: 'Interrupted before Jev answered.' };
  }
  if (run.answer && !isRecord(run.answer.best)) {
    return { ...run, status: 'error', answer: undefined, plan: undefined, error: 'Answered by an earlier version of Ask AI.' };
  }
  return run;
};

const normalizeState = (stored: unknown, fallback: AskAiState): AskAiState => {
  if (!isRecord(stored) || !Array.isArray(stored.runs)) return fallback;
  return {
    runs: stored.runs.map(normalizeRun).filter((run): run is AskRun => run !== null).slice(-MAX_RUNS),
  };
};

const describeError = (error: unknown) => {
  if (error instanceof JevRequestError) return error.message;
  if (error instanceof Error && error.name === 'AbortError') return 'Cancelled.';
  return 'Something went wrong. Try again.';
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const humanize = (key: string) => {
  const text = key.replace(/_+/g, ' ').trim();
  return text ? text[0].toUpperCase() + text.slice(1) : key;
};
const optionName = (property: ChoiceProperty, option: string) => property.optionLabels?.[option] ?? humanize(option);
const TYPE_LABEL = { noul: 'yes/no', choice: 'choice', score: 'score' } as const;
const CERTAINTY_LABEL = { high: 'High confidence', medium: 'Some uncertainty', low: 'Unsure' } as const;

const copyText = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied.`);
  } catch {
    toast.error('The clipboard is not available.');
  }
};

const Meter = ({ value, label, emphasis = false }: { value: number; label: string; emphasis?: boolean }) => (
  <span
    className="ask-ai-meter"
    data-emphasis={emphasis || undefined}
    role="meter"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(value * 100)}
    aria-label={label}
  >
    <span style={{ width: percent(Math.max(0, Math.min(1, value))) }} />
  </span>
);

const NoulView = ({ property }: { property: NoulProperty }) => (
  <div className="ask-ai-noul">
    <div className="ask-ai-noul-scale" aria-hidden="true">
      <span>no</span>
      <span className="ask-ai-noul-track">
        <span className="ask-ai-noul-fill" style={{ width: percent(property.probability) }} />
        <span className="ask-ai-noul-midpoint" />
      </span>
      <span>yes</span>
    </div>
    <small>p(yes) = {property.probability.toFixed(2)}</small>
  </div>
);

const ChoiceView = ({ property }: { property: ChoiceProperty }) => (
  <ol className="ask-ai-options">
    {Object.entries(property.probabilities).map(([option, probability]) => (
      <li key={option} data-chosen={option === property.value || undefined} title={property.options?.[option] ?? undefined}>
        <span className="ask-ai-option-name">{optionName(property, option)}</span>
        <Meter value={probability} label={`${optionName(property, option)} probability`} emphasis={option === property.value} />
        <span className="ask-ai-option-value">{percent(probability)}</span>
      </li>
    ))}
  </ol>
);

const ScoreView = ({ property }: { property: ScoreProperty }) => {
  // Levels render as equal cells, so map the score onto cell centers.
  const position = (property.value + 0.5) / (property.max + 1);
  return (
    <div className="ask-ai-score">
      <div className="ask-ai-score-track" aria-hidden="true">
        {property.scale.map((level, index) => (
          <span
            key={`${index}-${level}`}
            className="ask-ai-score-level"
            data-active={index === property.level || undefined}
            style={{ '--level-probability': property.probabilities[String(index)] ?? 0 } as React.CSSProperties}
            title={`${level}: ${percent(property.probabilities[String(index)] ?? 0)}`}
          />
        ))}
        <span className="ask-ai-score-marker" style={{ left: percent(position) }} />
      </div>
      <div className="ask-ai-score-labels" aria-hidden="true">
        <span>{property.scale[0]}</span>
        <span>{property.scale[property.scale.length - 1]}</span>
      </div>
      <small className="ask-ai-score-readout">{property.value.toFixed(2)} of {property.max}</small>
    </div>
  );
};

const formatValue = (property: JevProperty) => {
  if (property.type === 'noul') return property.value ? 'Yes' : 'No';
  if (property.type === 'choice') return optionName(property, property.value);
  return property.levelText;
};

/** Questions refer to state fields in backticks (`subject`); show those as field chips. */
const QuestionText = ({ text }: { text: string }) => (
  <p className="ask-ai-question">
    {text.split(/`([^`\n]+)`/).map((part, index) => (
      index % 2 ? <code key={index} className="ask-ai-field-ref">{part}</code> : part
    ))}
  </p>
);

const PropertyCard = ({ property }: { property: JevProperty }) => (
  <section className="ask-ai-property" data-type={property.type}>
    <header>
      <span className="ask-ai-property-title">{property.title}</span>
      {property.primary && <span className="ask-ai-type">answer</span>}
      <span className="ask-ai-type">{TYPE_LABEL[property.type]}</span>
      <span className="ask-ai-confidence" title="Confidence: how decisive the probabilities are, from 0 to 1">
        conf {property.confidence.toFixed(2)}
      </span>
    </header>
    <QuestionText text={property.question} />
    <div className="ask-ai-value">
      <strong>{formatValue(property)}</strong>
    </div>
    {property.type === 'noul' && <NoulView property={property} />}
    {property.type === 'choice' && <ChoiceView property={property} />}
    {property.type === 'score' && <ScoreView property={property} />}
  </section>
);

const BestAnswerCard = ({ answer }: { answer: JevAnswer }) => {
  const best = answer.best;
  if (!best) {
    return <p className="ask-ai-summary">Jev returned no answer for the main question. See the analytics below.</p>;
  }
  return (
    <section className="ask-ai-property ask-ai-best" data-certainty={best.certainty} aria-label="Best answer">
      <header>
        <span className="ask-ai-property-title">{best.title}</span>
        <span className="ask-ai-type">{TYPE_LABEL[best.type]}</span>
      </header>
      <div className="ask-ai-best-answer">
        <strong>{best.answer}</strong>
        {best.detail && <span>{best.detail}</span>}
      </div>
      <div className="ask-ai-best-stats">
        <span className="ask-ai-best-probability">
          <Meter value={best.probability} label="Probability of this answer" emphasis />
          <span>{percent(best.probability)} likely</span>
        </span>
        <span className="ask-ai-certainty" data-certainty={best.certainty}>
          {CERTAINTY_LABEL[best.certainty]} · {best.confidence.toFixed(2)}
        </span>
      </div>
    </section>
  );
};

/**
 * The planner's own answer. Jev had nothing to judge (a reading, a poem, a
 * sum), so there is no probability and no analytics: the text and a note on
 * why it came from the planner.
 */
const DirectAnswerCard = ({ answer, plannerModel, plannerMs }: { answer: DirectAnswer; plannerModel?: string; plannerMs?: number }) => (
  <section className="ask-ai-property ask-ai-best ask-ai-direct" aria-label="Answer">
    <header>
      <span className="ask-ai-property-title">Answer</span>
      <span className="ask-ai-type">Planner</span>
    </header>
    <div className="ask-ai-direct-text">
      {answer.text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>{paragraph.split('\n').map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>{lineIndex > 0 && <br />}{line}</React.Fragment>
        ))}</p>
      ))}
    </div>
    <footer className="ask-ai-meta">
      {answer.note && <span className="ask-ai-direct-note">{answer.note}</span>}
      {plannerModel && <span>planner {plannerModel}</span>}
      {plannerMs !== undefined && <span>{plannerMs}ms</span>}
    </footer>
  </section>
);

const Notes = ({ answer }: { answer: JevAnswer }) => (
  answer.notes.length ? (
    <ul className="ask-ai-notes">
      {answer.notes.map((note) => (
        <li key={note.text} data-tone={note.tone}>{note.text}</li>
      ))}
    </ul>
  ) : null
);

const RawJson = ({ label, value }: { label: string; value: unknown }) => {
  const text = JSON.stringify(value, null, 2);
  return (
    <details className="ask-ai-json">
      <summary>
        <span>{label}</span>
        <RetroButton
          size="sm"
          className="gap-1"
          onClick={(event) => {
            event.preventDefault();
            void copyText(text, label);
          }}
        >
          <Copy className="h-3 w-3" /> Copy
        </RetroButton>
      </summary>
      <pre>{text}</pre>
    </details>
  );
};

const editablePlan = (plan: JevPlan) => JSON.stringify({
  summary: plan.summary,
  rationale: plan.rationale,
  state: plan.state,
  primary: plan.primary,
  labels: plan.labels,
  questions: plan.questions,
}, null, 2);

interface FollowUpProps {
  run: AskRun;
  request: InputRequest;
  disabled: boolean;
  /** Focus the first field, unless the person has moved to another window. */
  focusFirst: boolean;
  onSubmit: (inputs: Record<string, string>) => void;
  onAnswerAnyway: () => void;
}

const FollowUpForm = ({ run, request, disabled, focusFirst, onSubmit, onAnswerAnyway }: FollowUpProps) => {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...run.inputs }));
  const formRef = useRef<HTMLFormElement>(null);
  const missing = request.fields.some((field) => field.required && !values[field.key]?.trim());

  useEffect(() => {
    const form = formRef.current;
    if (!focusFirst || !form) return;
    const active = document.activeElement;
    const surface = form.closest('[data-window-surface-id]');
    if (!active || active === document.body || surface?.contains(active)) {
      form.querySelector<HTMLElement>('input, textarea')?.focus({ preventScroll: true });
    }
  }, [focusFirst]);

  return (
    <form
      ref={formRef}
      className="ask-ai-intro ask-ai-followup"
      onSubmit={(event) => {
        event.preventDefault();
        if (!missing && !disabled) onSubmit(values);
      }}
    >
      <p>{request.message}</p>
      {request.fields.map((field) => {
        const id = `${run.id}-${field.key}`;
        const common = {
          id,
          className: 'search-input',
          value: values[field.key] ?? '',
          placeholder: field.placeholder,
          required: field.required,
          maxLength: 8000,
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => (
            setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
          ),
        };
        return (
          <label key={field.key} htmlFor={id} className="ask-ai-field">
            <span>{field.label}{!field.required && <small> (optional)</small>}</span>
            {field.multiline ? <textarea {...common} rows={5} /> : <input type="text" {...common} />}
          </label>
        );
      })}
      <div className="ask-ai-editor-actions">
        {request.optional && (
          <RetroButton type="button" size="sm" onClick={onAnswerAnyway} disabled={disabled}>
            Answer anyway
          </RetroButton>
        )}
        <RetroButton type="submit" size="sm" variant="primary" className="gap-1" disabled={disabled || missing}>
          Continue <ArrowRight className="h-3 w-3" />
        </RetroButton>
      </div>
    </form>
  );
};

export interface AskAiAppProps {
  /** A question handed over by another app (Chance's tarot reading); each id is submitted once. */
  ask?: { id: string; question: string };
  onPropsChange?: (props: Record<string, unknown>) => void;
}

export const AskAiApp: React.FC<AskAiAppProps> = ({ ask: handoff, onPropsChange }) => {
  const [state, setState, loadingState] = usePersistedState<AskAiState>({
    key: STORAGE_KEY,
    defaultValue: { runs: [] },
    debounceMs: 200,
    normalize: normalizeState,
  });
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [latestRunId, setLatestRunId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ runId: string; text: string; error?: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Return focus to the prompt only if the user hasn't moved on to another window meanwhile.
  const refocusPrompt = useCallback(() => {
    const input = promptRef.current;
    if (!input) return;
    const active = document.activeElement;
    const surface = input.closest('[data-window-surface-id]');
    if (!active || active === document.body || surface?.contains(active)) input.focus({ preventScroll: true });
  }, []);

  const runs = state.runs;
  const latestRun = runs[runs.length - 1];
  // One concise live announcement; errors use role="alert" on their own.
  const announcement = !latestRun || latestRun.status === 'error' ? ''
    : latestRun.status === 'done' && latestRun.answer?.best
      ? `Answer: ${latestRun.answer.best.answer}, ${percent(latestRun.answer.best.probability)} likely`
      : STATUS_TEXT[latestRun.status];

  const updateRun = useCallback((id: string, patch: Partial<AskRun>) => {
    setState((prev) => ({ runs: prev.runs.map((run) => (run.id === id ? { ...run, ...patch } : run)) }));
  }, [setState]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Follow progress at the end; once a run settles, show it from the question down.
  const latestId = latestRun?.id;
  const latestStatus = latestRun?.status;
  useEffect(() => {
    if (!latestId) return;
    const settled = latestStatus !== 'planning' && latestStatus !== 'asking';
    const node = settled
      ? transcriptRef.current?.querySelector(`[data-run-id="${latestId}"]`)
      : transcriptEndRef.current;
    scrollIntoViewWithin(node as HTMLElement | null, { block: settled ? 'start' : 'end' });
  }, [latestId, latestStatus]);

  // Grow the composer with its content; it scrolls only past the cap. The
  // border is measured rather than assumed: skins draw fields with no border
  // (a bevel instead), and a fixed allowance made one line taller than the
  // Ask button beside it.
  useEffect(() => {
    const input = promptRef.current;
    if (!input) return;
    input.style.height = 'auto';
    const border = input.offsetHeight - input.clientHeight;
    const needed = input.scrollHeight + border;
    input.style.height = `${Math.min(needed, COMPOSER_MAX_HEIGHT)}px`;
    input.style.overflowY = needed > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden';
  }, [question]);

  /**
   * Runs one run forward: plan (unless a plan is supplied), then ask Jev.
   * `append` adds a new run; otherwise the run with the same id is replaced,
   * as when a follow-up form is answered.
   */
  const execute = useCallback(async (
    run: AskRun,
    { append, plan: presetPlan, answerAnyway = false }: { append: boolean; plan?: JevPlan; answerAnyway?: boolean },
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setLatestRunId(run.id);
    setState((prev) => ({
      runs: append
        ? [...prev.runs, run].slice(-MAX_RUNS)
        : prev.runs.map((existing) => (existing.id === run.id ? run : existing)),
    }));

    // A follow-up form takes focus itself, so the prompt must not reclaim it.
    let followUp = false;
    try {
      let plan = presetPlan;
      if (!plan) {
        const outcome = await planJev({ question: run.question, inputs: run.inputs, answerAnyway }, controller.signal);
        const meta = { plannerModel: outcome.planner?.model, plannerMs: outcome.timing.plannerMs };
        if (outcome.kind === 'needs_input') {
          followUp = true;
          updateRun(run.id, {
            ...meta,
            status: 'needs_input',
            request: { message: outcome.message, fields: outcome.fields, optional: outcome.optional },
          });
          return;
        }
        if (outcome.kind === 'answer') {
          updateRun(run.id, { ...meta, status: 'answered', direct: { text: outcome.text, note: outcome.note } });
          return;
        }
        if (outcome.kind === 'refuse') {
          updateRun(run.id, { ...meta, status: 'refused', refusal: { message: outcome.message, suggestion: outcome.suggestion } });
          return;
        }
        plan = outcome.plan;
        updateRun(run.id, { ...meta, plan, status: 'asking' });
      }
      const answer = await answerJev(plan, controller.signal);
      updateRun(run.id, { answer, plan: answer.plan, status: 'done' });
    } catch (error) {
      if (controller.signal.aborted) return;
      updateRun(run.id, { status: 'error', error: describeError(error) });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
      }
      if (!followUp) setTimeout(refocusPrompt, 0);
    }
  }, [refocusPrompt, setState, updateRun]);

  const ask = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void execute({ id: createRunId(), question: trimmed, createdAt: Date.now(), status: 'planning' }, { append: true });
    setQuestion('');
  }, [busy, execute]);

  // A handed-over question is asked once per id, then dropped from the window
  // props so a restored session does not ask it again. It waits for the saved
  // runs to load (a run appended before that would be overwritten), and while
  // a run is busy the question waits in the composer instead.
  const handledHandoff = useRef<string | null>(null);
  useEffect(() => {
    if (!handoff || loadingState || handledHandoff.current === handoff.id) return;
    handledHandoff.current = handoff.id;
    if (busy) setQuestion(handoff.question);
    else ask(handoff.question);
    onPropsChange?.({ ask: undefined });
  }, [ask, busy, handoff, loadingState, onPropsChange]);

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    ask(question);
  };

  const fillQuestion = (text: string) => {
    setQuestion(text);
    setTimeout(() => promptRef.current?.focus({ preventScroll: true }), 0);
  };

  const continueRun = (run: AskRun, inputs: Record<string, string>, answerAnyway = false) => {
    void execute({
      ...run,
      inputs,
      status: 'planning',
      request: answerAnyway ? undefined : run.request,
      error: undefined,
    }, { append: false, answerAnyway });
  };

  const retry = (run: AskRun) => {
    void execute({
      id: createRunId(),
      question: run.question,
      inputs: run.inputs,
      createdAt: Date.now(),
      status: run.edited && run.plan ? 'asking' : 'planning',
      plan: run.edited ? run.plan : undefined,
      edited: run.edited,
    }, { append: true, plan: run.edited ? run.plan : undefined });
  };

  const runEditedPlan = () => {
    if (!editing) return;
    const source = runs.find((run) => run.id === editing.runId);
    let plan: JevPlan;
    try {
      plan = JSON.parse(editing.text) as JevPlan;
      if (!plan || typeof plan !== 'object' || !plan.questions) throw new Error('missing questions');
    } catch {
      setEditing({ ...editing, error: 'The plan must be valid JSON with "state" and "questions".' });
      return;
    }
    setEditing(null);
    void execute({
      id: createRunId(),
      question: source?.question ?? 'Edited plan',
      inputs: source?.inputs,
      createdAt: Date.now(),
      status: 'asking',
      plan,
      edited: true,
    }, { append: true, plan });
  };

  const clearRuns = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    abortRef.current?.abort();
    setState({ runs: [] });
    setConfirmClear(false);
    setEditing(null);
  };

  return (
    <WindowLayout
      className="ask-ai-window"
      hasPadding={false}
      toolbar={(
        <div className="app-toolbar-row ask-ai-toolbar">
          <RetroButton
            size="sm"
            className="ask-ai-help-button"
            onClick={() => setHelpOpen((open) => !open)}
            aria-expanded={helpOpen}
            aria-controls="ask-ai-help"
            aria-label="How this works"
            title="How this works"
          >
            ?
          </RetroButton>
          <span className="ask-ai-tagline">Robots make mistakes. Take the answer as a joke.</span>
          <RetroButton
            size="sm"
            className="gap-1"
            onClick={clearRuns}
            onBlur={() => setTimeout(() => setConfirmClear(false), 150)}
            disabled={!runs.length}
            title={confirmClear ? 'Click again to confirm' : 'Clear history'}
          >
            <Trash2 className="h-3.5 w-3.5" /> {confirmClear ? 'Confirm' : 'Clear'}
          </RetroButton>
        </div>
      )}
      footer={(
        <form className="ask-ai-composer" onSubmit={submit}>
          <div className="app-footer-row ask-ai-composer-row">
            <div className="app-joined-control flex-1">
              <textarea
                ref={promptRef}
                className="search-input ask-ai-question-input flex-1"
                value={question}
                rows={1}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder={busy ? 'Waiting for Jev…' : 'Type your question here…'}
                aria-label="Question"
                maxLength={2000}
              />
              <RetroButton type="submit" size="sm" variant="primary" disabled={busy || !question.trim()}>
                Ask
              </RetroButton>
            </div>
          </div>
        </form>
      )}
    >
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div ref={transcriptRef} className="ask-ai-transcript">
        {helpOpen && (
          <section id="ask-ai-help" className="ask-ai-help" role="note">
            <p>
              {HELP_TEXT}{' '}
              <a href="https://docs.typesafe.ai/introduction" target="_blank" rel="noopener noreferrer">About Jev</a>
            </p>
          </section>
        )}

        {runs.length === 0 && (
          <div className="ask-ai-starters" aria-label="Example questions">
            {EXAMPLES.map((example) => (
              <RetroButton key={example} size="sm" onClick={() => fillQuestion(example)}>
                {example}
              </RetroButton>
            ))}
          </div>
        )}

        {runs.map((run) => {
          const isLatest = run.id === latestRunId;
          const inputs = Object.entries(run.inputs ?? {});
          return (
            <article key={run.id} className="ask-ai-run" data-run-id={run.id} data-status={run.status}>
              <div className="ask-ai-request">
                <span aria-hidden="true">❯</span>
                <div>
                  <p>{run.question}{run.edited && <span className="ask-ai-tag">edited plan</span>}</p>
                  {inputs.length > 0 && run.status !== 'needs_input' && (
                    <details className="ask-ai-content">
                      <summary>Your details · {inputs.length}</summary>
                      <pre>{inputs.map(([key, value]) => `${humanize(key)}:\n${value}`).join('\n\n')}</pre>
                    </details>
                  )}
                </div>
              </div>

              {run.plan && (
                <p className="ask-ai-summary">
                  <TypoText text={run.plan.summary} isNew={isLatest && run.status !== 'done'} speed={18} jitter={8} typoChance={3} />
                </p>
              )}

              {(run.status === 'planning' || run.status === 'asking') && (
                <div className="ask-ai-progress" aria-hidden="true">
                  <span data-done={run.status === 'asking' || undefined}>
                    {run.edited ? 'plan supplied' : run.inputs ? 'planning with your details' : 'reading the question'}
                  </span>
                  <span data-active={run.status === 'asking' || undefined}>asking jev</span>
                  <span className="ask-ai-cursor">_</span>
                </div>
              )}

              {run.status === 'needs_input' && run.request && (
                <FollowUpForm
                  run={run}
                  request={run.request}
                  disabled={busy}
                  focusFirst={isLatest}
                  onSubmit={(values) => continueRun(run, values)}
                  onAnswerAnyway={() => continueRun(run, run.inputs ?? {}, true)}
                />
              )}

              {run.status === 'answered' && run.direct && (
                <DirectAnswerCard answer={run.direct} plannerModel={run.plannerModel} plannerMs={run.plannerMs} />
              )}

              {run.status === 'refused' && run.refusal && (
                <div className="ask-ai-intro ask-ai-refusal">
                  <p>{run.refusal.message}</p>
                  {run.refusal.suggestion && (
                    <RetroButton size="sm" className="ask-ai-suggestion" onClick={() => fillQuestion(run.refusal?.suggestion ?? '')}>
                      <span>Try instead</span>
                      {run.refusal.suggestion}
                    </RetroButton>
                  )}
                </div>
              )}

              {run.status === 'error' && (
                <div className="ask-ai-error" role="alert">
                  <span>{run.error ?? 'The request failed.'}</span>
                  <RetroButton size="sm" className="gap-1" onClick={() => retry(run)} disabled={busy}>
                    <RotateCcw className="h-3.5 w-3.5" /> Retry
                  </RetroButton>
                </div>
              )}

              {run.answer && (
                <>
                  <BestAnswerCard answer={run.answer} />
                  <Notes answer={run.answer} />
                  <details className="ask-ai-analytics" open={isLatest}>
                    <summary>Analytics</summary>
                    <div className="ask-ai-analytics-body">
                      {run.answer.plan.rationale && (
                        <p className="ask-ai-rationale">
                          <span className="ask-ai-type">{TYPE_LABEL[run.answer.plan.questions[run.answer.plan.primary]?.type ?? 'noul']}</span>
                          {run.answer.plan.rationale}
                        </p>
                      )}
                      <div className="ask-ai-properties">
                        {Object.entries(run.answer.properties).map(([key, property]) => (
                          <PropertyCard key={key} property={property} />
                        ))}
                      </div>
                      <RawJson label="Jev request" value={run.answer.jev.request} />
                      <RawJson label="Jev response" value={run.answer.jev.response} />
                      <footer className="ask-ai-meta">
                        <span>{run.answer.model}</span>
                        {run.plannerModel && <span>planner {run.plannerModel}</span>}
                        {run.plannerMs !== undefined && <span>plan {run.plannerMs}ms</span>}
                        <span>jev {run.answer.timing.jevMs}ms</span>
                        {run.answer.usage && <span>{run.answer.usage.input_tokens} tokens in · {run.answer.usage.output_tokens} out</span>}
                        <span className="ask-ai-meta-actions">
                          <RetroButton
                            size="sm"
                            className="gap-1"
                            onClick={() => void copyText(JSON.stringify(run.answer?.result, null, 2), 'Result JSON')}
                          >
                            <Copy className="h-3 w-3" /> Result
                          </RetroButton>
                          <RetroButton
                            size="sm"
                            className="gap-1"
                            onClick={() => run.answer && setEditing({ runId: run.id, text: editablePlan(run.answer.plan) })}
                            disabled={busy}
                          >
                            <Pencil className="h-3 w-3" /> Edit plan
                          </RetroButton>
                        </span>
                      </footer>
                    </div>
                  </details>
                </>
              )}

              {editing?.runId === run.id && (
                <div className="ask-ai-editor">
                  <label htmlFor={`plan-${run.id}`}>Plan JSON · "primary" names the question that answers you; questions go to Jev as written</label>
                  <textarea
                    id={`plan-${run.id}`}
                    className="search-input"
                    value={editing.text}
                    onChange={(event) => setEditing({ ...editing, text: event.target.value, error: undefined })}
                    spellCheck={false}
                    rows={12}
                  />
                  {editing.error && <p className="ask-ai-editor-error" role="alert">{editing.error}</p>}
                  <div className="ask-ai-editor-actions">
                    <RetroButton size="sm" onClick={() => setEditing(null)}>Cancel</RetroButton>
                    <RetroButton size="sm" variant="primary" className="gap-1" onClick={runEditedPlan} disabled={busy}>
                      <Play className="h-3 w-3" /> Run plan
                    </RetroButton>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        <div ref={transcriptEndRef} />
      </div>
    </WindowLayout>
  );
};

export default AskAiApp;
