import { useCallback, useContext, useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { Plus } from 'lucide-react';
import { RetroButton } from '@/components/ui/RetroButton';
import { useDismiss, type DismissReason } from '@/hooks/useDismiss';
import { clampSpan } from '@/lib/overlayPlacement';
import { HistoryShown } from './historyShown';

/**
 * The layout every Chance tab shares: an optional setup row, the table (the
 * things themselves, edited where they lie), the result, and one primary
 * button at the bottom that Space also presses; the history sits in a side
 * panel, folding under the table in a narrow window.
 */

export interface ChanceAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}

export interface ChanceAdd {
  label: string;
  onClick: () => void;
  /** Busy, or the table is full: the button stays put, disabled. */
  disabled?: boolean;
}

interface ChanceHistoryBase {
  title: string;
  empty: string;
  summary?: ReactNode;
  onClear: () => void;
}

/** A history of entries, newest first; the table draws each <li>. */
export interface ChanceHistoryList<T> extends ChanceHistoryBase {
  entries: readonly T[];
  renderEntry: (entry: T, index: number) => ReactNode;
  /** Defaults to the entry's `id`. */
  entryKey?: (entry: T) => string;
  /** Which entry is marked as the latest; defaults to the first. */
  isLatest?: (entry: T, index: number) => boolean;
  /** Added to every entry's class. */
  entryClassName?: string;
}

/** A history laid out by the tab itself (Moon blocks groups throws by question); entries use HistoryEntry. */
export interface ChanceHistoryGroups extends ChanceHistoryBase {
  /** How many entries there are; none shows `empty`. */
  count: number;
  children: ReactNode;
}

export type ChanceHistory<T> = ChanceHistoryList<T> | ChanceHistoryGroups;

interface ChanceTableProps<T> {
  label: string;
  setup?: ReactNode;
  /** The table: dice, coins, cards. */
  children: ReactNode;
  result?: ReactNode;
  action: ChanceAction;
  /** Beside the primary button, such as the card count. */
  actionLead?: ReactNode;
  /** The square + after the primary button that puts one more thing on the table. */
  add?: ChanceAdd;
  history: ChanceHistory<T>;
  paneRef?: Ref<HTMLElement>;
}

/** Space presses the primary button unless it would act on a control or a field. */
const IGNORE_SPACE = 'button, input, select, textarea, a, [role="dialog"], [contenteditable="true"]';

/** One entry in a history list, marked when it is the latest. */
export const HistoryEntry = ({ latest, className, title, children }: { latest?: boolean; className?: string; title?: string; children: ReactNode }) => (
  <li className={className ? `chance-history-entry ${className}` : 'chance-history-entry'} data-latest={latest || undefined} title={title}>
    {children}
  </li>
);

const entryId = (entry: unknown) => (entry as { id: string }).id;
const isFirst = (_entry: unknown, index: number) => index === 0;

const HistoryItems = <T,>({ history }: { history: ChanceHistory<T> }) => {
  if ('children' in history) return <>{history.children}</>;
  const { entries, renderEntry, entryKey = entryId, isLatest = isFirst, entryClassName } = history;
  return (
    <>
      {entries.map((entry, index) => (
        <HistoryEntry key={entryKey(entry)} latest={isLatest(entry, index)} className={entryClassName}>
          {renderEntry(entry, index)}
        </HistoryEntry>
      ))}
    </>
  );
};

export const ChanceTable = <T,>({ label, setup, children, result, action, actionLead, add, history, paneRef }: ChanceTableProps<T>) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const historyShown = useContext(HistoryShown);
  const historyCount = 'children' in history ? history.count : history.entries.length;

  // Opening a tab puts focus on it (not on a control), so Space rolls at once.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const active = document.activeElement;
    const windowRoot = root.closest('.draggable-window');
    if (!active || active === document.body || (windowRoot && windowRoot.contains(active))) {
      root.focus({ preventScroll: true });
    }
  }, []);

  // The primary button disables itself while a roll, flip or throw runs, and a
  // disabled button drops keyboard focus to the page, where Space does
  // nothing. When it comes back, return focus to the table if it was lost.
  const disabled = action.disabled === true;
  useEffect(() => {
    if (disabled) return;
    const root = rootRef.current;
    const active = document.activeElement;
    if (root && (!active || active === document.body)) root.focus({ preventScroll: true });
  }, [disabled]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== ' ' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if ((event.target as HTMLElement).closest(IGNORE_SPACE)) return;
    event.preventDefault();
    if (!action.disabled) action.onClick();
  };

  return (
    <div ref={rootRef} className="chance-layout" tabIndex={-1} onKeyDown={onKeyDown}>
      <section ref={paneRef} className="chance-main" aria-label={label}>
        {setup && <div className="chance-setup">{setup}</div>}
        <div className="chance-stage">
          {children}
          {result && <div className="chance-result" aria-live="polite">{result}</div>}
        </div>
        <div className="chance-action">
          <div className="chance-action-row">
            {actionLead}
            <RetroButton ref={action.buttonRef} variant="primary" className="chance-primary" onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </RetroButton>
            {add && (
              <RetroButton size="icon" className="chance-add" aria-label={add.label} title={add.label} onClick={add.onClick} disabled={add.disabled}>
                <Plus className="w-4 h-4" />
              </RetroButton>
            )}
          </div>
          <span className="chance-action-hint" aria-hidden="true">or press Space</span>
        </div>
      </section>

      {historyShown && (
        <aside id="chance-history" className="chance-history-panel" aria-label={history.title}>
          <div className="chance-history-head">
            <span className="chance-history-title">{history.title}</span>
            {historyCount > 0 && (
              <ConfirmButton plain className="chance-history-clear" onConfirm={history.onClear} label="Clear" confirmLabel="Clear all?" confirmTitle="Click again to clear the history" />
            )}
          </div>
          {historyCount > 0 && history.summary && <span className="chance-history-summary">{history.summary}</span>}
          {historyCount > 0
            ? <ol className="chance-history-list"><HistoryItems history={history} /></ol>
            : <p className="chance-history-empty">{history.empty}</p>}
        </aside>
      )}
    </div>
  );
};

/**
 * The quiet line under a finished reading that hands it to Ask AI. It is laid
 * out from the start (hidden while `waiting`), so nothing shifts when it
 * appears; `fresh` fades it in once, right after the reading lands.
 */
export const AskLine = ({ waiting, fresh, onAsk, className }: { waiting: boolean; fresh: boolean; onAsk: () => void; className?: string }) => (
  <p className={className ? `chance-ask-line ${className}` : 'chance-ask-line'} data-waiting={waiting || undefined} data-fresh={fresh || undefined} aria-hidden={waiting || undefined}>
    Not sure what it means?{' '}
    <button type="button" className="chance-ask-link" tabIndex={waiting ? -1 : undefined} onClick={() => { if (!waiting) onAsk(); }}>
      <span className="chance-ask-link-text">Ask AI to read it</span> →
    </button>
  </p>
);

interface TableItemProps {
  /** The item's accessible name, such as "d20 showing 17". */
  label: string;
  caption: string;
  shape?: 'square' | 'round';
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** Shows the corner ×; leave it out when the item cannot go (the last one). */
  onRemove?: () => void;
  removeLabel: string;
  pickerLabel: string;
  picker: ReactNode;
  children: ReactNode;
}

/**
 * One thing on the table: click it to change it (a small panel opens under
 * it), hover or select it for the corner × that removes it. The panel closes
 * on a pick, Escape, or a click elsewhere.
 */
export const TableItem = ({ label, caption, shape = 'square', open, onToggle, onClose, onRemove, removeLabel, pickerLabel, picker, children }: TableItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // The picker centres under its item, then shifts back inside the table if
  // that would run it off an edge (an item at either end of a row).
  useLayoutEffect(() => {
    const picker = pickerRef.current;
    const bounds = ref.current?.closest('.chance-main')?.getBoundingClientRect();
    if (!open || !picker || !bounds) return;
    picker.style.removeProperty('--chance-picker-shift');
    const rect = picker.getBoundingClientRect();
    const start = rect.left - bounds.left;
    const shift = clampSpan(start, rect.width, bounds.width, 8) - start;
    if (shift) picker.style.setProperty('--chance-picker-shift', `${Math.round(shift)}px`);
  }, [open]);

  const dismiss = useCallback((reason: DismissReason) => {
    onClose();
    if (reason === 'escape') buttonRef.current?.focus({ preventScroll: true });
  }, [onClose]);
  useDismiss(open, dismiss, { inside: [ref] });

  return (
    <div ref={ref} className="chance-item" data-shape={shape} data-open={open || undefined}>
      <button
        ref={buttonRef}
        type="button"
        className="chance-item-button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
      >
        {children}
      </button>
      {onRemove && (
        <button type="button" className="chance-item-remove" aria-label={removeLabel} onClick={onRemove}>×</button>
      )}
      <span className="chance-item-caption">{caption}</span>
      {open && (
        <div ref={pickerRef} className="chance-item-picker menu-surface" role="dialog" aria-label={pickerLabel}>
          {picker}
        </div>
      )}
    </div>
  );
};

