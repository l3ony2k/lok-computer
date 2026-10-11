import type { ReactNode } from 'react';
import {
  WindowManagerActionsContext,
  WindowManagerLaunchContext,
  WindowManagerStateContext,
  useWindowManagerController,
} from '@/hooks/useWindowManager';

export const WindowManagerProvider = ({ children }: { children: ReactNode }) => {
  const { state, actions, launchActions } = useWindowManagerController();

  return (
    <WindowManagerLaunchContext.Provider value={launchActions}>
      <WindowManagerActionsContext.Provider value={actions}>
        <WindowManagerStateContext.Provider value={state}>
          {children}
        </WindowManagerStateContext.Provider>
      </WindowManagerActionsContext.Provider>
    </WindowManagerLaunchContext.Provider>
  );
};
