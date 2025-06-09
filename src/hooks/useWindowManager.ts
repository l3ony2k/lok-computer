import { createContext, useContext, useState, useEffect } from "react";
import { ReactNode } from "react";
import { WINDOW_DEFAULTS } from "@/config/window";

export interface Window {
  id: string;
  title: string;
  content: ReactNode;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  minimized?: boolean;
  maximized?: boolean;
  wasMaximized?: boolean;
  zIndex: number;
  iconType?: string;
}

export interface WindowManagerContextType {
  windows: Window[];
  addWindow: (window: Omit<Window, "id" | "zIndex" | "minWidth" | "minHeight"> & { iconType?: string; width?: number; height?: number; x?: number; y?: number; minWidth?: number; minHeight?: number; }) => string;
  addOrFocusWindow: (window: Omit<Window, "id" | "zIndex" | "minWidth" | "minHeight"> & { iconType?: string; width?: number; height?: number; x?: number; y?: number; minWidth?: number; minHeight?: number; singleInstance?: boolean; }) => string;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  activeWindow: string | null;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowDimensions: (id: string, width: number, height: number) => void;
}

export const WindowManagerContext = createContext<WindowManagerContextType>({
  windows: [],
  addWindow: () => "",
  addOrFocusWindow: () => "",
  closeWindow: () => {},
  minimizeWindow: () => {},
  maximizeWindow: () => {},
  restoreWindow: () => {},
  focusWindow: () => {},
  activeWindow: null,
  updateWindowPosition: () => {},
  updateWindowDimensions: () => {},
});

export const useWindowManager = () => useContext(WindowManagerContext);

export const createWindowManagerContext = () => {
  const loadSavedWindows = () => {
    try {
      const saved = localStorage.getItem('windowPositions');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to load window positions:', e);
      return {};
    }
  };

  const [windows, setWindows] = useState<Window[]>([]);
  const [lastZIndex, setLastZIndex] = useState(1000);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [savedPositions, setSavedPositions] = useState(loadSavedWindows());

  useEffect(() => {
    localStorage.setItem('windowPositions', JSON.stringify(savedPositions));
  }, [savedPositions]);

  const addWindow = (window: Omit<Window, "id" | "zIndex" | "minWidth" | "minHeight"> & { iconType?: string; width?: number; height?: number; x?: number; y?: number; minWidth?: number; minHeight?: number; }) => {
    const id = `window-${Date.now()}`;
    const newZIndex = lastZIndex + 1;
    setLastZIndex(newZIndex);
    
    const savedPosition = savedPositions[id] || {};
    
    // Initial dimensions and position (could be refined with viewport logic later)
    const initialX = window.x ?? savedPosition.x ?? Math.random() * 100;
    const initialY = window.y ?? savedPosition.y ?? Math.random() * 100;
    const initialWidth = window.width ?? savedPosition.width ?? WINDOW_DEFAULTS.DEFAULT_WIDTH;
    const initialHeight = window.height ?? savedPosition.height ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT;
    const minWidth = window.minWidth ?? WINDOW_DEFAULTS.MIN_WIDTH;
    const minHeight = window.minHeight ?? WINDOW_DEFAULTS.MIN_HEIGHT;
    
    setWindows((prev) => [
      ...prev,
      {
        ...window,
        id,
        zIndex: newZIndex,
        minimized: false,
        maximized: false,
        wasMaximized: false,
        x: initialX,
        y: initialY,
        width: initialWidth,
        height: initialHeight,
        minWidth: minWidth,
        minHeight: minHeight,
      },
    ]);
    
    setActiveWindow(id);
    return id;
  };

  const addOrFocusWindow = (window: Omit<Window, "id" | "zIndex" | "minWidth" | "minHeight"> & { iconType?: string; width?: number; height?: number; x?: number; y?: number; minWidth?: number; minHeight?: number; singleInstance?: boolean; }) => {
    // If singleInstance is true, check if a window with the same title already exists
    if (window.singleInstance) {
      const existingWindow = windows.find(w => w.title === window.title);
      if (existingWindow) {
        // Focus the existing window and bring it to front
        focusWindow(existingWindow.id);
        return existingWindow.id;
      }
    }
    
    // If no existing window found or singleInstance is false, create a new window
    const { singleInstance, ...windowProps } = window; // Remove singleInstance from props
    return addWindow(windowProps);
  };

  const updateWindowPosition = (id: string, x: number, y: number) => {
    // Update the main windows state first
    setWindows(prevWindows =>
      prevWindows.map(w => 
        w.id === id ? { ...w, x, y } : w
      )
    );
    // Then update the saved positions for persistence
    setSavedPositions(prevSaved => ({
      ...prevSaved,
      [id]: { ...(prevSaved[id] || {}), x, y } // Ensure other saved props like width/height aren't lost if they exist
    }));
  };

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    if (activeWindow === id) {
      const remainingWindows = windows.filter((w) => w.id !== id);
      if (remainingWindows.length > 0) {
        const highestWindow = remainingWindows.reduce((prev, current) => 
          prev.zIndex > current.zIndex ? prev : current
        );
        setActiveWindow(highestWindow.id);
      } else {
        setActiveWindow(null);
      }
    }
  };

  const minimizeWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { 
          ...w, 
          minimized: true, 
          wasMaximized: w.maximized, 
          maximized: false 
        } : w
      )
    );
    
    const visibleWindows = windows.filter(w => !w.minimized && w.id !== id);
    if (visibleWindows.length > 0) {
      const highestWindow = visibleWindows.reduce((prev, current) => 
        prev.zIndex > current.zIndex ? prev : current
      );
      setActiveWindow(highestWindow.id);
    } else {
      setActiveWindow(null);
    }
  };

  const maximizeWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, maximized: true, minimized: false } : w
      )
    );
    focusWindow(id);
  };

  const restoreWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, maximized: false, minimized: false } : w
      )
    );
    focusWindow(id);
  };

  const focusWindow = (id: string) => {
    const newZIndex = lastZIndex + 1;
    setLastZIndex(newZIndex);
    
    setWindows((prev) =>
      prev.map((w) => (
        w.id === id 
          ? { 
              ...w, 
              zIndex: newZIndex, 
              minimized: false, 
              maximized: w.wasMaximized || w.maximized, 
              wasMaximized: false 
            } 
          : w
      ))
    );
    
    setActiveWindow(id);
  };

  const updateWindowDimensions = (id: string, width: number, height: number) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, width, height } : w
      )
    );
    // Also update saved positions dimensions
    setSavedPositions(prevSaved => ({
        ...prevSaved,
        [id]: { ...(prevSaved[id] || {}), width, height } // Save dimensions too
      }));
  };

  return {
    windows,
    addWindow,
    addOrFocusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    activeWindow,
    updateWindowPosition,
    updateWindowDimensions,
  };
};
