import { WindowManagerContext, createWindowManagerContext } from '@/hooks/useWindowManager.ts';
import { ReactNode } from 'react';

export const WindowManagerProvider = ({ children }: { children: ReactNode }) => {
  const windowManager = createWindowManagerContext();

  return (
    <WindowManagerContext.Provider value={windowManager}>
      {children}
    </WindowManagerContext.Provider>
  );
};
