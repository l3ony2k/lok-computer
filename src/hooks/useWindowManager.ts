import { createContext, useContext, useState, useEffect, useRef } from "react";
import { ReactNode } from "react";
import { WINDOW_DEFAULTS } from "@/config/window";
import { getAppState, setAppState } from "@/lib/storage";
// Note: componentRegistry is imported dynamically to avoid circular dependency
// (componentRegistry imports apps → apps import useWindowManager)

// Storage keys
const WINDOW_POSITIONS_KEY = 'windowPositions';
const WINDOW_SESSION_KEY = 'windowSession';

interface SavedWindowPositions {
  [windowId: string]: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

// Serializable window data for session persistence
export interface SerializableWindowData {
  id: string;
  title: string;
  componentType: string; // Key to look up in component registry
  iconType?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minimized?: boolean;
  maximized?: boolean;
  zIndex: number;
  props?: Record<string, unknown>; // Component-specific props (channelSlug, blockId, etc.)
}

export interface WindowSession {
  windows: SerializableWindowData[];
  lastZIndex: number;
  savedAt: number;
}

export interface Window {
  id: string;
  title: string;
  content: ReactNode;
  componentType?: string; // Track which component type this window uses
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
  props?: Record<string, unknown>; // Store original props for serialization
}

export interface WindowManagerContextType {
  windows: Window[];
  addWindow: (window: Omit<Window, "id" | "zIndex" | "minWidth" | "minHeight"> & { iconType?: string; width?: number; height?: number; x?: number; y?: number; minWidth?: number; minHeight?: number; componentType?: string; props?: Record<string, unknown>; }) => string;
  addOrFocusWindow: (window: Omit<Window, "id" | "zIndex" | "minWidth" | "minHeight"> & { iconType?: string; width?: number; height?: number; x?: number; y?: number; minWidth?: number; minHeight?: number; singleInstance?: boolean; componentType?: string; props?: Record<string, unknown>; }) => string;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  activeWindow: string | null;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowDimensions: (id: string, width: number, height: number) => void;
  updateWindowProps: (id: string, props: Record<string, unknown>) => void;
  isSessionRestored: boolean;
}

export const WindowManagerContext = createContext<WindowManagerContextType>({
  windows: [],
  addWindow: () => "",
  addOrFocusWindow: () => "",
  closeWindow: () => { },
  minimizeWindow: () => { },
  maximizeWindow: () => { },
  restoreWindow: () => { },
  focusWindow: () => { },
  activeWindow: null,
  updateWindowPosition: () => { },
  updateWindowDimensions: () => { },
  updateWindowProps: () => { },
  isSessionRestored: false,
});

export const useWindowManager = () => useContext(WindowManagerContext);

export const createWindowManagerContext = () => {
  const [windows, setWindows] = useState<Window[]>([]);
  const [lastZIndex, setLastZIndex] = useState(1000);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [savedPositions, setSavedPositions] = useState<SavedWindowPositions>({});
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const isInitialLoad = useRef(true);
  const sessionSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved positions and restore window session from IndexedDB on mount
  useEffect(() => {
    let mounted = true;

    const loadAndRestoreSession = async () => {
      try {
        // Load saved positions first
        const storedPositions = await getAppState<SavedWindowPositions>(WINDOW_POSITIONS_KEY);

        if (mounted && storedPositions) {
          setSavedPositions(storedPositions);
        } else if (mounted) {
          // Migrate from localStorage if exists
          try {
            const legacyData = localStorage.getItem('windowPositions');
            if (legacyData) {
              const parsed = JSON.parse(legacyData);
              setSavedPositions(parsed);
              await setAppState(WINDOW_POSITIONS_KEY, parsed);
              localStorage.removeItem('windowPositions');
              console.info('[WindowManager] Migrated positions from localStorage to IndexedDB');
            }
          } catch (e) {
            console.warn('[WindowManager] Failed to migrate from localStorage:', e);
          }
        }

        // Load and restore window session
        const session = await getAppState<WindowSession>(WINDOW_SESSION_KEY);

        if (mounted && session && session.windows.length > 0) {
          console.info(`[Session] Restoring ${session.windows.length} windows`);

          // Dynamic import to avoid circular dependency + use async versions
          const { getComponentConfigAsync, createComponentElementAsync } = await import("@/config/componentRegistry");

          const restoredWindows: Window[] = [];
          let maxZIndex = session.lastZIndex || 1000;

          for (const savedWindow of session.windows) {
            const componentConfig = await getComponentConfigAsync(savedWindow.componentType);

            if (componentConfig) {
              // Create a callback for this window to update its props
              const windowId = savedWindow.id;
              const onPropsChange = (newProps: Record<string, unknown>) => {
                setWindows(prev => prev.map(w =>
                  w.id === windowId ? { ...w, props: { ...w.props, ...newProps } } : w
                ));
              };

              // Create the window content from component registry with the callback
              const content = await createComponentElementAsync(
                savedWindow.componentType,
                savedWindow.props,
                onPropsChange
              );

              if (content) {
                restoredWindows.push({
                  id: savedWindow.id,
                  title: savedWindow.title,
                  content,
                  componentType: savedWindow.componentType,
                  iconType: savedWindow.iconType || componentConfig.defaultIcon,
                  x: savedWindow.x,
                  y: savedWindow.y,
                  width: savedWindow.width || componentConfig.defaultWidth,
                  height: savedWindow.height || componentConfig.defaultHeight,
                  minimized: savedWindow.minimized || false,
                  maximized: savedWindow.maximized || false,
                  wasMaximized: false,
                  zIndex: savedWindow.zIndex,
                  minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
                  minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
                  props: savedWindow.props,
                });

                if (savedWindow.zIndex > maxZIndex) {
                  maxZIndex = savedWindow.zIndex;
                }
              }
            } else {
              console.warn(`[WindowManager] Component type "${savedWindow.componentType}" not found, skipping window`);
            }
          }

          if (restoredWindows.length > 0) {
            setWindows(restoredWindows);
            setLastZIndex(maxZIndex);

            // Set the highest z-index window as active
            const topWindow = restoredWindows.reduce((prev, current) =>
              current.zIndex > prev.zIndex && !current.minimized ? current : prev
            );
            setActiveWindow(topWindow.id);

            console.info(`[WindowManager] Restored ${restoredWindows.length} windows`);
          }
        }
      } catch (error) {
        console.error('[WindowManager] Failed to restore session:', error);
      } finally {
        if (mounted) {
          isInitialLoad.current = false;
          setIsSessionRestored(true);
        }
      }
    };

    loadAndRestoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Save positions to IndexedDB whenever they change (skip initial load)
  useEffect(() => {
    if (isInitialLoad.current) {
      return;
    }

    const savePositions = async () => {
      try {
        await setAppState(WINDOW_POSITIONS_KEY, savedPositions);
      } catch (error) {
        console.error('[WindowManager] Failed to save window positions:', error);
      }
    };

    savePositions();
  }, [savedPositions]);

  // Save window session to IndexedDB whenever windows change (debounced)
  useEffect(() => {
    if (isInitialLoad.current || !isSessionRestored) {
      return;
    }

    // Clear any pending save
    if (sessionSaveTimeout.current) {
      clearTimeout(sessionSaveTimeout.current);
    }

    // Debounce session saving to avoid excessive writes
    sessionSaveTimeout.current = setTimeout(async () => {
      try {
        // Serialize windows (only those with componentType can be restored)
        const serializableWindows: SerializableWindowData[] = windows
          .filter(w => w.componentType) // Only save windows that can be restored
          .map(w => ({
            id: w.id,
            title: w.title,
            componentType: w.componentType!,
            iconType: w.iconType,
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
            minimized: w.minimized,
            maximized: w.maximized,
            zIndex: w.zIndex,
            props: w.props,
          }));

        const session: WindowSession = {
          windows: serializableWindows,
          lastZIndex,
          savedAt: Date.now(),
        };

        await setAppState(WINDOW_SESSION_KEY, session);
        console.debug(`[WindowManager] Saved session with ${serializableWindows.length} windows`);
      } catch (error) {
        console.error('[WindowManager] Failed to save window session:', error);
      }
    }, 500); // 500ms debounce

    return () => {
      if (sessionSaveTimeout.current) {
        clearTimeout(sessionSaveTimeout.current);
      }
    };
  }, [windows, lastZIndex, isSessionRestored]);

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

  const updateWindowProps = (id: string, props: Record<string, unknown>) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, props: { ...w.props, ...props } } : w
      )
    );
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
    updateWindowProps,
    isSessionRestored,
  };
};
