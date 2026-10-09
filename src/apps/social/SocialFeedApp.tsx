import React, { type ReactNode, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { StateMessage } from '@/components/ui/StateMessage';
import { LoadFailure } from '@/components/ui/LoadFailure';
import { RetroButton } from '@/components/ui/RetroButton';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { MEDIA_PLAYER_TYPE, createMediaItem, createMediaRequest } from '@/apps/media/mediaLibrary';

export interface SocialProfile {
  sourceId: string;
  displayName: string;
  handle: string;
  avatar?: string;
  banner?: string;
  bio?: ReactNode;
  fields?: Array<{ name: string; value: ReactNode }>;
  stats: Array<{ label: string; value: number }>;
  action: { label: string; url: string };
}

export interface SocialPost {
  id: string;
  contextLabel?: string;
  author: {
    displayName: string;
    handle: string;
    avatar?: string;
  };
  createdAt: string;
  body: ReactNode;
  media?: Array<{
    id: string;
    /** Images open in the Image Viewer; time-based media open in the Media Player. */
    kind?: 'image' | 'video' | 'audio';
    previewUrl: string;
    fullUrl: string;
    alt: string;
    aspectRatio?: string;
  }>;
  metrics: {
    replies: number;
    reposts: number;
    likes: number;
  };
}

export interface SocialFeedPage {
  posts: SocialPost[];
  nextCursor?: string;
}

export interface SocialFeedAdapter {
  id: string;
  profileTtl: number;
  feedTtl: number;
  requiresProfileForFeed?: boolean;
  loadProfile: () => Promise<SocialProfile>;
  loadPage: (profile: SocialProfile | undefined, cursor?: string) => Promise<SocialFeedPage>;
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Deep social-feed module shared by the Bsky and Fedi adapters. Query
 * coordination, paging, terminal states, profile/post chrome, and media launch
 * remain behind one interface.
 */
export const SocialFeedApp = ({ adapter }: { adapter: SocialFeedAdapter }) => {
  const layoutRef = useRef<HTMLDivElement>(null);
  const postsPaneRef = useRef<HTMLElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const wasIntersectingRef = useRef(false);
  const fetchInFlightRef = useRef(false);
  const observedSentinelRef = useRef<HTMLDivElement | null>(null);
  const openApplication = useApplicationLauncher();
  const profileQuery = useQuery({
    queryKey: ['social-profile', adapter.id],
    queryFn: adapter.loadProfile,
    staleTime: adapter.profileTtl,
  });
  const profile = profileQuery.data;

  const feedQuery = useInfiniteQuery({
    queryKey: ['social-feed', adapter.id, adapter.requiresProfileForFeed ? profile?.sourceId : null],
    queryFn: ({ pageParam }) => adapter.loadPage(profile, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !adapter.requiresProfileForFeed || Boolean(profile),
    staleTime: adapter.feedTtl,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = feedQuery;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !('IntersectionObserver' in window)) return;
    // Observe the actual scrolling pane and require a false -> true
    // transition. A restored window can start with its footer visible; without
    // this guard it can drain every page immediately on refresh.
    const postsPane = postsPaneRef.current;
    const root = postsPane && postsPane.scrollHeight > postsPane.clientHeight
      ? postsPane
      : layoutRef.current;
    // Query state changes recreate this observer. Keep the transition guard
    // across those updates or a still-visible footer will load every page.
    if (observedSentinelRef.current !== sentinel) {
      observedSentinelRef.current = sentinel;
      wasIntersectingRef.current = false;
      fetchInFlightRef.current = false;
    }
    const observer = new IntersectionObserver(([entry]) => {
      const shouldLoad = entry.isIntersecting && !wasIntersectingRef.current;
      wasIntersectingRef.current = entry.isIntersecting;
      if (shouldLoad && hasNextPage && !isFetchingNextPage && !fetchInFlightRef.current) {
        fetchInFlightRef.current = true;
        void fetchNextPage().finally(() => {
          fetchInFlightRef.current = false;
        });
      }
    }, { root, rootMargin: '120px 0px', threshold: 0.5 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);


  return (
    <WindowLayout hasPadding={false} isScrollable={false} className="lok-reader-window">
      <div ref={layoutRef} className="lok-reader-layout">
        <aside className="lok-reader-identity-pane">
          {profile ? (
            <div className="lok-reader-identity-inner relative">
              <div className="h-32 bg-secondary overflow-hidden">
                {profile.banner && <img src={profile.banner} alt="Profile banner" className="w-full h-full object-cover" />}
              </div>
              <div className="px-4 pb-4">
                <div className="flex justify-between items-end -mt-10 mb-3">
                  <div className="w-20 h-20 bg-background border-4 border-background overflow-hidden relative z-10">
                    {profile.avatar
                      ? <img src={profile.avatar} alt={profile.handle} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-secondary flex items-center justify-center"><span className="text-2xl opacity-50">?</span></div>}
                  </div>
                  <RetroButton className="mb-1" onClick={() => window.open(profile.action.url, '_blank', 'noopener,noreferrer')}>
                    {profile.action.label}
                  </RetroButton>
                </div>
                <div className="mb-4">
                  <h1 className="text-xl font-bold leading-tight">{profile.displayName}</h1>
                  <p className="text-muted-foreground text-sm">@{profile.handle}</p>
                </div>
                {profile.bio && <div className="text-sm whitespace-pre-wrap mb-4 [&>p]:mb-2 last:[&>p]:mb-0 [&_a]:text-blue-400 [&_a]:underline">{profile.bio}</div>}
                {profile.fields && profile.fields.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 mb-4 text-sm border border-border bg-secondary/20 p-2">
                    {profile.fields.map((field) => (
                      <div key={field.name} className="flex flex-col sm:flex-row sm:justify-between border-b border-border/50 last:border-0 pb-1 last:pb-0">
                        <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mr-2">{field.name}</span>
                        <span className="min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap [&_a]:text-blue-400 [&_a]:underline">{field.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-4 text-sm">
                  {profile.stats.map((stat) => (
                    <span key={stat.label}><span className="font-bold">{stat.value}</span>{' '}<span className="text-muted-foreground">{stat.label}</span></span>
                  ))}
                </div>
              </div>
            </div>
          ) : profileQuery.isError ? (
            <LoadFailure error={profileQuery.error} what="the profile" onRetry={() => void profileQuery.refetch()} />
          ) : <StateMessage>Loading profile...</StateMessage>}
        </aside>

        <section ref={postsPaneRef} className="lok-reader-entries-pane">
          <div className="lok-reader-entries-inner">
            {feedQuery.isLoading ? <StateMessage>Loading posts...</StateMessage> : feedQuery.isError ? (
              <LoadFailure error={feedQuery.error} what="posts" onRetry={() => void feedQuery.refetch()} />
            ) : (
              <div className="lok-reader-entry-list">
                {feedQuery.data?.pages.flatMap((page) => page.posts).map((post) => (
                  <article key={post.id} className="lok-reader-entry p-3">
                    {post.contextLabel && <div className="flex items-center gap-2 mb-1 ml-12 text-xs text-muted-foreground"><span>↻</span><span>{post.contextLabel}</span></div>}
                    <div className="flex items-start gap-3">
                      {post.author.avatar
                        ? <img src={post.author.avatar} alt={post.author.handle} className="w-10 h-10 border border-border bg-secondary" />
                        : <div className="w-10 h-10 border border-border bg-secondary flex items-center justify-center"><span className="text-xs opacity-50">?</span></div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-bold text-sm truncate">{post.author.displayName}</span>
                          <span className="text-xs opacity-50 truncate">@{post.author.handle}</span>
                          <span className="text-xs opacity-30 ml-auto whitespace-nowrap">{formatTime(post.createdAt)}</span>
                        </div>
                        {post.body}
                        {post.media && post.media.length > 0 && (
                          <div className="lok-reader-media-strip" aria-label="Post media">
                            {post.media.map((media) => (
                              <button
                                key={media.id}
                                type="button"
                                className="lok-reader-media-item"
                                data-kind={media.kind ?? 'image'}
                                style={{ aspectRatio: media.aspectRatio ?? '1 / 1' }}
                                title={media.kind === 'video' || media.kind === 'audio' ? 'Play in Media' : undefined}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (media.kind === 'video' || media.kind === 'audio') {
                                    openApplication(MEDIA_PLAYER_TYPE, {
                                      props: {
                                        request: createMediaRequest([createMediaItem(media.fullUrl, {
                                          title: media.alt !== 'Attachment' ? media.alt : `${post.author.displayName} ${media.kind}`,
                                          artist: `@${post.author.handle}`,
                                          kind: media.kind,
                                          origin: 'app',
                                        })]),
                                      },
                                    });
                                    return;
                                  }
                                  openApplication('ImageViewer', { props: { imageUrl: media.fullUrl } });
                                }}
                              >
                                {media.previewUrl
                                  ? <img src={media.previewUrl} alt={media.alt} loading="lazy" />
                                  : <span className="lok-reader-media-placeholder">{media.kind ?? 'media'}</span>}
                                {(media.kind === 'video' || media.kind === 'audio') && (
                                  <span className="lok-reader-media-play" aria-hidden="true">▶</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-4 text-xs opacity-50">
                          <span title="Replies">✉︎ {post.metrics.replies}</span>
                          <span title="Reposts">↻ {post.metrics.reposts}</span>
                          <span title="Likes">♡ {post.metrics.likes}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
                <div ref={loadMoreRef} className="p-4 text-center text-xs opacity-50">
                  {feedQuery.isFetchingNextPage ? 'Loading more...' : feedQuery.hasNextPage ? 'Scroll for more' : 'End of feed'}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </WindowLayout>
  );
};
