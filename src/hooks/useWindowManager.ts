import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ReactNode } from "react";
import { WINDOW_DEFAULTS } from "@/config/window";
import { getAppState, setAppState, deleteAppState } from "@/lib/storage";
// Note: componentRegistry is imported dynamically to avoid circular dependency
// (componentRegistry imports apps → apps import the window hooks)

// Storage keys
const WINDOW_SESSION_KEY = 'windowSession';
// Legacy store of per-window-id positions; ids are never reused so entries
// could never be read back — cleaned up on startup.
const LEGACY_WINDOW_POSITIONS_KEY = 'windowPositions';

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

// Input for opening a window: everything caller-controlled, ids/z-index are assigned internally.
export type WindowInput = Omit<Window, "id" | "zIndex">;

export interface WindowManagerStateContextType {
  windows: Window[];
  activeWindow: string | null;
  isSessionRestored: boolean;
}

export interface WindowManagerActionsContextType {
  addWindow: (window: WindowInput) => string;
  addOrFocusWindow: (window: WindowInput & { singleInstance?: boolean }) => string;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowDimensions: (id: string, width: number, height: number) => void;
  updateWindowProps: (id: string, props: Record<string, unknown>) => void;
}

export interface WindowManagerController {
  state: WindowManagerStateContextType;
  actions: WindowManagerActionsContextType;
}

export const WindowManagerStateContext = createContext<WindowManagerStateContextType | undefined>(undefined);
export const WindowManagerActionsContext = createContext<WindowManagerActionsContextType | undefined>(undefined);

export const useWindowState = () => {
  const context = useContext(WindowManagerStateContext);
  if (!context) throw new Error("useWindowState must be used within WindowManagerProvider");
  return context;
};

export const useWindowActions = () => {
  const context = useContext(WindowManagerActionsContext);
  if (!context) throw new Error("useWindowActions must be used within WindowManagerProvider");
  return context;
};

// Monotonic suffix so windows opened within the same millisecond still get unique ids.
let windowIdCounter = 0;

export const useWindowManagerController = (): WindowManagerController => {
  const [windows, setWindows] = useState<Window[]>([]);
  const [lastZIndex, setLastZIndex] = useState(1000);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const isInitialLoad = useRef(true);
  const sessionSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowsRef = useRef<Window[]>(windows);
  const activeWindowRef = useRef<string | null>(activeWindow);
  windowsRef.current = windows;
  activeWindowRef.current = activeWindow;
  // Source of truth for z-index allocation. State updates are async, so several
  // windows opened/focused in the same tick would otherwise all read the same
  // lastZIndex and end up stacked at identical z-indexes.
  const zIndexRef = useRef(1000);

  const nextZIndex = useCallback(() => {
    zIndexRef.current += 1;
    setLastZIndex(zIndexRef.current);
    return zIndexRef.current;
  }, []);

  // Restore window session from IndexedDB on mount
  useEffect(() => {
    let mounted = true;

    const loadAndRestoreSession = async () => {
      try {
        // Clean up the legacy write-only positions store (see LEGACY_WINDOW_POSITIONS_KEY)
        deleteAppState(LEGACY_WINDOW_POSITIONS_KEY);
        try {
          localStorage.removeItem(LEGACY_WINDOW_POSITIONS_KEY);
        } catch {
          // localStorage unavailable — nothing to clean up
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
            zIndexRef.current = maxZIndex;
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

  const focusWindow = useCallback((id: string) => {
    const newZIndex = nextZIndex();

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
  }, [nextZIndex]);

  const addWindow = useCallback((window: WindowInput) => {
    windowIdCounter += 1;
    const id = `window-${Date.now()}-${windowIdCounter}`;
    const newZIndex = nextZIndex();

    setWindows((prev) => [
      ...prev,
      {
        ...window,
        id,
        zIndex: newZIndex,
        minimized: false,
        maximized: false,
        wasMaximized: false,
        x: window.x ?? Math.random() * 100,
        y: window.y ?? Math.random() * 100,
        width: window.width ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
        height: window.height ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
        minWidth: window.minWidth ?? WINDOW_DEFAULTS.MIN_WIDTH,
        minHeight: window.minHeight ?? WINDOW_DEFAULTS.MIN_HEIGHT,
      },
    ]);

    setActiveWindow(id);
    return id;
  }, [nextZIndex]);

  const addOrFocusWindow = useCallback((window: WindowInput & { singleInstance?: boolean }) => {
    // If singleInstance is true, check if a window with the same title already exists
    if (window.singleInstance) {
      const existingWindow = windowsRef.current.find(w => w.title === window.title);
      if (existingWindow) {
        // Focus the existing window and bring it to front
        focusWindow(existingWindow.id);
        return existingWindow.id;
      }
    }

    // If no existing window found or singleInstance is false, create a new window
    const { singleInstance, ...windowProps } = window; // Remove singleInstance from props
    void singleInstance;
    return addWindow(windowProps);
  }, [focusWindow, addWindow]);

  const closeWindow = useCallback((id: string) => {
    setWindows((previousWindows) => {
      const remainingWindows = previousWindows.filter((window) => window.id !== id);

      if (activeWindowRef.current === id) {
        if (remainingWindows.length > 0) {
          const highestWindow = remainingWindows.reduce((previous, current) =>
            previous.zIndex > current.zIndex ? previous : current
          );
          setActiveWindow(highestWindow.id);
        } else {
          setActiveWindow(null);
        }
      }

      return remainingWindows;
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((previousWindows) => {
      const nextWindows = previousWindows.map((window) =>
        window.id === id ? {
          ...window,
          minimized: true,
          wasMaximized: window.maximized,
          maximized: false
        } : window
      );

      const visibleWindows = nextWindows.filter((window) => !window.minimized);
      if (visibleWindows.length > 0) {
        const highestWindow = visibleWindows.reduce((previous, current) =>
          previous.zIndex > current.zIndex ? previous : current
        );
        setActiveWindow(highestWindow.id);
      } else {
        setActiveWindow(null);
      }

      return nextWindows;
    });
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, maximized: true, minimized: false } : w
      )
    );
    focusWindow(id);
  }, [focusWindow]);

  const restoreWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, maximized: false, minimized: false } : w
      )
    );
    focusWindow(id);
  }, [focusWindow]);

  const updateWindowPosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prevWindows =>
      prevWindows.map(w =>
        w.id === id ? { ...w, x, y } : w
      )
    );
  }, []);

  const updateWindowDimensions = useCallback((id: string, width: number, height: number) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, width, height } : w
      )
    );
  }, []);

  const updateWindowProps = useCallback((id: string, props: Record<string, unknown>) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, props: { ...w.props, ...props } } : w
      )
    );
  }, []);

  const state = useMemo<WindowManagerStateContextType>(() => ({
    windows,
    activeWindow,
    isSessionRestored,
  }), [windows, activeWindow, isSessionRestored]);

  const actions = useMemo<WindowManagerActionsContextType>(() => ({
    addWindow,
    addOrFocusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowDimensions,
    updateWindowProps,
  }), [
    addWindow,
    addOrFocusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowDimensions,
    updateWindowProps,
  ]);

  return useMemo(() => ({ state, actions }), [state, actions]);
};
