import { useSyncExternalStore } from 'react';

/** `navigator.onLine` is a hint, not a guarantee; it is only ever false when the browser knows there is no route. */
export const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

const subscribe = (notify: () => void) => {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
};

/** Re-renders when the browser's connectivity changes. */
export const useOnlineStatus = () => useSyncExternalStore(subscribe, isOnline, () => true);
