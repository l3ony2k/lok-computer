import {
  WindowManagerActionsContext,
  WindowManagerLaunchContext,
  WindowManagerStateContext,
  useWindowManagerController,
} from '@/hooks/useWindowManager.ts';
import { ReactNode } from 'react';

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
