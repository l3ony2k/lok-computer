import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';
import { fitGrid, type FitInput } from './fitGrid';

/**
 * Sizes a row of table items (coins) to the room the table really has: its
 * width, and the height the window leaves once the setup row, the result and
 * the button have theirs. Measured against .chance-main, whose height is the
 * window's, so growing the items never feeds back into the measurement.
 * Returns the custom property and max width to put on the row.
 */
/** Share of the table's width and height the items may fill, and the most one item may take. */
const FILL_WIDTH = 0.8;
const FILL_HEIGHT = 0.75;
const MAX_SHARE = 0.48;

export const useTableFit = (
  rowRef: RefObject<HTMLElement | null>,
  count: number,
  { variable, ...options }: Omit<FitInput, 'count' | 'width' | 'height'> & { variable: string },
): CSSProperties | undefined => {
  const [style, setStyle] = useState<CSSProperties>();
  const { gapRatio, extraPerRow, min, max } = options;

  useLayoutEffect(() => {
    const row = rowRef.current;
    const stage = row?.closest<HTMLElement>('.chance-stage');
    const main = row?.closest<HTMLElement>('.chance-main');
    if (!row || !stage || !main) return;
    const px = (value: string) => parseFloat(value) || 0;

    const measure = () => {
      const mainStyle = getComputedStyle(main);
      const siblings = Array.from(main.children).filter((child) => child !== stage) as HTMLElement[];
      const taken = siblings.reduce((sum, child) => sum + child.offsetHeight, 0)
        + px(mainStyle.rowGap) * siblings.length
        + px(mainStyle.paddingTop) + px(mainStyle.paddingBottom);
      const result = stage.querySelector<HTMLElement>('.chance-result');
      const stageGap = result ? result.offsetHeight + px(getComputedStyle(stage).rowGap) : 0;
      const rowStyle = getComputedStyle(row);
      const height = main.clientHeight - taken - stageGap - px(rowStyle.paddingTop) - px(rowStyle.paddingBottom);
      // Breathing room: the items fill part of the table, never edge to edge,
      // and one item never takes more than about half its width.
      const width = stage.clientWidth * FILL_WIDTH;
      const fit = fitGrid({ count, width, height: height * FILL_HEIGHT, gapRatio, extraPerRow, min, max: Math.min(max, Math.max(min, stage.clientWidth * MAX_SHARE)) });
      const gap = fit.size * gapRatio;
      setStyle({
        [variable]: `${fit.size}px`,
        // Exactly `columns` per row, so the rows wrap balanced.
        maxWidth: `${Math.ceil(fit.columns * fit.size + (fit.columns - 1) * gap) + 1}px`,
      } as CSSProperties);
    };

    measure();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(main);
    return () => observer.disconnect();
  }, [rowRef, count, variable, gapRatio, extraPerRow, min, max]);

  return style;
};
