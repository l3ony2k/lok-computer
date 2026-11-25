import { useLayoutEffect, useRef, useState } from 'react';
import { RetroButton } from '@/components/ui/RetroButton';
import { cn } from '@/lib/utils';
import { tabRows } from '@/lib/tabRows';

export interface TabStripTab<T extends string> {
  id: T;
  label: string;
}

interface TabStripProps<T extends string> {
  tabs: readonly TabStripTab<T>[];
  selected: T;
  onSelect: (id: T) => void;
  /** The tab list's accessible name, such as the app's name. */
  label: string;
  className?: string;
}

/**
 * Every app's tab strip (the `.app-tab-bar` each theme draws as tabs). When the
 * tabs need more than one row, the row holding the selected tab sits at the
 * bottom against the page, like a classic Windows property sheet (tabRows in
 * lib/tabRows.ts). Tab widths are measured, so each theme's tab size and gaps
 * decide the rows. Build tab strips with this, never by hand (controls.test.ts).
 */
export const TabStrip = <T extends string>({ tabs, selected, onSelect, label, className }: TabStripProps<T>) => {
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, tabs.findIndex((tab) => tab.id === selected));
  const count = tabs.length;
  const [rows, setRows] = useState<number[][]>(() => [tabs.map((_, index) => index)]);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const px = (value: string) => parseFloat(value) || 0;
    const measure = () => {
      const style = getComputedStyle(bar);
      // A pixel of slack, so sub-pixel widths never squeeze a full row.
      const available = bar.clientWidth - px(style.paddingLeft) - px(style.paddingRight) - 1;
      const widths = tabRefs.current.slice(0, count).map((tab) => {
        if (!tab) return 0;
        const tabStyle = getComputedStyle(tab);
        return tab.getBoundingClientRect().width + px(tabStyle.marginLeft) + px(tabStyle.marginRight);
      });
      const next = tabRows(widths, available, px(style.columnGap), selectedIndex);
      setRows((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    tabRefs.current.slice(0, count).forEach((tab) => tab && observer.observe(tab));
    return () => observer.disconnect();
  }, [selectedIndex, count]);

  return (
    <div ref={barRef} className={cn('app-toolbar-row app-tab-bar app-tab-strip sticky top-0', className)} role="tablist" aria-label={label} data-rows={rows.length}>
      {rows.map((row) => (
        <div className="app-tab-row" key={row[0]}>
          {row.map((index) => {
            const tab = tabs[index];
            if (!tab) return null;
            return (
              <RetroButton
                key={tab.id}
                ref={(element: HTMLButtonElement | null) => { tabRefs.current[index] = element; }}
                size="sm"
                role="tab"
                aria-selected={selected === tab.id}
                active={selected === tab.id}
                onClick={() => onSelect(tab.id)}
              >
                {tab.label}
              </RetroButton>
            );
          })}
        </div>
      ))}
    </div>
  );
};
