import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CustomIcon } from "@/components/window/CustomIcon";
import { Window, useWindowActions } from "@/hooks/useWindowManager";
import { WindowTransitionContext, type WindowTransitionContextType } from "@/hooks/useWindowTransitions";

interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface WindowTransition {
  id: string;
  title: string;
  iconType?: string;
  from: ViewportRect;
  to: ViewportRect;
  phase: "from" | "to";
}

const TRANSITION_DURATION_MS = 210;

const toViewportRect = (element: Element): ViewportRect => {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
};

const getWindowElement = (id: string) => document.querySelector(`[data-window-surface-id="${id}"]`);

const getTaskbarButton = (id: string) => document.querySelector<HTMLElement>(`[data-taskbar-window-id="${id}"]`);

const getDesktopRect = () => {
  const desktop = document.querySelector(".desktop-container");
  return desktop ? toViewportRect(desktop) : null;
};

const reducedMotionEnabled = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const WindowTransitionProvider = ({ children }: { children: ReactNode }) => {
  const { minimizeWindow, focusWindow } = useWindowActions();
  const [transition, setTransition] = useState<WindowTransition | null>(null);
  const [transitioningWindowId, setTransitioningWindowId] = useState<string | null>(null);
  const transitioningWindowRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const runTransition = useCallback((window: Window, from: ViewportRect, to: ViewportRect, commit: () => void) => {
    if (transitioningWindowRef.current) return;

    if (reducedMotionEnabled()) {
      commit();
      return;
    }

    transitioningWindowRef.current = window.id;
    setTransitioningWindowId(window.id);
    setTransition({
      id: window.id,
      title: window.title,
      iconType: window.iconType,
      from,
      to,
      phase: "from",
    });

    requestAnimationFrame(() => {
      commit();
      requestAnimationFrame(() => {
        setTransition((current) => current && current.id === window.id ? { ...current, phase: "to" } : current);
        timerRef.current = setTimeout(() => {
          setTransition(null);
          setTransitioningWindowId(null);
          transitioningWindowRef.current = null;
          timerRef.current = null;
        }, TRANSITION_DURATION_MS);
      });
    });
  }, []);

  const minimizeWithTransition = useCallback((window: Window) => {
    const source = getWindowElement(window.id);
    const taskbarButton = getTaskbarButton(window.id);
    if (!source || !taskbarButton) {
      minimizeWindow(window.id);
      return;
    }

    taskbarButton.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    requestAnimationFrame(() => {
      runTransition(window, toViewportRect(source), toViewportRect(taskbarButton), () => minimizeWindow(window.id));
    });
  }, [minimizeWindow, runTransition]);

  const restoreWithTransition = useCallback((window: Window) => {
    const taskbarButton = getTaskbarButton(window.id);
    const destinationElement = getWindowElement(window.id);
    const desktop = window.wasMaximized ? getDesktopRect() : null;
    if (!taskbarButton || (!destinationElement && !desktop)) {
      focusWindow(window.id);
      return;
    }

    taskbarButton.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    requestAnimationFrame(() => {
      const destination = desktop ?? toViewportRect(destinationElement!);
      runTransition(window, toViewportRect(taskbarButton), destination, () => focusWindow(window.id));
    });
  }, [focusWindow, runTransition]);

  const isWindowTransitioning = useCallback(
    (id: string) => transitioningWindowId === id,
    [transitioningWindowId],
  );

  const value = useMemo<WindowTransitionContextType>(() => ({
    minimizeWithTransition,
    restoreWithTransition,
    isWindowTransitioning,
  }), [isWindowTransitioning, minimizeWithTransition, restoreWithTransition]);

  const ghostRect = transition?.phase === "to" ? transition.to : transition?.from;

  return (
    <WindowTransitionContext.Provider value={value}>
      {children}
      {transition && ghostRect && (
        <div
          className="window-transition-ghost"
          style={{
            left: ghostRect.left,
            top: ghostRect.top,
            width: ghostRect.width,
            height: ghostRect.height,
          }}
          aria-hidden="true"
        >
          <div className="window-transition-ghost-titlebar">
            <CustomIcon iconType={transition.iconType} className="h-3 w-3" />
            <span>{transition.title}</span>
          </div>
        </div>
      )}
    </WindowTransitionContext.Provider>
  );
};
