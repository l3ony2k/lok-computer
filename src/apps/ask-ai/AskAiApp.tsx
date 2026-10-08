import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, FileText, Pencil, Play, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';
import { TypoText } from './TypoText';
import {
  JevRequestError,
  answerJev,
  parseStateInput,
  planJev,
  type ChoiceProperty,
  type JevAnswer,
  type JevPlan,
  type JevProperty,
  type NoulProperty,
  type ScoreProperty,
} from './jevClient';
import './ask-ai.css';

type RunStatus = 'planning' | 'asking' | 'done' | 'error';

interface AskRun {
  id: string;
  prompt: string;
  /** Raw content as typed, kept for display and re-runs. */
  content?: string;
  createdAt: number;
  status: RunStatus;
  plan?: JevPlan;
  plannerModel?: string;
  plannerMs?: number;
  answer?: JevAnswer;
  error?: string;
  /** `refused` means the planner found nothing to judge; retrying cannot help. */
  errorCode?: string;
  /** The plan was edited by hand, so the planner did not run. */
  edited?: boolean;
}

interface AskAiState {
  runs: AskRun[];
}

const STORAGE_KEY = 'app:ask-ai';
const MAX_RUNS = 20;

const EXAMPLES = [
  {
    label: 'Triage a ticket',
    prompt: 'Is it urgent, which team should own it, and how upset is the customer?',
    content: 'Payouts have failed for three days and my customers are furious. Please fix this today.',
  },
  {
    label: 'Read a review',
    prompt: 'Overall sentiment, does it complain about the battery, and would they recommend it?',
    content: 'The battery died after two days, but honestly the screen is gorgeous and I still use it every night.',
  },
  {
    label: 'Spot clickbait',
    prompt: 'Is this headline clickbait, and what topic is it about?',
    content: "You won't believe what this cat did when its owner left for work",
  },
  {
    label: 'Check a fact',
    prompt: 'Is Pluto officially classified as a planet today?',
    content: '',
  },
];

const createRunId = () => `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const normalizeState = (stored: unknown, fallback: AskAiState): AskAiState => {
  if (!stored || typeof stored !== 'object' || !Array.isArray((stored as AskAiState).runs)) return fallback;
  return {
    runs: (stored as AskAiState).runs
      .filter((run) => run && typeof run.id === 'string' && typeof run.prompt === 'string')
      .slice(-MAX_RUNS)
      .map((run) => (run.status === 'planning' || run.status === 'asking'
        ? { ...run, status: 'error' as const, error: 'Interrupted before Jev answered.' }
        : run)),
  };
};

const describeError = (error: unknown) => {
  if (error instanceof JevRequestError) return error.message;
  if (error instanceof Error && error.name === 'AbortError') return 'Cancelled.';
  return 'Something went wrong. Try again.';
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const humanize = (key: string) => key.replace(/_/g, ' ');

const Meter = ({ value, label, emphasis = false }: { value: number; label?: string; emphasis?: boolean }) => (
  <span className="ask-ai-meter" data-emphasis={emphasis || undefined} role="meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={value} aria-label={label}>
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
        <span className="ask-ai-option-name">{humanize(option)}</span>
        <Meter value={probability} label={`${option} probability`} emphasis={option === property.value} />
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
    </div>
  );
};

const formatValue = (property: JevProperty) => {
  if (property.type === 'noul') return property.value ? 'yes' : 'no';
  if (property.type === 'choice') return humanize(property.value);
  return `${property.value.toFixed(2)} / ${property.max}`;
};

const PropertyCard = ({ name, property }: { name: string; property: JevProperty }) => (
  <section className="ask-ai-property" data-type={property.type}>
    <header>
      <code>{name}</code>
      <span className="ask-ai-type">{property.type === 'noul' ? 'yes/no' : property.type}</span>
      {'confidence' in property && (
        <span className="ask-ai-confidence" title="How peaked the probability distribution is">
          conf {property.confidence.toFixed(2)}
        </span>
      )}
    </header>
    <p className="ask-ai-question">{property.question}</p>
    <div className="ask-ai-value">
      <strong>{formatValue(property)}</strong>
      {property.type === 'score' && <span>{property.label}</span>}
    </div>
    {property.type === 'noul' && <NoulView property={property} />}
    {property.type === 'choice' && <ChoiceView property={property} />}
    {property.type === 'score' && <ScoreView property={property} />}
  </section>
);

const copyText = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied.`);
  } catch {
    toast.error('The clipboard is not available.');
  }
};

export const AskAiApp: React.FC = () => {
  const [state, setState] = usePersistedState<AskAiState>({
    key: STORAGE_KEY,
    defaultValue: { runs: [] },
    debounceMs: 200,
    normalize: normalizeState,
  });
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState('');
  const [showContent, setShowContent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [latestRunId, setLatestRunId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ runId: string; text: string; error?: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLInputElement>(null);

  // Return focus to the prompt only if the user hasn't moved on to another window meanwhile.
  const refocusPrompt = useCallback(() => {
    const input = promptRef.current;
    if (!input) return;
    const active = document.activeElement;
    const surface = input.closest('[data-window-surface-id]');
    if (!active || active === document.body || surface?.contains(active)) input.focus();
  }, []);

  const runs = state.runs;
  const latestRun = runs[runs.length - 1];
  // One concise live announcement; errors use role="alert" on their own.
  const announcement = !latestRun ? ''
    : latestRun.status === 'planning' ? 'Planning questions'
      : latestRun.status === 'asking' ? 'Asking Jev'
        : latestRun.status === 'done' ? `Answered ${Object.keys(latestRun.answer?.properties ?? {}).length} properties`
          : '';

  const updateRun = useCallback((id: string, patch: Partial<AskRun>) => {
    setState((prev) => ({ runs: prev.runs.map((run) => (run.id === id ? { ...run, ...patch } : run)) }));
  }, [setState]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: 'end' });
  }, [runs]);

  const execute = useCallback(async (run: AskRun, presetPlan?: JevPlan) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setLatestRunId(run.id);
    setState((prev) => ({ runs: [...prev.runs, run].slice(-MAX_RUNS) }));

    try {
      let plan = presetPlan;
      if (!plan) {
        const planned = await planJev(run.prompt, parseStateInput(run.content ?? ''), controller.signal);
        plan = planned.plan;
        updateRun(run.id, {
          plan,
          plannerModel: planned.planner?.model,
          plannerMs: planned.timing.plannerMs,
          status: 'asking',
        });
      }
      const answer = await answerJev(plan, controller.signal);
      updateRun(run.id, { answer, plan: answer.plan, status: 'done' });
    } catch (error) {
      if (controller.signal.aborted) return;
      updateRun(run.id, {
        status: 'error',
        error: describeError(error),
        errorCode: error instanceof JevRequestError ? error.code : undefined,
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
      }
      setTimeout(refocusPrompt, 0);
    }
  }, [refocusPrompt, setState, updateRun]);

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = prompt.trim();
    if (!text || busy) return;
    void execute({
      id: createRunId(),
      prompt: text,
      content: showContent && content.trim() ? content.trim() : undefined,
      createdAt: Date.now(),
      status: 'planning',
    });
    setPrompt('');
  };

  const applyExample = (example: typeof EXAMPLES[number]) => {
    setPrompt(example.prompt);
    setContent(example.content);
    setShowContent(Boolean(example.content));
    setTimeout(() => promptRef.current?.focus(), 0);
  };

  const retry = (run: AskRun) => {
    void execute({
      ...run,
      id: createRunId(),
      status: run.edited && run.plan ? 'asking' : 'planning',
      error: undefined,
      errorCode: undefined,
      answer: undefined,
      createdAt: Date.now(),
    }, run.edited ? run.plan : undefined);
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
      prompt: source?.prompt ?? 'Edited plan',
      content: source?.content,
      createdAt: Date.now(),
      status: 'asking',
      plan,
      edited: true,
    }, plan);
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
          <span className="app-readout ask-ai-badge" title="Answers come from TypeSafe's Jev decision model">JEV</span>
          <span className="ask-ai-tagline">Typed answers with calibrated probabilities</span>
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
          {showContent && (
            <textarea
              className="search-input ask-ai-content-input"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Content to judge: paste text, or JSON with named fields"
              aria-label="Content to judge"
              rows={3}
              maxLength={20000}
            />
          )}
          <div className="app-footer-row ask-ai-composer-row">
            <RetroButton
              type="button"
              size="sm"
              className="gap-1"
              active={showContent}
              aria-pressed={showContent}
              onClick={() => setShowContent((value) => !value)}
              title="Attach content for Jev to judge"
            >
              <FileText className="h-3.5 w-3.5" /> Content
            </RetroButton>
            <div className="app-joined-control flex-1">
              <input
                ref={promptRef}
                type="text"
                className="search-input text-xs flex-1"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={busy ? 'Waiting for Jev…' : 'What do you want to know? e.g. is it urgent, which team owns it'}
                aria-label="Request"
                maxLength={2000}
              />
              <RetroButton type="submit" size="sm" variant="primary" disabled={busy || !prompt.trim()}>
                Ask
              </RetroButton>
            </div>
          </div>
        </form>
      )}
    >
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div className="ask-ai-transcript">
        {runs.length === 0 && (
          <section className="ask-ai-intro">
            <h2>Ask for judgments, get JSON back.</h2>
            <p>
              Describe the properties you want, optionally with content to judge. A fast language model turns
              the request into typed questions (yes/no, choice, or score), and{' '}
              <a href="https://docs.typesafe.ai/introduction" target="_blank" rel="noopener noreferrer">Jev</a>{' '}
              answers each one with calibrated probabilities. The result is a JSON object keyed by your properties.
            </p>
            <div className="ask-ai-examples">
              {EXAMPLES.map((example) => (
                <RetroButton key={example.label} size="sm" onClick={() => applyExample(example)} title={example.prompt}>
                  {example.label}
                </RetroButton>
              ))}
            </div>
          </section>
        )}

        {runs.map((run) => {
          const properties = run.answer?.properties ?? {};
          return (
            <article key={run.id} className="ask-ai-run" data-status={run.status}>
              <div className="ask-ai-request">
                <span aria-hidden="true">❯</span>
                <div>
                  <p>{run.prompt}{run.edited && <span className="ask-ai-tag">edited plan</span>}</p>
                  {run.content && (
                    <details className="ask-ai-content">
                      <summary>Content · {run.content.length} chars</summary>
                      <pre>{run.content}</pre>
                    </details>
                  )}
                </div>
              </div>

              {run.plan && (
                <p className="ask-ai-summary">
                  <TypoText text={run.plan.summary} isNew={run.id === latestRunId && run.status !== 'done'} speed={18} jitter={8} typoChance={3} />
                </p>
              )}

              {(run.status === 'planning' || run.status === 'asking') && (
                <div className="ask-ai-progress" aria-hidden="true">
                  <span data-done={run.status === 'asking' || undefined}>{run.edited ? 'plan supplied' : 'planning questions'}</span>
                  <span data-active={run.status === 'asking' || undefined}>asking jev</span>
                  <span className="ask-ai-cursor" aria-hidden="true">_</span>
                </div>
              )}

              {run.status === 'error' && (
                <div className="ask-ai-error" role="alert">
                  <span>{run.error ?? 'The request failed.'}</span>
                  {run.errorCode !== 'refused' && (
                    <RetroButton size="sm" className="gap-1" onClick={() => retry(run)} disabled={busy}>
                      <RotateCcw className="h-3.5 w-3.5" /> Retry
                    </RetroButton>
                  )}
                </div>
              )}

              {run.answer && (
                <>
                  <div className="ask-ai-properties">
                    {Object.entries(properties).map(([name, property]) => (
                      <PropertyCard key={name} name={name} property={property} />
                    ))}
                  </div>
                  <div className="ask-ai-json">
                    <header>
                      <span>result.json</span>
                      <RetroButton size="sm" className="gap-1" onClick={() => void copyText(JSON.stringify(run.answer?.result, null, 2), 'Result JSON')}>
                        <Copy className="h-3 w-3" /> Copy
                      </RetroButton>
                    </header>
                    <pre>{JSON.stringify(run.answer.result, null, 2)}</pre>
                  </div>
                  <footer className="ask-ai-meta">
                    <span>{run.answer.model}</span>
                    {run.plannerMs !== undefined && <span>plan {run.plannerMs}ms</span>}
                    <span>jev {run.answer.timing.jevMs}ms</span>
                    {run.answer.usage && <span>{run.answer.usage.input_tokens} tokens</span>}
                    <span className="ask-ai-meta-actions">
                      <RetroButton
                        size="sm"
                        className="gap-1"
                        onClick={() => setEditing({ runId: run.id, text: JSON.stringify({ state: run.answer?.plan.state, questions: run.answer?.plan.questions, summary: run.answer?.plan.summary }, null, 2) })}
                        disabled={busy}
                      >
                        <Pencil className="h-3 w-3" /> Edit plan
                      </RetroButton>
                    </span>
                  </footer>
                </>
              )}

              {editing?.runId === run.id && (
                <div className="ask-ai-editor">
                  <label htmlFor={`plan-${run.id}`}>Plan JSON · questions are sent to Jev as written</label>
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
        {runs.length > 0 && !busy && (
          <div className="ask-ai-examples ask-ai-examples-inline">
            <span>Try</span>
            {EXAMPLES.map((example) => (
              <RetroButton key={example.label} size="sm" onClick={() => applyExample(example)} title={example.prompt}>
                {example.label}
              </RetroButton>
            ))}
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>
    </WindowLayout>
  );
};

export default AskAiApp;
