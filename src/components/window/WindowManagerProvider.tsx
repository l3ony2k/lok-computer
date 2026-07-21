import {
  WindowManagerActionsContext,
  WindowManagerStateContext,
  useWindowManagerController,
} from '@/hooks/useWindowManager.ts';
import { ReactNode } from 'react';

export const WindowManagerProvider = ({ children }: { children: ReactNode }) => {
  const { state, actions } = useWindowManagerController();

  return (
    <WindowManagerActionsContext.Provider value={actions}>
      <WindowManagerStateContext.Provider value={state}>
        {children}
      </WindowManagerStateContext.Provider>
    </WindowManagerActionsContext.Provider>
  );
};
