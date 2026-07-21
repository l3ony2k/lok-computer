import { createContext, useContext } from "react";
import type { Window } from "@/hooks/useWindowManager";

export interface WindowTransitionContextType {
  minimizeWithTransition: (window: Window) => void;
  restoreWithTransition: (window: Window) => void;
  isWindowTransitioning: (id: string) => boolean;
}

export const WindowTransitionContext = createContext<WindowTransitionContextType | undefined>(undefined);

export const useWindowTransitions = () => {
  const context = useContext(WindowTransitionContext);
  if (!context) throw new Error("useWindowTransitions must be used within WindowTransitionProvider");
  return context;
};
