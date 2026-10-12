import type { MenuEntry } from '@/components/menu/MenuItems';
import type { DesktopWindow } from '@/hooks/useWindowManager';

export interface WindowMenuActions {
  minimize: () => void;
  /** Bring a minimized window back. */
  unminimize: () => void;
  maximize: () => void;
  /** Leave the maximized state. */
  restore: () => void;
  toggleShade: () => void;
  close: () => void;
  /** Copies the deep link; null when the window has no route. Omit to leave the entry out. */
  share?: (() => void) | null;
  /** Takes a stacked window out of its stack (BeOS). Omit to leave the entry out. */
  detach?: () => void;
}

/** The window menu, shared by the title bar's icon menu, its right-click, and the taskbar. */
export const buildWindowMenu = (window: DesktopWindow, actions: WindowMenuActions): MenuEntry[] => {
  const items: MenuEntry[] = [
    window.minimized
      ? { label: 'Restore', action: actions.unminimize }
      : { label: 'Minimize', action: actions.minimize },
    window.maximized
      ? { label: 'Restore', action: actions.restore, disabled: window.minimized }
      : { label: 'Maximize', action: actions.maximize },
    { label: 'Shade', checked: Boolean(window.shaded), action: actions.toggleShade },
  ];
  if (actions.detach && window.stack) {
    items.push({ label: 'Detach from stack', action: actions.detach });
  }
  if (actions.share !== undefined) {
    items.push({ type: 'divider' }, { label: 'Share Window', disabled: !actions.share, action: actions.share ?? undefined });
  }
  items.push({ type: 'divider' }, { label: 'Close', action: actions.close });
  return items;
};
