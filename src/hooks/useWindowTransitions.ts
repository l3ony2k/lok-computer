import { createContext, useContext } from "react";
import type { DesktopWindow } from "@/hooks/useWindowManager";

export interface WindowTransitionContextType {
  minimizeWithTransition: (window: DesktopWindow) => void;
  restoreWithTransition: (window: DesktopWindow) => void;
  isWindowTransitioning: (id: string) => boolean;
}

export const WindowTransitionContext = createContext<WindowTransitionContextType | undefined>(undefined);

export const useWindowTransitions = () => {
  const context = useContext(WindowTransitionContext);
  if (!context) throw new Error("useWindowTransitions must be used within WindowTransitionProvider");
  return context;
};
