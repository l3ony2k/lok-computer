import { useState, type ComponentType } from 'react';
import { RetroButton } from '@/components/ui/RetroButton';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export type LazyModule<P> = { default: ComponentType<P> };

/**
 * Stands in for an app whose chunk failed to download (offline before the
 * boot warm-up could cache it, or a deploy in progress). Loads the module
 * again on demand and renders it in place.
 */
export const ChunkRetry = <P extends object>({ load, props }: { load: () => Promise<LazyModule<P>>; props: P }) => {
  const online = useOnlineStatus();
  const [Loaded, setLoaded] = useState<ComponentType<P> | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed'>('idle');

  if (Loaded) return <Loaded {...props} />;

  const retry = () => {
    setStatus('loading');
    load()
      .then((module) => setLoaded(() => module.default))
      .catch((error: unknown) => {
        console.warn('[App] Module still unavailable:', error);
        setStatus('failed');
      });
  };

  return (
    <div className="window-crash" role="alert">
      <strong>{online ? 'This app did not download.' : 'This app is not downloaded yet, and you are offline.'}</strong>
      <span>{online ? 'The connection may have dropped while it loaded.' : 'It loads once the connection is back.'}</span>
      <RetroButton size="sm" onClick={retry} disabled={status === 'loading'}>
        {status === 'loading' ? 'Loading…' : status === 'failed' ? 'Try again' : 'Load it'}
      </RetroButton>
    </div>
  );
};
