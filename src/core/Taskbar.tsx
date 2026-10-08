import { useRef, useEffect } from 'react';
import { useWindowActions, useWindowState } from '@/hooks/useWindowManager';
import { CustomIcon } from '@/components/window/CustomIcon';
import { useWindowTransitions } from '@/hooks/useWindowTransitions';
import type { DesktopLayout } from '@/lib/theme';
import { SystemClock, SystemMenuButton } from './SystemMenu';

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
        {windows.map((window) => (
          <button
            key={window.id}
            className="taskbar-button flex items-center"
            data-taskbar-window-id={window.id}
            onClick={() => handleTaskbarClick(window.id)}
            aria-pressed={activeWindow === window.id}
            title={window.title}
          >
            <CustomIcon iconType={window.iconType} className="mr-1 flex-shrink-0 w-4 h-4" />
            <span className="truncate max-w-[150px]">{window.title}</span>
          </button>
        ))}
      </div>

      {isClassic && (
        <div className="taskbar-tray flex items-center">
          <SystemClock placement="bottom" />
        </div>
      )}
    </div>
  );
};
