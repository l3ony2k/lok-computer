import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { WINDOW_DEFAULTS } from "@/config/window";
import { createApplicationElement, getApplicationDefinition } from "@/config/apps";
import { getAppState, setAppState, deleteAppState } from "@/lib/storage";

// Storage keys
const WINDOW_SESSION_KEY = 'windowSession';
// Legacy store of per-window-id positions; ids are never reused so entries
// could never be read back — cleaned up on startup.
const LEGACY_WINDOW_POSITIONS_KEY = 'windowPositions';
const SESSION_SAVE_DEBOUNCE_MS = 500;
const FIRST_Z_INDEX = 1000;

// Serializable window data for session persistence
export interface SerializableWindowData {
  id: string;
  title: string;
  componentType: string; // Key to look up in the Application catalog
  iconType?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minimized?: boolean;
  maximized?: boolean;
  shaded?: boolean;
  zIndex: number;
  props?: Record<string, unknown>; // Component-specific props (channelSlug, blockId, etc.)
}

export interface WindowSession {
  windows: SerializableWindowData[];
  lastZIndex: number;
  savedAt: number;
}

/**
 * A live desktop window. Named DesktopWindow so it never shadows the global
 * `window` object in the many places that iterate over windows.
 */
export interface DesktopWindow {
  id: string;
  title: string;
  content: ReactNode;
  componentType?: string; // Which Application this window runs
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  minimized?: boolean;
  maximized?: boolean;
  /** Rolled up to its title bar (window shade). */
  shaded?: boolean;
  wasMaximized?: boolean;
  zIndex: number;
  iconType?: string;
  props?: Record<string, unknown>; // Launch props, kept for serialization and Share Window
}

// Input for opening a window: everything caller-controlled, ids/z-index are assigned internally.
export type WindowInput = Omit<DesktopWindow, "id" | "zIndex">;

export interface WindowManagerStateContextType {
  windows: DesktopWindow[];
  activeWindow: string | null;
  isSessionRestored: boolean;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowManagerActionsContextType {
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  /** Rolls the window up to its title bar, or back down. */
  toggleWindowShade: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowDimensions: (id: string, width: number, height: number) => void;
  /** Position and size in one update (snapping), leaving maximized and shaded states. */
  updateWindowBounds: (id: string, bounds: Partial<WindowBounds>) => void;
  updateWindowProps: (id: string, props: Record<string, unknown>) => void;
}

export interface WindowLaunchInput extends WindowInput {
  singleInstance?: boolean;
  /**
   * When a single-instance window already exists, replace its content and
   * merge its props so the running app receives the new launch props.
   */
  deliverProps?: boolean;
}

export interface WindowManagerLaunchContextType {
  addOrFocusWindow: (window: WindowLaunchInput) => string;
}

export interface WindowManagerController {
  state: WindowManagerStateContextType;
  actions: WindowManagerActionsContextType;
  launchActions: WindowManagerLaunchContextType;
}

export const WindowManagerStateContext = createContext<WindowManagerStateContextType | undefined>(undefined);
export const WindowManagerActionsContext = createContext<WindowManagerActionsContextType | undefined>(undefined);
export const WindowManagerLaunchContext = createContext<WindowManagerLaunchContextType | undefined>(undefined);

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

export const useWindowLaunchActions = () => {
  const context = useContext(WindowManagerLaunchContext);
  if (!context) throw new Error("useWindowLaunchActions must be used within WindowManagerProvider");
  return context;
};

// Monotonic suffix so windows opened within the same millisecond still get unique ids.
let windowIdCounter = 0;

/** The frontmost of these windows, or null when there are none. */
const topmost = (windows: DesktopWindow[]) => (
  windows.reduce<DesktopWindow | null>((top, candidate) => (
    !top || candidate.zIndex > top.zIndex ? candidate : top
  ), null)
);

export const useWindowManagerController = (): WindowManagerController => {
  const [windows, setWindows] = useState<DesktopWindow[]>([]);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const sessionSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowsRef = useRef<DesktopWindow[]>(windows);
  const activeWindowRef = useRef<string | null>(activeWindow);
  windowsRef.current = windows;
  activeWindowRef.current = activeWindow;
  // Source of truth for z-index allocation. State updates are async, so several
  // windows opened/focused in the same tick would otherwise all read the same
  // value and end up stacked at identical z-indexes.
  const zIndexRef = useRef(FIRST_Z_INDEX);

  const nextZIndex = useCallback(() => {
    zIndexRef.current += 1;
    return zIndexRef.current;
  }, []);

  // Restore window session from IndexedDB on mount
  useEffect(() => {
    let mounted = true;

    const loadAndRestoreSession = async () => {
      try {
        // Clean up the legacy write-only positions store (see LEGACY_WINDOW_POSITIONS_KEY)
        void deleteAppState(LEGACY_WINDOW_POSITIONS_KEY);
        try {
          localStorage.removeItem(LEGACY_WINDOW_POSITIONS_KEY);
        } catch {
          // localStorage unavailable — nothing to clean up
        }

        const session = await getAppState<WindowSession>(WINDOW_SESSION_KEY);
        if (!mounted || !session || session.windows.length === 0) return;

        console.info(`[Session] Restoring ${session.windows.length} windows`);

        const restoredWindows: DesktopWindow[] = [];
        let maxZIndex = session.lastZIndex || FIRST_Z_INDEX;

        for (const savedWindow of session.windows) {
          const application = getApplicationDefinition(savedWindow.componentType);
          if (!application) {
            console.warn(`[WindowManager] Component type "${savedWindow.componentType}" not found, skipping window`);
            continue;
          }

          // Create a callback for this window to update its props
          const windowId = savedWindow.id;
          const onPropsChange = (newProps: Record<string, unknown>) => {
            setWindows(prev => prev.map(w =>
              w.id === windowId ? { ...w, props: { ...w.props, ...newProps } } : w
            ));
          };

          const content = createApplicationElement(savedWindow.componentType, savedWindow.props, onPropsChange);
          if (!content) continue;

          restoredWindows.push({
            id: savedWindow.id,
            title: savedWindow.title,
            content,
            componentType: savedWindow.componentType,
            iconType: savedWindow.iconType || application.iconType,
            x: savedWindow.x,
            y: savedWindow.y,
            width: savedWindow.width || application.defaultWidth,
            height: savedWindow.height || application.defaultHeight,
            minimized: savedWindow.minimized || false,
            maximized: savedWindow.maximized || false,
            shaded: savedWindow.shaded || false,
            wasMaximized: false,
            zIndex: savedWindow.zIndex,
            minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
            minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
            props: savedWindow.props,
          });
          maxZIndex = Math.max(maxZIndex, savedWindow.zIndex);
        }

        if (restoredWindows.length > 0) {
          setWindows(restoredWindows);
          zIndexRef.current = maxZIndex;
          setActiveWindow(topmost(restoredWindows.filter((w) => !w.minimized))?.id ?? null);
          console.info(`[WindowManager] Restored ${restoredWindows.length} windows`);
        }
      } catch (error) {
        console.error('[WindowManager] Failed to restore session:', error);
      } finally {
        if (mounted) setIsSessionRestored(true);
      }
    };

    void loadAndRestoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Save window session to IndexedDB whenever windows change (debounced)
  useEffect(() => {
    if (!isSessionRestored) return;

    if (sessionSaveTimeout.current) clearTimeout(sessionSaveTimeout.current);

    sessionSaveTimeout.current = setTimeout(async () => {
      try {
        // Only windows backed by an Application can be restored
        const serializableWindows: SerializableWindowData[] = windows
          .filter(w => w.componentType)
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
            shaded: w.shaded,
            zIndex: w.zIndex,
            props: w.props,
          }));

        const session: WindowSession = {
          windows: serializableWindows,
          lastZIndex: zIndexRef.current,
          savedAt: Date.now(),
        };

        await setAppState(WINDOW_SESSION_KEY, session);
        console.debug(`[WindowManager] Saved session with ${serializableWindows.length} windows`);
      } catch (error) {
        console.error('[WindowManager] Failed to save window session:', error);
      }
    }, SESSION_SAVE_DEBOUNCE_MS);

    return () => {
      if (sessionSaveTimeout.current) clearTimeout(sessionSaveTimeout.current);
    };
  }, [windows, isSessionRestored]);

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

  const addOrFocusWindow = useCallback((window: WindowLaunchInput) => {
    // Single-instance windows are identified by Application type; titles can collide
    // (an Are.na channel named "Media") or drift (sessions saved under an old app name).
    if (window.singleInstance) {
      const existingWindow = windowsRef.current.find((w) => (
        window.componentType ? w.componentType === window.componentType : w.title === window.title
      ));
      if (existingWindow) {
        if (window.deliverProps) {
          // Same component type re-renders in place, so app state survives and sees the new props.
          setWindows((prev) => prev.map((w) => (
            w.id === existingWindow.id
              ? { ...w, content: window.content, props: { ...w.props, ...window.props } }
              : w
          )));
        }
        focusWindow(existingWindow.id);
        return existingWindow.id;
      }
    }

    const { singleInstance: _singleInstance, deliverProps: _deliverProps, ...windowProps } = window;
    return addWindow(windowProps);
  }, [focusWindow, addWindow]);

  const closeWindow = useCallback((id: string) => {
    setWindows((previousWindows) => {
      const remainingWindows = previousWindows.filter((window) => window.id !== id);
      if (activeWindowRef.current === id) {
        setActiveWindow(topmost(remainingWindows.filter((w) => !w.minimized))?.id ?? null);
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
      setActiveWindow(topmost(nextWindows.filter((w) => !w.minimized))?.id ?? null);
      return nextWindows;
    });
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, maximized: true, minimized: false, shaded: false } : w
      )
    );
    focusWindow(id);
  }, [focusWindow]);

  const toggleWindowShade = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, shaded: !w.shaded, minimized: false } : w
      )
    );
    focusWindow(id);
  }, [focusWindow]);

  const restoreWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, maximized: false, minimized: false, shaded: false } : w
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

  const updateWindowBounds = useCallback((id: string, bounds: Partial<WindowBounds>) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, ...bounds } : w
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
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    toggleWindowShade,
    focusWindow,
    updateWindowPosition,
    updateWindowDimensions,
    updateWindowBounds,
    updateWindowProps,
  }), [
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    toggleWindowShade,
    focusWindow,
    updateWindowPosition,
    updateWindowDimensions,
    updateWindowBounds,
    updateWindowProps,
  ]);

  const launchActions = useMemo<WindowManagerLaunchContextType>(() => ({
    addOrFocusWindow,
  }), [addOrFocusWindow]);

  return useMemo(() => ({ state, actions, launchActions }), [state, actions, launchActions]);
};
