import { useRef, useEffect } from 'react';
import { scrollIntoViewWithin } from '@/lib/utils';
import { useWindowActions, useWindowState } from '@/hooks/useWindowManager';
import { CustomIcon } from '@/components/window/CustomIcon';
import { useWindowTransitions } from '@/hooks/useWindowTransitions';
import type { DesktopLayout } from '@/lib/theme';
import { OfflineReadout, SystemClock, SystemMenuButton } from './SystemMenu';

export const Taskbar = ({ layout = 'lok' }: { layout?: DesktopLayout }) => {
  const { windows, activeWindow } = useWindowState();
  const { focusWindow } = useWindowActions();
  const { minimizeWithTransition, restoreWithTransition } = useWindowTransitions();
  const tasksRef = useRef<HTMLDivElement>(null);
  const isClassic = layout === 'classic';

  useEffect(() => {
    const tasks = tasksRef.current;

    const handleWheel = (event: WheelEvent) => {
      if (tasks && event.deltaY !== 0) {
        event.preventDefault();
        tasks.scrollLeft += event.deltaY + event.deltaX;
      }
    };

    if (tasks) {
      tasks.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (tasks) {
        tasks.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  // The strip scrolls rather than squeezing titles, so keep the active task in view.
  useEffect(() => {
    if (!activeWindow) return;
    scrollIntoViewWithin(
      tasksRef.current?.querySelector<HTMLElement>(`[data-taskbar-window-id="${CSS.escape(activeWindow)}"]`),
      { inline: 'nearest' },
    );
  }, [activeWindow]);

  // Alt+1..9 brings the Nth task forward, as Turbo Vision's status line advertises.
  const windowsRef = useRef(windows);
  windowsRef.current = windows;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const match = /^Digit([1-9])$/.exec(event.code);
      if (!match) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const window = windowsRef.current[Number(match[1]) - 1];
      if (!window) return;
      event.preventDefault();
      if (window.minimized) restoreWithTransition(window);
      else focusWindow(window.id);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [focusWindow, restoreWithTransition]);

  const handleTaskbarClick = (windowId: string) => {
    const window = windows.find((candidate) => candidate.id === windowId);
    if (!window) return;

    if (activeWindow === windowId) {
      minimizeWithTransition(window);
    } else if (window.minimized) {
      restoreWithTransition(window);
    } else {
      focusWindow(windowId);
    }
  };

  return (
    <div
      className="taskbar flex items-center text-sm relative z-50 select-none"
      data-layout={layout}
      role="toolbar"
      aria-label="Taskbar"
    >
      {isClassic && <SystemMenuButton placement="bottom" />}

      <div
        ref={tasksRef}
        className="taskbar-tasks flex items-center gap-1 whitespace-nowrap h-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {windows.map((window, index) => (
          <button
            key={window.id}
            className="taskbar-button flex items-center"
            data-taskbar-window-id={window.id}
            onClick={() => handleTaskbarClick(window.id)}
            aria-pressed={activeWindow === window.id}
            title={index < 9 ? `${window.title} (Alt+${index + 1})` : window.title}
          >
            <CustomIcon iconType={window.iconType} className="mr-1 flex-shrink-0 w-4 h-4" />
            <span className="truncate max-w-[150px]">{window.title}</span>
          </button>
        ))}
      </div>

      {isClassic && (
        <div className="taskbar-tray flex items-center">
          <OfflineReadout />
          <SystemClock placement="bottom" />
        </div>
      )}
    </div>
  );
};
