import { useState, useEffect, useCallback, useRef } from 'react';
import { Window } from '@/hooks/useWindowManager';
import { useWindowManager } from '@/hooks/useWindowManager';
import { X, Minimize, Maximize, ChevronUp } from 'lucide-react';
import { CustomIcon } from './CustomIcon';

// Define default numeric values
const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 400;

interface DraggableWindowProps {
  window: Window;
  onResizeStop: (id: string, width: number, height: number) => void;
}

export const DraggableWindow = ({ window: windowProps, onResizeStop }: DraggableWindowProps) => {
  const { closeWindow, minimizeWindow, maximizeWindow, restoreWindow, focusWindow, updateWindowPosition } = useWindowManager();
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: windowProps.x || 50, y: windowProps.y || 50 });
  const dragStartRef = useRef({ initialMouseX: 0, initialMouseY: 0, initialWindowX: 0, initialWindowY: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(() => {
    const w = windowProps.width;
    const parsed = typeof w === 'string' ? parseInt(w, 10) : w;
    return (parsed && !isNaN(parsed)) ? parsed : DEFAULT_WIDTH;
  });
  const [currentHeight, setCurrentHeight] = useState(() => {
    const h = windowProps.height;
    const parsed = typeof h === 'string' ? parseInt(h, 10) : h;
    return (parsed && !isNaN(parsed)) ? parsed : DEFAULT_HEIGHT;
  });
  const resizeStartRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  useEffect(() => {
    setPosition({ x: windowProps.x || 50, y: windowProps.y || 50 });
  }, [windowProps.x, windowProps.y]);

  const constrainPosition = useCallback((x: number, y: number) => {
    if (!windowRef.current) return { x, y };
    
    const windowWidth = windowRef.current.offsetWidth;
    const windowHeight = windowRef.current.offsetHeight; 
    const taskbarHeight = 30; 
    
    const maxX = Math.max(0, globalThis.window.innerWidth - windowWidth);
    const maxY = Math.max(0, globalThis.window.innerHeight - taskbarHeight - windowHeight);
    
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (windowProps.maximized) return;
    
    setDragging(true);
    focusWindow(windowProps.id);
    
    dragStartRef.current = {
      initialMouseX: e.clientX,
      initialMouseY: e.clientY,
      initialWindowX: position.x,
      initialWindowY: position.y,
    };
    
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging && !windowProps.maximized && dragStartRef.current) {
      const deltaX = e.clientX - dragStartRef.current.initialMouseX;
      const deltaY = e.clientY - dragStartRef.current.initialMouseY;
      const newX = dragStartRef.current.initialWindowX + deltaX;
      const newY = dragStartRef.current.initialWindowY + deltaY;
      
      const constrained = constrainPosition(newX, newY);
      setPosition(constrained);
      e.preventDefault();
    }
  }, [dragging, windowProps.maximized, constrainPosition]);

  const handleMouseUp = () => {
    if (dragging) {
      updateWindowPosition(windowProps.id, position.x, position.y);
      setDragging(false);
    }
  };

  useEffect(() => {
    if (dragging) {
      globalThis.window.addEventListener('mousemove', handleMouseMove);
      globalThis.window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        globalThis.window.removeEventListener('mousemove', handleMouseMove);
        globalThis.window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove]);

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent text selection, etc.
    e.stopPropagation(); // Prevent triggering window focus/drag
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
    };
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeStartRef.current.startX;
    const deltaY = e.clientY - resizeStartRef.current.startY;
    
    let newWidth = resizeStartRef.current.startWidth + deltaX;
    let newHeight = resizeStartRef.current.startHeight + deltaY;

    // Apply constraints
    const minWidth = 250;
    const minHeight = 300;
    // Max constraints need current position (x, y) and viewport size
    const maxWidth = window.innerWidth - position.x - 2; // -2 for borders/scrollbar estimate
    const maxHeight = window.innerHeight - position.y - 2;

    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

    setCurrentWidth(newWidth);
    setCurrentHeight(newHeight);

  }, [isResizing, position.x, position.y]); // Depend on position for max constraint calculation

  const handleResizeEnd = useCallback(() => {
    if (!isResizing) return;
    setIsResizing(false);
    // Update global state via prop
    onResizeStop(windowProps.id, currentWidth, currentHeight);
  }, [isResizing, windowProps.id, onResizeStop]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);

      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  if (windowProps.minimized) return null;

  const topBarHeight = 30; 
  const taskbarHeight = 30; 

  const windowStyle: React.CSSProperties = windowProps.maximized
    ? {
        position: "fixed",
        top: `${topBarHeight}px`, 
        left: 0,
        right: 0,
        bottom: `${taskbarHeight}px`, 
        width: "100%",
        height: `calc(100% - ${topBarHeight + taskbarHeight}px)`, 
        zIndex: windowProps.zIndex,
        boxSizing: 'border-box', // Ensure border is included in height/width
      }
    : {
        position: "absolute",
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${currentWidth}px`,
        height: `${currentHeight}px`,
        zIndex: windowProps.zIndex,
      };

  return (
    <div
      ref={windowRef}
      className={`animate-window-open flex flex-col border border-border shadow-lg ${
        dragging ? "opacity-90" : ""
      } overflow-hidden`}
      style={windowStyle}
      onClick={() => focusWindow(windowProps.id)}
    >
      <div 
        className="window-titlebar" 
        onMouseDown={handleMouseDown}
      >
        <CustomIcon iconType={windowProps.iconType} className="mr-1 w-4 h-4" />
        <span className="flex-1 truncate">{windowProps.title}</span>
        <div className="flex space-x-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(windowProps.id);
            }}
            className="hover:bg-white/20 p-1 rounded"
          >
            <Minimize className="h-3 w-3" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              windowProps.maximized ? restoreWindow(windowProps.id) : maximizeWindow(windowProps.id);
            }}
            className="hover:bg-white/20 p-1 rounded"
          >
            {windowProps.maximized ? <ChevronUp className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(windowProps.id);
            }}
            className="hover:bg-white/20 p-1 rounded"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="window-content flex-1 overflow-auto">
        {windowProps.content}
      </div>
      <div 
        className="absolute bottom-0 right-0 w-0 h-0 border-solid border-[6px] border-transparent cursor-nwse-resize z-10 border-b-retro-titlebar border-r-retro-titlebar"
        onMouseDown={handleResizeStart} 
      />
    </div>
  );
};
