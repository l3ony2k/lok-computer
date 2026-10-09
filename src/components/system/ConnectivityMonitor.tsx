import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Marks the document while the browser is offline (`html[data-offline]`, for
 * styles that should rest) and says so once in each direction.
 */
export const ConnectivityMonitor = () => {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    if (online) {
      delete root.dataset.offline;
      toast.dismiss('offline');
      if (wasOffline.current) toast.success('Back online.', { id: 'online' });
      return;
    }
    root.dataset.offline = '';
    wasOffline.current = true;
    toast.dismiss('online');
    toast('You are offline.', {
      id: 'offline',
      description: 'Saved copies of feeds stay available; anything new waits for a connection.',
    });
  }, [online]);

  return null;
};
