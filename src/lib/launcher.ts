/** The keyboard launcher is opened by Cmd/Ctrl+K and by the search button beside the clock. */

export const LAUNCHER_OPEN_EVENT = 'lok:open-launcher';

export const openLauncher = () => {
  window.dispatchEvent(new Event(LAUNCHER_OPEN_EVENT));
};

export const isMacLike = () => (
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
);

/** Human-readable shortcut for menus and tooltips. */
export const launcherShortcutLabel = () => (isMacLike() ? '⌘K' : 'Ctrl+K');

/** True for the launcher shortcut on either platform's modifier. */
export const isLauncherShortcut = (event: KeyboardEvent) => (
  (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k'
);
