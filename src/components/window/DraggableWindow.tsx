import { useCallback } from 'react';
import { Window } from '@/hooks/useWindowManager.ts';
import { useWindowManager } from '@/hooks/useWindowManager.ts';
import { X, Minimize, Maximize } from 'lucide-react';
import { CustomIcon } from './CustomIcon';
import { Rnd, DraggableData, ResizableDelta, Position } from 'react-rnd';
import { cn } from '@/lib/utils';
import { adjustWindowToViewport, type WindowDimensions, type ViewportDimensions, type AdjustedWindow } from '@/lib/utils';

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
      const parentElement = data.node.parentElement;
      if (parentElement) {
        const viewport: ViewportDimensions = {
          width: parentElement.clientWidth,
          height: parentElement.clientHeight,
        };

        const currentWindowData: WindowDimensions = {
          x: data.x,
          y: data.y,
          width: windowProps.width ?? DEFAULT_WIDTH,
          height: windowProps.height ?? DEFAULT_HEIGHT,
          minWidth: windowProps.minWidth ?? MIN_WIDTH,
          minHeight: windowProps.minHeight ?? MIN_HEIGHT,
        };

        const adjusted = adjustWindowToViewport(currentWindowData, viewport);
        
        updateWindowPosition(windowProps.id, adjusted.x, adjusted.y);
      } else {
        updateWindowPosition(windowProps.id, data.x, data.y);
      }
    }
  }, [windowProps.id, windowProps.maximized, windowProps.width, windowProps.height, windowProps.minWidth, windowProps.minHeight, updateWindowPosition]);

  const handleResizeStop = useCallback((_e: any, _direction: any, ref: HTMLElement, _delta: ResizableDelta, position: Position) => {
    const parentElement = ref.parentElement;
    if (parentElement) {
      const viewport: ViewportDimensions = {
        width: parentElement.clientWidth,
        height: parentElement.clientHeight,
      };

      const currentWindowData: WindowDimensions = {
        x: position.x,
        y: position.y,
        width: ref.offsetWidth,
        height: ref.offsetHeight,
        minWidth: windowProps.minWidth ?? MIN_WIDTH,
        minHeight: windowProps.minHeight ?? MIN_HEIGHT,
      };

      const adjusted = adjustWindowToViewport(currentWindowData, viewport);

      onResizeStop(windowProps.id, adjusted.width, adjusted.height); 
      updateWindowPosition(windowProps.id, adjusted.x, adjusted.y);
    } else {
      onResizeStop(windowProps.id, ref.offsetWidth, ref.offsetHeight);
      updateWindowPosition(windowProps.id, position.x, position.y);
    }
  }, [windowProps.id, windowProps.minWidth, windowProps.minHeight, onResizeStop, updateWindowPosition]);

  // Focus handler for clicks outside the title bar
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

  const calculatedWidth = typeof windowProps.width === 'number' ? windowProps.width : DEFAULT_WIDTH;
  const calculatedHeight = typeof windowProps.height === 'number' ? windowProps.height : DEFAULT_HEIGHT;

  return (
    <Rnd
      size={ windowProps.maximized ? 
             { width: '100%', height: '100%' } : 
             { width: calculatedWidth, height: calculatedHeight } 
           }
      position={ windowProps.maximized ? 
                 { x: 0, y: 0 } : 
                 { x: windowProps.x ?? 50, y: windowProps.y ?? 50 }
               }
      minWidth={MIN_WIDTH}
      minHeight={MIN_HEIGHT}
      bounds="parent"
      style={{ 
        zIndex: windowProps.zIndex, 
        display: 'flex',
        flexDirection: 'column',
        ...(windowProps.minimized && { 
          visibility: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
        })
      }}
      onMouseDown={handleMouseDownFocus}
      onDragStart={handleInteractionStartFocus}
      onDragStop={handleDragStop}
      onResizeStart={handleInteractionStartFocus}
      onResizeStop={handleResizeStop}
      disableDragging={windowProps.maximized}
      enableResizing={!windowProps.maximized}
      dragHandleClassName="window-titlebar"
      className={cn(
        "window-content-area flex flex-col border-2 border-border shadow-lg dark:shadow-[3px_3px_24px_rgb(0,0,0,0.3)] overflow-hidden bg-background",
      )}
    >
      {/* Title bar - fixed height */}
      <div 
        className="window-titlebar" 
        onDoubleClick={windowProps.maximized ? () => restoreWindow(windowProps.id) : () => maximizeWindow(windowProps.id)}
      >
        <CustomIcon iconType={windowProps.iconType} className="mr-1 w-4 h-4" />
        <span className="flex-1 truncate">{windowProps.title}</span>
        <div className="flex space-x-1">
          <button 
            className="retro-button p-1"
            onClick={(e) => { e.stopPropagation(); minimizeWindow(windowProps.id); }}
            title="Minimize"
          >
            <Minimize className="w-3 h-3" />
          </button>
          {windowProps.maximized ? (
            <button 
              className="retro-button p-1"
              onClick={(e) => { e.stopPropagation(); restoreWindow(windowProps.id); }}
              title="Restore"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0H2C1.44772 0 1 0.447715 1 1V7C1 7.55228 1.44772 8 2 8H8C8.55228 8 9 7.55228 9 7V1C9 0.447715 8.55228 0 8 0ZM8 7H2V1H8V7ZM10 3H9V4H10V10H4V9H3V10C3 10.5523 3.44772 11 4 11H10C10.5523 11 11 10.5523 11 10V4C11 3.44772 10.5523 3 10 3Z" fill="currentColor"/>
              </svg>
            </button>
          ) : (
            <button 
              className="retro-button p-1"
              onClick={(e) => { e.stopPropagation(); maximizeWindow(windowProps.id); }}
              title="Maximize"
            >
              <Maximize className="w-3 h-3" />
            </button>
          )}
          <button 
            className="retro-button p-1"
            onClick={(e) => { e.stopPropagation(); closeWindow(windowProps.id); }}
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content area - with direct overflow styling */}
      <div className="window-content-area flex-1 overflow-auto" style={{ position: 'relative' }}>
        {windowProps.content}
      </div>
    </Rnd>
  );
};
