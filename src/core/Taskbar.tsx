import { useRef, useEffect } from 'react';
import { useWindowManager } from '@/hooks/useWindowManager';
import { CustomIcon } from '@/components/window/CustomIcon'; // Adjusted import path

export const Taskbar = () => {
  const { windows, focusWindow, activeWindow, minimizeWindow } = useWindowManager();
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
    if (activeWindow === windowId) {
      minimizeWindow(windowId);
    } else {
      focusWindow(windowId);
    }
  };

  return (
    <div
      ref={taskbarRef}
      className="taskbar h-[35px] flex items-center text-sm relative z-50 px-1 bg-retro-taskbar border-t border-border overflow-x-auto overflow-y-hidden scrollable-area"
    >
      <div className="flex items-center space-x-1 whitespace-nowrap h-full">
        {windows.map((window) => (
          <button
            key={window.id}
            className={`taskbar-button h-[24px] flex items-center px-2 py-1 border border-transparent hover:border-border hover:bg-accent active:shadow-retro-inset ${activeWindow === window.id ? 'bg-accent shadow-retro-inset' : ''}`}
            onClick={() => handleTaskbarClick(window.id)}
          >
            <CustomIcon iconType={window.iconType} className="mr-1 flex-shrink-0 w-4 h-4" />
            <span className="truncate max-w-[150px]">{window.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
