import { useCallback } from 'react';
import { Window } from '@/hooks/useWindowManager.ts';
import { useWindowManager } from '@/hooks/useWindowManager.ts';
import { X, Minimize, Maximize } from 'lucide-react';
import { CustomIcon } from './CustomIcon';
import { Rnd, DraggableData, ResizableDelta, Position } from 'react-rnd';

// Define default numeric values
const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 400;
const MIN_WIDTH = 250;
const MIN_HEIGHT = 200;
const TOP_BAR_HEIGHT = 30;
const TASKBAR_HEIGHT = 30;

interface DraggableWindowProps {
  window: Window;
  onResizeStop: (id: string, width: number, height: number) => void;
}

export const DraggableWindow = ({ window: windowProps, onResizeStop }: DraggableWindowProps) => {
  const { closeWindow, minimizeWindow, maximizeWindow, restoreWindow, focusWindow, updateWindowPosition, activeWindow } = useWindowManager();

  const handleDragStop = useCallback((_e: any, data: DraggableData) => {
    if (!windowProps.maximized) {
      updateWindowPosition(windowProps.id, data.x, data.y);
    }
  }, [windowProps.id, windowProps.maximized, updateWindowPosition]);

  const handleResizeStop = useCallback((_e: any, _direction: any, ref: HTMLElement, _delta: ResizableDelta, _position: Position) => {
    onResizeStop(windowProps.id, ref.offsetWidth, ref.offsetHeight);
  }, [windowProps.id, onResizeStop]);

  // Focus handler specifically for direct mouse down events
  const handleMouseDownFocus = useCallback((e: MouseEvent) => {
    // Check if the click target is part of the title bar
    const targetElement = e.target as Element;
    const titleBar = targetElement.closest('.window-titlebar');
    
    // Only focus if click is outside titlebar and window isn't already active
    if (!titleBar && windowProps.id !== activeWindow) {
       focusWindow(windowProps.id);
    }
    // If click is on title bar, Rnd's drag handle logic will take over
    // focus will be handled by onDragStart below.
  }, [focusWindow, windowProps.id, activeWindow]);

  // Generic handler to focus window on drag/resize start if not active
  const handleInteractionStartFocus = useCallback(() => {
    if (windowProps.id !== activeWindow) {
      focusWindow(windowProps.id);
    }
  }, [focusWindow, windowProps.id, activeWindow]);

  if (windowProps.minimized) return null;

  const calculatedWidth = typeof windowProps.width === 'number' ? windowProps.width : DEFAULT_WIDTH;
  const calculatedHeight = typeof windowProps.height === 'number' ? windowProps.height : DEFAULT_HEIGHT;

  return (
    <Rnd
      enableTransformFix={true}
      size={ windowProps.maximized ? 
             // Keep size as 100% to fill parent container
             { width: '100%', height: '100%' } : 
             { width: calculatedWidth, height: calculatedHeight } 
           }
      position={ windowProps.maximized ? 
                 // Position should be 0,0 relative to the WindowContainer parent
                 { x: 0, y: 0 } : 
                 // Use ?? instead of || to handle position 0 correctly
                 { x: windowProps.x ?? 50, y: windowProps.y ?? 50 }
               }
      minWidth={MIN_WIDTH}
      minHeight={MIN_HEIGHT}
      bounds="parent"
      style={{ zIndex: windowProps.zIndex }}
      onMouseDown={handleMouseDownFocus}
      onDragStart={handleInteractionStartFocus} // Use new handler
      onDragStop={handleDragStop}
      onResizeStart={handleInteractionStartFocus} // Use new handler
      onResizeStop={handleResizeStop}
      disableDragging={windowProps.maximized}
      enableResizing={!windowProps.maximized}
      dragHandleClassName="window-titlebar"
      // Remove !fixed class, Rnd handles positioning within the container
      className={`flex flex-col border border-border shadow-lg overflow-hidden bg-background`}
    >
      <div 
        className="window-titlebar" 
        onDoubleClick={windowProps.maximized ? () => restoreWindow(windowProps.id) : () => maximizeWindow(windowProps.id)}
      >
        <CustomIcon iconType={windowProps.iconType} className="mr-1 w-4 h-4" />
        <span className="flex-1 truncate">{windowProps.title}</span>
        <div className="flex space-x-1">
          <button 
            className="window-control-button hover:bg-yellow-500"
            onClick={(e) => { e.stopPropagation(); minimizeWindow(windowProps.id); }}
            title="Minimize"
          >
            <Minimize className="w-3 h-3" />
          </button>
          {windowProps.maximized ? (
            <button 
              className="window-control-button hover:bg-green-500"
              onClick={(e) => { e.stopPropagation(); restoreWindow(windowProps.id); }}
              title="Restore"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0H2C1.44772 0 1 0.447715 1 1V7C1 7.55228 1.44772 8 2 8H8C8.55228 8 9 7.55228 9 7V1C9 0.447715 8.55228 0 8 0ZM8 7H2V1H8V7ZM10 3H9V4H10V10H4V9H3V10C3 10.5523 3.44772 11 4 11H10C10.5523 11 11 10.5523 11 10V4C11 3.44772 10.5523 3 10 3Z" fill="currentColor"/>
                <path d="M10 3H9V4H10V10H4V9H3V10C3 10.5523 3.44772 11 4 11H10C10.5523 11 11 10.5523 11 10V4C11 3.44772 10.5523 3 10 3Z" fill="currentColor"/>
              </svg>
            </button>
          ) : (
            <button 
              className="window-control-button hover:bg-green-500"
              onClick={(e) => { e.stopPropagation(); maximizeWindow(windowProps.id); }}
              title="Maximize"
            >
              <Maximize className="w-3 h-3" />
            </button>
          )}
          <button 
            className="window-control-button hover:bg-red-500"
            onClick={(e) => { e.stopPropagation(); closeWindow(windowProps.id); }}
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-1">
        {windowProps.content}
      </div>
    </Rnd>
  );
};
