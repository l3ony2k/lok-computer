import { createContext, useContext, useState, useEffect } from "react";
import { ReactNode } from "react";

export interface Window {
  id: string;
  title: string;
  content: ReactNode;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minimized?: boolean;
  maximized?: boolean;
  zIndex: number;
  iconType?: string;
}

interface WindowManagerContextType {
  windows: Window[];
  addWindow: (window: Omit<Window, "id" | "zIndex"> & { iconType?: string }) => string;
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

  const addWindow = (window: Omit<Window, "id" | "zIndex"> & { iconType?: string }) => {
    const id = `window-${Date.now()}`;
    const newZIndex = lastZIndex + 1;
    setLastZIndex(newZIndex);
    
    const savedPosition = savedPositions[id] || {};
    
    setWindows((prev) => [
      ...prev,
      {
        ...window,
        id,
        zIndex: newZIndex,
        minimized: false,
        maximized: false,
        x: savedPosition.x ?? Math.random() * 100,
        y: savedPosition.y ?? Math.random() * 100,
      },
    ]);
    
    setActiveWindow(id);
    return id;
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
        w.id === id ? { ...w, minimized: true, maximized: false } : w
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
      prev.map((w) => (w.id === id ? { ...w, zIndex: newZIndex, minimized: false } : w))
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
