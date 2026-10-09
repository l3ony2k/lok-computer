import React from 'react';
import { RetroButton } from '@/components/ui/RetroButton';
import { StateMessage } from '@/components/ui/StateMessage';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { isOfflineError } from '@/lib/cachedRequest';

interface LoadFailureProps {
  error: unknown;
  /** Noun for the message, e.g. "posts" or "the weather". */
  what?: string;
  onRetry?: () => void;
}

/**
 * The failed state of a remote load. Offline it is calm and explains that the
 * content loads when the connection is back; otherwise it is the usual red
 * message with a retry.
 */
export const LoadFailure: React.FC<LoadFailureProps> = ({ error, what = 'this', onRetry }) => {
  const online = useOnlineStatus();

  if (!online || isOfflineError(error)) {
    return (
      <StateMessage>
        <span>
          <strong>Offline.</strong> Nothing saved for {what} yet; it loads when the connection is back.
        </span>
      </StateMessage>
    );
  }

  return (
    <div className="text-red-500 p-4 text-center" role="alert">
      <p className="text-sm">{error instanceof Error ? error.message : `Could not load ${what}.`}</p>
      {onRetry && <RetroButton className="mt-2" onClick={onRetry}>Retry</RetroButton>}
    </div>
  );
};
