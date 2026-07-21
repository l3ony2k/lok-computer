import { useRef, useEffect } from 'react';
import { useWindowActions, useWindowState } from '@/hooks/useWindowManager';
import { CustomIcon } from '@/components/window/CustomIcon'; // Adjusted import path
import { useWindowTransitions } from '@/hooks/useWindowTransitions';

export const Taskbar = () => {
  const { windows, activeWindow } = useWindowState();
  const { focusWindow } = useWindowActions();
  const { minimizeWithTransition, restoreWithTransition } = useWindowTransitions();
  const taskbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const taskbar = taskbarRef.current;

    const handleWheel = (event: WheelEvent) => {
      if (taskbar && event.deltaY !== 0) {
        event.preventDefault();
        taskbar.scrollLeft += event.deltaY + event.deltaX;
      }
    };

    if (taskbar) {
      taskbar.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (taskbar) {
        taskbar.removeEventListener('wheel', handleWheel);
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
      ref={taskbarRef}
      className="taskbar h-[35px] flex items-center text-sm relative z-50 overflow-x-auto overflow-y-hidden scrollable-area [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      <div className="flex items-center gap-1 whitespace-nowrap h-full">
        {windows.map((window) => (
          <button
            key={window.id}
            className="taskbar-button h-[24px] flex items-center"
            data-taskbar-window-id={window.id}
            onClick={() => handleTaskbarClick(window.id)}
            aria-pressed={activeWindow === window.id}
          >
            <CustomIcon iconType={window.iconType} className="mr-1 flex-shrink-0 w-4 h-4" />
            <span className="truncate max-w-[150px]">{window.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
