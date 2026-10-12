import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { scrollIntoViewWithin } from "@/lib/utils";
import { CustomIcon } from "@/components/window/CustomIcon";
import { useWindowActions, type DesktopWindow } from "@/hooks/useWindowManager";
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
const TRANSITION_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

interface ShadeGeometry {
  height: number;
  tabWidth: number;
  contentHeight: number;
}

const measureShade = (surface: HTMLElement, titlebar: HTMLElement, content: HTMLElement | null): ShadeGeometry => ({
  height: surface.getBoundingClientRect().height,
  tabWidth: titlebar.getBoundingClientRect().width,
  contentHeight: content?.getBoundingClientRect().height ?? 0,
});

/** Tweens the real frame between its unshaded and shaded geometry; the content stays mounted, pinned and clipped. */
const animateShade = (
  surface: HTMLElement,
  titlebar: HTMLElement,
  content: HTMLElement | null,
  from: ShadeGeometry,
  to: ShadeGeometry,
  pinnedContentHeight: number,
  onDone: () => void,
) => {
  const options: KeyframeAnimationOptions = { duration: TRANSITION_DURATION_MS, easing: TRANSITION_EASING, fill: "forwards" };
  if (content) {
    content.style.height = `${pinnedContentHeight}px`;
    content.style.flex = "0 0 auto";
  }
  const animations = [surface.animate([{ height: `${from.height}px` }, { height: `${to.height}px` }], options)];
  const tabMoves = Math.abs(from.tabWidth - to.tabWidth) > 0.5;
  if (tabMoves) {
    // The BeOS tab's max-width (the frame less the zoom box) would clamp the tween short of the shaded full width.
    titlebar.style.maxWidth = "none";
    animations.push(titlebar.animate([{ width: `${from.tabWidth}px` }, { width: `${to.tabWidth}px` }], options));
  }
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onDone();
    animations.forEach((animation) => animation.cancel());
    if (tabMoves) titlebar.style.maxWidth = "";
    if (content) {
      content.style.height = "";
      content.style.flex = "";
    }
  };
  animations[0].onfinish = finish;
  animations[0].oncancel = finish;
  return finish;
};

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
  const { minimizeWindow, focusWindow, toggleWindowShade } = useWindowActions();
  const [transition, setTransition] = useState<WindowTransition | null>(null);
  const [transitioningWindowId, setTransitioningWindowId] = useState<string | null>(null);
  const transitioningWindowRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const runTransition = useCallback((window: DesktopWindow, from: ViewportRect, to: ViewportRect, commit: () => void) => {
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

  const minimizeWithTransition = useCallback((window: DesktopWindow) => {
    const source = getWindowElement(window.id);
    const taskbarButton = getTaskbarButton(window.id);
    if (!source || !taskbarButton) {
      minimizeWindow(window.id);
      return;
    }

    scrollIntoViewWithin(taskbarButton, { inline: "nearest" });
    requestAnimationFrame(() => {
      runTransition(window, toViewportRect(source), toViewportRect(taskbarButton), () => minimizeWindow(window.id));
    });
  }, [minimizeWindow, runTransition]);

  const restoreWithTransition = useCallback((window: DesktopWindow) => {
    const taskbarButton = getTaskbarButton(window.id);
    const destinationElement = getWindowElement(window.id);
    const desktop = window.wasMaximized ? getDesktopRect() : null;
    if (!taskbarButton || (!destinationElement && !desktop)) {
      focusWindow(window.id);
      return;
    }

    scrollIntoViewWithin(taskbarButton, { inline: "nearest" });
    requestAnimationFrame(() => {
      const destination = desktop ?? toViewportRect(destinationElement!);
      runTransition(window, toViewportRect(taskbarButton), destination, () => focusWindow(window.id));
    });
  }, [focusWindow, runTransition]);

  // Shade: the real frame rolls up to its title bar (and back down) in
  // place. A ghost would swap the title bar for a stand-in, so the frame
  // itself tweens: its surface height, the pinned and clipped content, and
  // on BeOS the tab width (a shaded tab spans the frame). The state flips at
  // the end of a shade and at the start of an unshade, in the same task as
  // the measurements, so no frame shows either jump.
  const toggleShadeWithTransition = useCallback((window: DesktopWindow) => {
    const surface = getWindowElement(window.id) as HTMLElement | null;
    const frame = surface?.parentElement;
    const titlebar = surface?.querySelector<HTMLElement>(".window-titlebar");
    if (!surface || !frame || !titlebar || transitioningWindowRef.current || reducedMotionEnabled()) {
      if (!transitioningWindowRef.current) toggleWindowShade(window.id);
      return;
    }
    const content = surface.querySelector<HTMLElement>(":scope > .window-content-area");
    const commit = () => flushSync(() => toggleWindowShade(window.id));
    transitioningWindowRef.current = window.id;
    const release = () => { transitioningWindowRef.current = null; };

    if (window.shaded) {
      const from = measureShade(surface, titlebar, content);
      commit();
      const to = measureShade(surface, titlebar, content);
      animateShade(surface, titlebar, content, from, to, to.contentHeight, release);
      return;
    }

    const from = measureShade(surface, titlebar, content);
    // Trial the shaded geometry without committing: the class alone lays the frame out as shaded.
    frame.classList.add("is-shaded");
    const to = measureShade(surface, titlebar, null);
    frame.classList.remove("is-shaded");
    animateShade(surface, titlebar, content, from, to, from.contentHeight, () => {
      commit();
      release();
    });
  }, [toggleWindowShade]);

  const isWindowTransitioning = useCallback(
    (id: string) => transitioningWindowId === id,
    [transitioningWindowId],
  );

  const value = useMemo<WindowTransitionContextType>(() => ({
    minimizeWithTransition,
    restoreWithTransition,
    toggleShadeWithTransition,
    isWindowTransitioning,
  }), [isWindowTransitioning, minimizeWithTransition, restoreWithTransition, toggleShadeWithTransition]);

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
