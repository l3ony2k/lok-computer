import { useContext, useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { Plus } from 'lucide-react';
import { RetroButton } from '@/components/ui/RetroButton';
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

export interface ChanceHistory {
  title: string;
  /** How many entries there are; none shows `empty`. */
  count: number;
  empty: string;
  summary?: ReactNode;
  onClear: () => void;
  /** The entries, newest first, as <li> elements. */
  children: ReactNode;
}

interface ChanceTableProps {
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
  history: ChanceHistory;
  paneRef?: Ref<HTMLElement>;
}

/** Space presses the primary button unless it would act on a control or a field. */
const IGNORE_SPACE = 'button, input, select, textarea, a, [role="dialog"], [contenteditable="true"]';

export const ChanceTable = ({ label, setup, children, result, action, actionLead, add, history, paneRef }: ChanceTableProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const historyShown = useContext(HistoryShown);

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
            {history.count > 0 && (
              <button type="button" className="chance-history-clear" onClick={history.onClear}>Clear</button>
            )}
          </div>
          {history.count > 0 && history.summary && <span className="chance-history-summary">{history.summary}</span>}
          {history.count > 0
            ? <ol className="chance-history-list">{history.children}</ol>
            : <p className="chance-history-empty">{history.empty}</p>}
        </aside>
      )}
    </div>
  );
};

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
    const margin = 8;
    const shift = rect.left < bounds.left + margin
      ? bounds.left + margin - rect.left
      : rect.right > bounds.right - margin ? bounds.right - margin - rect.right : 0;
    if (shift) picker.style.setProperty('--chance-picker-shift', `${Math.round(shift)}px`);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
      buttonRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

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

