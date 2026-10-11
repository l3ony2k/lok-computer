import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useWindowActions, useWindowState, type DesktopWindow } from '@/hooks/useWindowManager';
import { DraggableWindow } from './DraggableWindow';
import { useWindowTransitions } from '@/hooks/useWindowTransitions';
import { DEFAULT_WINDOW_SETTINGS, useUserSettings } from '@/hooks/useUserSettings';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';

export const WindowContainer = () => {
  const { windows, activeWindow } = useWindowState();
  const { maximizeWindow, restoreWindow, toggleWindowShade } = useWindowActions();
  const { isWindowTransitioning } = useWindowTransitions();
  const { settings, updateSetting } = useUserSettings();
  const openApplication = useApplicationLauncher();
  // Read through a ref so the handler stays stable and memoized windows do not re-render on every setting change.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Double-click on a title bar: maximize by default, or shade (Config › Desktop).
  // The first time it maximizes, a toast mentions the alternative once.
  const handleTitleDoubleClick = useCallback((window: DesktopWindow) => {
    const prefs = { ...DEFAULT_WINDOW_SETTINGS, ...settingsRef.current.windows };
    if (window.shaded || prefs.titleDoubleClick === 'shade') {
      toggleWindowShade(window.id);
    } else if (window.maximized) {
      restoreWindow(window.id);
    } else {
      maximizeWindow(window.id);
    }

    if (prefs.titleDoubleClick === 'maximize' && !prefs.shadeHintShown) {
      updateSetting('windows', { ...prefs, shadeHintShown: true });
      toast('Double-clicking can also shade a window', {
        description: 'Roll a window up to its title bar instead of maximizing it.',
        duration: 8000,
        action: {
          label: 'Config',
          onClick: () => openApplication('Config', { props: { initialCategory: 'desktop', focusSetting: 'title-double-click' } }),
        },
      });
    }
  }, [maximizeWindow, openApplication, restoreWindow, toggleWindowShade, updateSetting]);

  return (
    <div className="window-layer h-full w-full relative">
      {windows.map((window) => (
        <DraggableWindow
          key={window.id}
          window={window}
          isActive={activeWindow === window.id}
          isTransitioning={isWindowTransitioning(window.id)}
          onTitleDoubleClick={handleTitleDoubleClick}
        />
      ))}
    </div>
  );
};
