import React, { useState, useEffect, useRef } from 'react';
import { CustomIcon } from '@/components/window/CustomIcon';
import type { WindowManagerContextType } from '@/hooks/useWindowManager';
import { useDoubleClick } from '@/hooks/useDoubleClick';
import { useIsMobile } from '@/hooks/use-mobile';
import { APP_LIST } from '@/config/apps';

interface DesktopIconsProps {
  addWindow: WindowManagerContextType['addWindow'];
  addOrFocusWindow: WindowManagerContextType['addOrFocusWindow'];
  handleOpenAbout: () => void;
  handleOpenSettingsWindow: () => void;
}

export const DesktopIcons: React.FC<DesktopIconsProps> = ({ 
  addWindow,
  addOrFocusWindow,
  handleOpenAbout,
  handleOpenSettingsWindow
}) => {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const ICON_HEIGHT = 74; // Height of each icon (button height + margin)
  const COLUMN_WIDTH = 80; // Width of each column
  const TASKBAR_HEIGHT = 30; // Height of the taskbar

  useEffect(() => {
    const updateColumns = () => {
      if (!containerRef.current) return;
      
      const containerHeight = containerRef.current.clientHeight - TASKBAR_HEIGHT;
      const totalIconsHeight = APP_LIST.length * ICON_HEIGHT;
      const neededColumns = Math.ceil(totalIconsHeight / containerHeight);
      setColumns(Math.max(1, neededColumns));
    };

    // Initial calculation
    updateColumns();

    // Add resize observer
    const resizeObserver = new ResizeObserver(updateColumns);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleSingleClickBase = (iconName: string) => (event: React.MouseEvent | React.TouchEvent) => {
    // No custom focus state needed, native focus handles it
  };

  const getActionForApp = (app: typeof APP_LIST[0]) => {
    switch (app.name) {
      case "About":
        return handleOpenAbout;
      case "Config":
        return handleOpenSettingsWindow;
      default:
        return () => {
          if (app.singleInstance) {
            addOrFocusWindow({
              title: app.name,
              content: <app.component {...(app.props || {})} />,
              width: app.defaultWidth,
              height: app.defaultHeight,
              iconType: app.iconType,
              singleInstance: true,
            });
          } else {
            addWindow({
              title: app.name,
              content: <app.component {...(app.props || {})} />,
              width: app.defaultWidth,
              height: app.defaultHeight,
              iconType: app.iconType,
            });
          }
        };
    }
  };

  // Calculate which column each icon should be in
  const getIconColumn = (index: number) => {
    return Math.floor(index / Math.ceil(APP_LIST.length / columns));
  };
  
  return (
    <div 
      ref={containerRef}
      className="absolute top-4 right-4 bottom-[34px] flex justify-end z-10 select-none"
      style={{ width: `${COLUMN_WIDTH * columns}px` }}
    > 
      {Array.from({ length: columns }).map((_, columnIndex) => (
        <div key={columnIndex} className="flex flex-col items-end space-y-2">
          {APP_LIST.filter((_, index) => getIconColumn(index) === columnIndex).map((app) => {
            const singleClickHandlerForHook = handleSingleClickBase(app.name);
            const action = getActionForApp(app);
            const doubleClickHandler = useDoubleClick(singleClickHandlerForHook, action);
            const clickAction = isMobile ? action : doubleClickHandler;
            
            return (
              <button
                key={app.name}
                onClick={clickAction} 
                className="flex flex-col items-center space-y-1 p-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 w-20 select-none"
                aria-label={`Open ${app.name}`}
                tabIndex={0}
              >
                <CustomIcon iconType={app.iconType} className="w-10 h-10" />
                <span 
                  className="text-xs text-center break-words w-full text-neutral-200 font-bold select-none"
                  style={{ textShadow: "0px 0px 3px rgba(0, 0, 0, 0.8)" }}
                >
                  {app.name}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
