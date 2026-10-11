import { useCallback } from 'react';
import { createApplicationElement, getApplicationDefinition } from '@/config/apps';
import { WINDOW_DEFAULTS } from '@/config/window';
import { useWindowActions, useWindowLaunchActions } from '@/hooks/useWindowManager';
import { trackEvent } from '@/lib/analytics';
import { recordRecent } from '@/lib/recentApps';

export interface ApplicationLaunchOptions {
  title?: string;
  props?: Record<string, unknown>;
  iconType?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  singleInstance?: boolean;
}

/**
 * Deep application-launch module.
 *
 * Callers provide application identity and domain props. Runtime rendering,
 * window defaults, restoration identity, and single-instance behavior remain
 * behind this interface.
 */
export const useApplicationLauncher = () => {
  const { addOrFocusWindow } = useWindowLaunchActions();
  const { updateWindowProps } = useWindowActions();

  return useCallback((componentType: string, options: ApplicationLaunchOptions = {}) => {
    const application = getApplicationDefinition(componentType);
    if (!application) {
      console.warn(`[ApplicationLauncher] Unknown application type: ${componentType}`);
      return null;
    }

    const props = {
      ...application.defaultProps,
      ...options.props,
    };
    // Apps report shareable view state through onPropsChange; the id is bound once the window exists.
    let windowId: string | null = null;
    const onPropsChange = (nextProps: Record<string, unknown>) => {
      if (windowId) updateWindowProps(windowId, nextProps);
    };
    const content = createApplicationElement(componentType, props, onPropsChange);
    if (!content) return null;
    trackEvent('open-app', { app: application.componentType });
    const title = options.title ?? application.name;
    const iconType = options.iconType ?? application.iconType;
    recordRecent({ componentType: application.componentType, title, iconType, props });

    windowId = addOrFocusWindow({
      title,
      content,
      componentType: application.componentType,
      iconType,
      width: options.width ?? application.defaultWidth ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
      height: options.height ?? application.defaultHeight ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
      minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
      minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
      singleInstance: options.singleInstance ?? application.singleInstance,
      deliverProps: options.props !== undefined,
      props,
      x: options.x,
      y: options.y,
    });
    return windowId;
  }, [addOrFocusWindow, updateWindowProps]);
};
