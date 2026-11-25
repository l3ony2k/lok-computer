import React, { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { useDismiss } from '@/hooks/useDismiss';
import { getOverlayBounds, getOverlayRoot, toOverlayPoint } from '@/lib/overlayRoot';
import { chooseVerticalSide, clampSpan, verticalOffset } from '@/lib/overlayPlacement';
import { scrollIntoViewWithin } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectGroup {
  group: string;
  options: SelectOption[];
}

export type SelectItem = SelectOption | SelectGroup;

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  className?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}

const isGroup = (item: SelectItem): item is SelectGroup => 'group' in item;
const flatten = (items: SelectItem[]): SelectOption[] => items.flatMap((item) => (isGroup(item) ? item.options : [item]));

/** Keys that open the list on a closed field (the OS picker would open on them). */
const OPEN_KEYS = new Set([' ', 'Enter', 'ArrowDown', 'ArrowUp', 'F4']);
const TYPEAHEAD_RESET_MS = 600;
const LIST_GAP = 2;

/**
 * A dropdown that looks like its theme. The field is a real <select>, so each
 * skin's field styling, forms, and screen readers (a combobox) keep working;
 * opening it shows a listbox drawn with the theme's menu classes instead of the
 * operating system's list. Focus stays on the field while the list is open and
 * the field drives it: arrows, Home/End, PageUp/PageDown, Enter, Escape, Tab,
 * and typing to jump to an option.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { value, onValueChange, items, className, disabled, title, 'aria-label': ariaLabel },
  forwardedRef,
) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => selectRef.current as HTMLSelectElement);

  const listId = useId();
  const options = useMemo(() => flatten(items), [items]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const typeahead = useRef({ text: '', at: 0 });

  const selectedIndex = options.findIndex((option) => option.value === value);
  const optionId = (index: number) => `${listId}-option-${index}`;

  const enabledFrom = useCallback((start: number, step: 1 | -1) => {
    for (let index = start; index >= 0 && index < options.length; index += step) {
      if (!options[index].disabled) return index;
    }
    return -1;
  }, [options]);

  const openList = () => {
    if (disabled) return;
    setHighlighted(selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : enabledFrom(0, 1));
    setOpen(true);
  };

  const close = useCallback(() => setOpen(false), []);

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (option.value !== value) onValueChange(option.value);
    close();
    selectRef.current?.focus({ preventScroll: true });
  };

  // Close on a press outside the field and the list (the field's own keys handle
  // Escape, and losing focus closes it too).
  useDismiss(open, close, { inside: [selectRef, listRef], capture: true, escape: false });

  // Below the field, or above it when there is more room there; never outside the overlay.
  useLayoutEffect(() => {
    const field = selectRef.current;
    const list = listRef.current;
    if (!open || !field || !list) return;
    const rect = field.getBoundingClientRect();
    const bounds = getOverlayBounds();
    const topLeft = toOverlayPoint({ x: rect.left, y: rect.top }, bounds);
    const anchor = { top: topLeft.y, bottom: topLeft.y + rect.height };
    const { side, space } = chooseVerticalSide(anchor, list.scrollHeight, bounds.height, LIST_GAP);
    list.style.minWidth = `${rect.width}px`;
    list.style.maxHeight = `${Math.max(120, Math.min(320, space))}px`;
    const height = list.getBoundingClientRect().height;
    const width = list.getBoundingClientRect().width;
    list.style.left = `${clampSpan(topLeft.x, width, bounds.width)}px`;
    list.style.top = `${verticalOffset(anchor, height, side, LIST_GAP)}px`;
  }, [open]);

  // Keep the highlighted option in view as it moves.
  useEffect(() => {
    if (!open || highlighted < 0) return;
    scrollIntoViewWithin(listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(highlighted))}`), { block: 'nearest' });
    // optionId only depends on listId, which is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, highlighted]);

  const jumpToTyped = (key: string) => {
    const now = Date.now();
    const state = typeahead.current;
    state.text = now - state.at > TYPEAHEAD_RESET_MS ? key : state.text + key;
    state.at = now;
    const query = state.text.toLowerCase();
    const start = open ? highlighted : selectedIndex;
    const order = [...options.keys()].map((offset) => (Math.max(start, 0) + (state.text.length === 1 ? offset + 1 : offset)) % options.length);
    const match = order.find((index) => !options[index].disabled && options[index].label.toLowerCase().startsWith(query));
    if (match === undefined) return;
    if (open) setHighlighted(match);
    else onValueChange(options[match].value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLSelectElement>) => {
    if (disabled) return;
    if (!open) {
      if (OPEN_KEYS.has(event.key) || (event.altKey && event.key === 'ArrowDown')) {
        event.preventDefault();
        openList();
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        jumpToTyped(event.key);
      }
      return;
    }
    const page = 8;
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); setHighlighted((index) => { const next = enabledFrom(index + 1, 1); return next === -1 ? index : next; }); return;
      case 'ArrowUp': event.preventDefault(); setHighlighted((index) => { const next = enabledFrom(index - 1, -1); return next === -1 ? index : next; }); return;
      case 'Home': event.preventDefault(); setHighlighted(enabledFrom(0, 1)); return;
      case 'End': event.preventDefault(); setHighlighted(enabledFrom(options.length - 1, -1)); return;
      case 'PageDown': event.preventDefault(); setHighlighted((index) => { const next = enabledFrom(Math.min(index + page, options.length - 1), -1); return next === -1 ? index : next; }); return;
      case 'PageUp': event.preventDefault(); setHighlighted((index) => { const next = enabledFrom(Math.max(index - page, 0), 1); return next === -1 ? index : next; }); return;
      case 'Enter':
      case ' ': event.preventDefault(); choose(highlighted); return;
      case 'Escape': event.preventDefault(); event.stopPropagation(); close(); return;
      case 'Tab': close(); return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          jumpToTyped(event.key);
        }
    }
  };

  const renderOption = (option: SelectOption) => {
    const index = options.indexOf(option);
    const selected = option.value === value;
    return (
      <div
        key={`${option.value}-${index}`}
        id={optionId(index)}
        role="option"
        aria-selected={selected}
        aria-disabled={option.disabled || undefined}
        className="menu-item-button select-list-option flex items-center"
        data-highlighted={index === highlighted ? '' : undefined}
        onPointerMove={() => { if (!option.disabled && index !== highlighted) setHighlighted(index); }}
        onClick={() => choose(index)}
      >
        <span className="menu-item-check w-4 h-4 mr-2 flex items-center justify-center flex-none" aria-hidden="true">
          {selected && <Check className="w-3 h-3" />}
        </span>
        <span className="menu-item-label min-w-0 flex-1 truncate">{option.label}</span>
      </div>
    );
  };

  return (
    <>
      <select
        ref={selectRef}
        className={className}
        value={value}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && highlighted >= 0 ? optionId(highlighted) : undefined}
        // The OS list never opens: the press opens the themed one instead.
        onMouseDown={(event) => { event.preventDefault(); selectRef.current?.focus({ preventScroll: true }); if (open) close(); else openList(); }}
        onKeyDown={handleKeyDown}
        onBlur={close}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {items.map((item) => (isGroup(item) ? (
          <optgroup key={item.group} label={item.group}>
            {item.options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
          </optgroup>
        ) : (
          <option key={item.value} value={item.value} disabled={item.disabled}>{item.label}</option>
        )))}
      </select>
      {open && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          data-follow-pointer=""
          aria-label={ariaLabel}
          className="menu-surface select-list fixed z-[var(--z-menu)] select-none"
          style={{ left: 0, top: 0 }}
          // Keep focus on the field: a press in the list must not blur it.
          onMouseDown={(event) => event.preventDefault()}
        >
          {items.map((item) => (isGroup(item) ? (
            <div key={item.group} role="group" aria-label={item.group}>
              <div className="select-list-group" aria-hidden="true">{item.group}</div>
              {item.options.map(renderOption)}
            </div>
          ) : renderOption(item)))}
        </div>,
        getOverlayRoot(),
      )}
    </>
  );
});
