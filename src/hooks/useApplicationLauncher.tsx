import { useCallback } from 'react';
import { createApplicationElement, getApplicationDefinition } from '@/config/apps';
import { WINDOW_DEFAULTS } from '@/config/window';
import { useWindowLaunchActions } from '@/hooks/useWindowManager';

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
    const content = createApplicationElement(componentType, props);
    if (!content) return null;

    return addOrFocusWindow({
      title: options.title ?? application.name,
      content,
      componentType: application.componentType,
      iconType: options.iconType ?? application.iconType,
      width: options.width ?? application.defaultWidth ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
      height: options.height ?? application.defaultHeight ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
      minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
      minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
      singleInstance: options.singleInstance ?? application.singleInstance,
      props,
      x: options.x,
      y: options.y,
    });
  }, [addOrFocusWindow]);
};
