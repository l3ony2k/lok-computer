import React from 'react';
import { useWindowState } from '@/hooks/useWindowManager';
import { OfflineReadout, SearchButton, SystemClock, SystemMenuButton } from './SystemMenu';

/** Name of the frontmost window, shown like an application menu by menu-bar themes. */
const ActiveWindowName: React.FC = () => {
  const { windows, activeWindow } = useWindowState();
  const active = windows.find((window) => window.id === activeWindow && !window.minimized);
  if (!active) return null;
  return <span className="app-header-active" aria-hidden="true">{active.title}</span>;
};

/** Top bar for the lok layout; classic layouts move these controls into the taskbar. */
export const TopBar: React.FC = React.memo(() => (
  <div className="app-header h-[35px] text-sm flex items-center select-none">
    <div className="app-header-start flex items-center min-w-0">
      <SystemMenuButton placement="top" />
      <ActiveWindowName />
    </div>

    <div className="ml-auto flex items-center gap-2 text-sm select-none">
      <OfflineReadout />
      <SearchButton placement="top" />
      <SystemClock placement="top" />
    </div>
  </div>
));
