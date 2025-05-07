import { useCallback, useRef } from 'react';

export type ClickHandler = (event: React.MouseEvent | React.TouchEvent) => void;

export function useDoubleClick(
  onSingleClick: ClickHandler,
  onDoubleClick: ClickHandler,
  timeout = 300
): ClickHandler {
  const lastClick = useRef<number>(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const handleClick = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastClick.current;

      if (timeSinceLastClick <= timeout && timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        onDoubleClick(event);
      } else {
        if (timer.current) {
          clearTimeout(timer.current);
        }

        onSingleClick(event);

        timer.current = setTimeout(() => {
          timer.current = null;
        }, timeout);
      }

      lastClick.current = currentTime;
    },
    [onSingleClick, onDoubleClick, timeout]
  );

  return handleClick;
}
