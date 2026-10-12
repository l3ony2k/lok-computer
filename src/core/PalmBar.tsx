import React, { useRef } from 'react';
import { Home } from 'lucide-react';
import { useWindowActions, useWindowState } from '@/hooks/useWindowManager';
import { useWindowTransitions } from '@/hooks/useWindowTransitions';
import { CustomIcon } from '@/components/window/CustomIcon';
import { useScrollFade } from '@/hooks/useScrollFade';
import { useWheelScroll } from '@/hooks/useWheelScroll';
import { OfflineReadout, SearchButton, SystemClock, SystemMenuButton } from './SystemMenu';

/**
 * The palm layout's top bar: the system menu, the name of the window on
 * screen, search and the clock. One window shows at a time, so the bar is the
 * app's title bar as much as the desktop's.
 */
export const PalmBar: React.FC = React.memo(() => {
  const { windows, activeWindow } = useWindowState();
  const active = windows.find((window) => window.id === activeWindow && !window.minimized);
  return (
    <div className="app-header palm-bar text-sm flex items-center select-none">
      <div className="app-header-start flex items-center min-w-0">
        <SystemMenuButton placement="top" />
        <span className="palm-bar-title truncate" aria-live="polite">{active?.title ?? 'lok.computer'}</span>
      </div>
      <div className="ml-auto flex items-center gap-2 text-sm select-none">
        <OfflineReadout />
        <SearchButton placement="top" />
        <SystemClock placement="top" />
      </div>
    </div>
  );
});

/**
 * The palm layout's bottom tab bar: Home shows the app grid (every window
 * steps aside), one tab per open window brings it to the screen. Tabs carry
 * the taskbar id so minimize animations still have somewhere to fly to.
 */
export const PalmTabBar: React.FC = () => {
  const { windows, activeWindow } = useWindowState();
  const { focusWindow, minimizeWindow } = useWindowActions();
  const { restoreWithTransition } = useWindowTransitions();
  const onScreen = windows.some((window) => window.id === activeWindow && !window.minimized);
  const tabsRef = useRef<HTMLDivElement>(null);
  useScrollFade(tabsRef);
  useWheelScroll(tabsRef);

  const goHome = () => {
    windows.forEach((window) => {
      if (!window.minimized) minimizeWindow(window.id);
    });
  };

  return (
    <nav className="palm-tabbar flex items-stretch select-none" aria-label="Open apps">
      <button
        type="button"
        className="palm-tab palm-tab-home"
        aria-pressed={!onScreen}
        data-active={!onScreen || undefined}
        onClick={goHome}
        title="Home"
      >
        <Home className="w-4 h-4" aria-hidden="true" />
        <span>Home</span>
      </button>
      <div ref={tabsRef} className="palm-tabs flex items-stretch min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {windows.map((window) => {
          const current = window.id === activeWindow && !window.minimized;
          return (
            <button
              key={window.id}
              type="button"
              className="palm-tab"
              data-taskbar-window-id={window.id}
              data-active={current || undefined}
              aria-pressed={current}
              onClick={() => {
                if (window.minimized) restoreWithTransition(window);
                else focusWindow(window.id);
              }}
              title={window.title}
            >
              <CustomIcon iconType={window.iconType} className="w-4 h-4" />
              <span className="truncate">{window.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
