import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { RetroButton } from '@/components/ui/RetroButton';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  id: T;
  /** The button's content; text, or an icon and text. */
  label: ReactNode;
  title?: string;
  disabled?: boolean;
}

interface SegmentedProps<T extends string> {
  /** The group's accessible name. */
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** Joined buttons (the default) or separate ones, laid out by `className`. */
  joined?: boolean;
  className?: string;
  title?: string;
}

/**
 * A row of exclusive choices (a radio group) drawn with RetroButton, so every
 * theme skin draws its own buttons. Only the chosen option is in the tab order;
 * the arrow keys, Home and End move the choice like native radio buttons.
 * Build radio groups with this, never by hand (controls.test.ts).
 */
export const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
  joined = true,
  className,
  title,
}: SegmentedProps<T>) => {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0);
  const checkedIndex = options.findIndex((option) => option.id === value && !option.disabled);
  const focusIndex = checkedIndex >= 0 ? checkedIndex : enabled[0] ?? -1;

  const choose = (index: number) => {
    const option = options[index];
    if (option && !option.disabled && option.id !== value) onChange(option.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!enabled.length) return;
    const current = enabled.indexOf(buttonRefs.current.findIndex((button) => button === event.target));
    const from = current >= 0 ? current : Math.max(0, enabled.indexOf(focusIndex));
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = enabled[(from + 1) % enabled.length];
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = enabled[(from - 1 + enabled.length) % enabled.length];
        break;
      case 'Home':
        next = enabled[0];
        break;
      case 'End':
        next = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    buttonRefs.current[next]?.focus({ preventScroll: true });
    choose(next);
  };

  return (
    <div
      className={cn(joined && 'app-joined-control', 'app-segmented', className)}
      role="radiogroup"
      aria-label={label}
      title={title}
      onKeyDown={onKeyDown}
    >
      {options.map((option, index) => {
        const checked = option.id === value;
        return (
          <RetroButton
            key={option.id}
            ref={(element: HTMLButtonElement | null) => { buttonRefs.current[index] = element; }}
            type="button"
            size="sm"
            role="radio"
            aria-checked={checked}
            active={checked}
            disabled={option.disabled}
            title={option.title}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => choose(index)}
          >
            {option.label}
          </RetroButton>
        );
      })}
    </div>
  );
};
