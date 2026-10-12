import { createContext, useContext } from "react";
import type { DesktopWindow } from "@/hooks/useWindowManager";

export interface WindowTransitionContextType {
  minimizeWithTransition: (window: DesktopWindow) => void;
  restoreWithTransition: (window: DesktopWindow) => void;
  /** Rolls the window up to its title bar, or back down, with the frame animating between the two heights. */
  toggleShadeWithTransition: (window: DesktopWindow) => void;
  isWindowTransitioning: (id: string) => boolean;
}

export const WindowTransitionContext = createContext<WindowTransitionContextType | undefined>(undefined);

export const useWindowTransitions = () => {
  const context = useContext(WindowTransitionContext);
  if (!context) throw new Error("useWindowTransitions must be used within WindowTransitionProvider");
  return context;
};
