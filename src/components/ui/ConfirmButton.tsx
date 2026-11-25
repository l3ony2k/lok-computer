import React, { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { RetroButton } from '@/components/ui/RetroButton';

/** Blur disarms after this delay, so a click that moves focus still lands. */
const BLUR_DISARM_MS = 150;

type RetroButtonProps = ComponentProps<typeof RetroButton>;

interface ConfirmButtonProps extends Omit<RetroButtonProps, 'onClick' | 'children' | 'title' | 'aria-label'> {
  /** Runs on the second click. A returned promise keeps the button armed until it settles. */
  onConfirm: () => void | Promise<unknown>;
  /** Content after the icon while unarmed (leave out for an icon-only button). */
  label?: ReactNode;
  /** Content after the icon while armed. */
  confirmLabel: ReactNode;
  icon?: ReactNode;
  title?: string;
  /** Title while armed; defaults to `title`. */
  confirmTitle?: string;
  'aria-label'?: string;
  /** Accessible name while armed; defaults to `aria-label`. */
  confirmAriaLabel?: string;
  /** Render a bare `<button>` (styled by `className`) instead of a RetroButton, for text-link actions. */
  plain?: boolean;
}

/**
 * A destructive action that takes two clicks: the first arms it (the label
 * changes), the second runs `onConfirm`. It stays armed until the person
 * confirms, moves focus away, or presses Escape; it never disarms on a timer.
 * It clears its timers when it unmounts.
 */
export const ConfirmButton = ({
  onConfirm,
  label,
  confirmLabel,
  icon,
  title,
  confirmTitle,
  'aria-label': ariaLabel,
  confirmAriaLabel,
  onBlur,
  onKeyDown,
  plain = false,
  ...props
}: ConfirmButtonProps) => {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const mounted = useRef(true);

  const clearTimer = () => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
  };

  const disarm = () => {
    clearTimer();
    if (mounted.current) setArmed(false);
  };

  const disarmAfter = (ms: number) => {
    clearTimer();
    timer.current = setTimeout(disarm, ms);
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimer();
    };
  }, []);

  const click = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    clearTimer();
    const result = onConfirm();
    if (result instanceof Promise) void result.finally(disarm);
    else disarm();
  };

  const shared = {
    onClick: click,
    onBlur: (event: React.FocusEvent<HTMLButtonElement>) => {
      onBlur?.(event);
      if (armed) disarmAfter(BLUR_DISARM_MS);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      if (armed && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        disarm();
      }
    },
    title: armed ? confirmTitle ?? title : title,
    'aria-label': armed ? confirmAriaLabel ?? ariaLabel : ariaLabel,
    'data-armed': armed || undefined,
  };

  if (plain) {
    const { className, disabled, type, id } = props;
    return (
      <button type={type ?? 'button'} id={id} className={className} disabled={disabled} {...shared}>
        {icon}
        {armed ? confirmLabel : label}
      </button>
    );
  }

  return (
    <RetroButton
      {...props}
      {...shared}
    >
      {icon}
      {armed ? confirmLabel : label}
    </RetroButton>
  );
};
