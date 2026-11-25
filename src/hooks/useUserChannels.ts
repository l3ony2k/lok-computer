/**
 * The Are.na channel list of an account (lok's by default), shared by every
 * place that shows it: the system menu, the keyboard launcher, the Are.na
 * app, Images' suggestions, and the boot screen that caches it first.
 *
 * It is one React Query query, so a background refresh in `cachedRequest`
 * (`onCacheRevalidated`, which invalidates the active queries) reaches every
 * open list. `getUserChannels` reads the persistent cache, so a refetch is a
 * cheap IndexedDB read, and it falls back to the bundled snapshot itself.
 */
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { getUserChannels } from '@/lib/api';
import { APP_CONFIG } from '@/config/constants';
import { CACHE_TTL } from '@/lib/storage';

const userChannelsQuery = (username: string) => ({
  queryKey: ['arena', 'user-channels', username] as const,
  queryFn: () => getUserChannels(username),
  // Within the cache's lifetime a new reader takes the list in memory; after
  // it, the read lets cachedRequest refresh the stored copy in the background.
  staleTime: CACHE_TTL.ARENA_CHANNEL,
});

/** An empty username (no Are.na account configured) loads nothing. */
export const useUserChannels = (
  username: string = APP_CONFIG.ARENA_USERNAME,
  { enabled = true }: { enabled?: boolean } = {},
) => useQuery({
  ...userChannelsQuery(username),
  enabled: enabled && Boolean(username),
});

/** Loads the list outside a component (the boot screen) into the same query. */
export const fetchUserChannels = (queryClient: QueryClient, username: string = APP_CONFIG.ARENA_USERNAME) => (
  queryClient.fetchQuery(userChannelsQuery(username))
);
