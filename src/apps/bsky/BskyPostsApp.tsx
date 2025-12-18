import React, { useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { StateMessage } from '@/components/ui/StateMessage';
import { RetroButton } from '@/components/ui/RetroButton';
import { useWindowManager } from '@/hooks/useWindowManager';
import { ImageViewerApp } from '@/apps/imageviewer/ImageViewerApp';
import { APP_CONFIG } from '@/config/constants';
import { getCachedData, setCachedData, incrementRequestCount, CACHE_TTL } from '@/lib/storage';

interface Facet {
  $type: string;
  features: {
    $type: string;
    uri?: string; // for links
    did?: string; // for mentions
    tag?: string; // for hashtags
  }[];
  index: {
    byteStart: number;
    byteEnd: number;
  };
}

interface Post {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text: string;
    createdAt: string;
    facets?: Facet[];
  };
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  embed?: {
    $type: string;
    images?: {
      thumb: string;
      fullsize: string;
      alt: string;
      aspectRatio?: {
        width: number;
        height: number;
      };
    }[];
  };
}

interface FeedItem {
  post: Post;
  reason?: {
    $type: string;
    by: {
      did: string;
      handle: string;
      displayName?: string;
    };
    indexedAt: string;
  };
}

interface FeedResponse {
  feed: FeedItem[];
  cursor?: string;
}

interface Profile {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  indexedAt: string;
}

const FEED_URL = APP_CONFIG.BSKY_FEED_URL;
const PROFILE_URL = APP_CONFIG.BSKY_PROFILE_URL;

// Render post text with rich text facets (links, mentions, hashtags)
const RichText: React.FC<{ text: string; facets?: Facet[] }> = ({ text, facets }) => {
  if (!facets || facets.length === 0) {
    return <>{text}</>;
  }

  // Convert string to byte array for proper indexing (Bluesky uses byte offsets)
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(text);

  // Sort facets by byte start position
  const sortedFacets = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);

  const elements: React.ReactNode[] = [];
  let lastEnd = 0;

  sortedFacets.forEach((facet, idx) => {
    const { byteStart, byteEnd } = facet.index;

    // Add text before this facet
    if (byteStart > lastEnd) {
      elements.push(decoder.decode(bytes.slice(lastEnd, byteStart)));
    }

    // Extract the facet text
    const facetText = decoder.decode(bytes.slice(byteStart, byteEnd));

    // Determine the facet type and render accordingly
    const feature = facet.features[0];
    if (feature) {
      if (feature.$type === 'app.bsky.richtext.facet#link' && feature.uri) {
        elements.push(
          <a
            key={idx}
            href={feature.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            {facetText}
          </a>
        );
      } else if (feature.$type === 'app.bsky.richtext.facet#mention' && feature.did) {
        elements.push(
          <a
            key={idx}
            href={`https://bsky.app/profile/${feature.did}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            {facetText}
          </a>
        );
      } else if (feature.$type === 'app.bsky.richtext.facet#tag' && feature.tag) {
        elements.push(
          <a
            key={idx}
            href={`https://bsky.app/hashtag/${feature.tag}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            {facetText}
          </a>
        );
      } else {
        // Unknown facet type, render as plain text
        elements.push(facetText);
      }
    } else {
      elements.push(facetText);
    }

    lastEnd = byteEnd;
  });

  // Add remaining text after the last facet
  if (lastEnd < bytes.length) {
    elements.push(decoder.decode(bytes.slice(lastEnd)));
  }

  return <>{elements}</>;
};

export const BskyPostsApp: React.FC = () => {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { addWindow } = useWindowManager();

  const fetchProfile = async () => {
    const cacheKey = 'bsky:profile';

    // Check cache first
    const cached = await getCachedData<Profile>(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: bsky:profile`);
      return cached;
    }

    console.log('[API:Bsky] GET profile');
    try {
      await incrementRequestCount('bsky');
      const response = await fetch(PROFILE_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json() as Profile;

      // Store in cache
      await setCachedData(cacheKey, data, CACHE_TTL.BSKY_PROFILE);

      console.log(`[App:Bsky] Profile loaded: ${data.handle}`);
      return data;
    } catch (error) {
      console.error('[BskyApp] Error fetching profile:', error);
      throw error;
    }
  };

  const fetchPosts = async ({ pageParam }: { pageParam?: string }) => {
    const cacheKey = `bsky:posts:${pageParam || 'initial'}`;

    // Check cache first
    const cached = await getCachedData<FeedResponse>(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: bsky:posts:${pageParam || 'initial'}`);
      return cached;
    }

    console.log(`[API:Bsky] GET posts ${pageParam ? `(cursor: ${pageParam})` : ''}`);
    try {
      await incrementRequestCount('bsky');
      const url = pageParam ? `${FEED_URL}&cursor=${pageParam}` : FEED_URL;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json() as FeedResponse;

      // Store in cache
      await setCachedData(cacheKey, data, CACHE_TTL.BSKY_POSTS);

      console.log(`[App:Bsky] Loaded ${data.feed.length} posts`);
      return data;
    } catch (error) {
      console.error('[BskyApp] Error fetching posts:', error);
      throw error;
    }
  };

  const { data: profile } = useQuery({
    queryKey: ['bskyProfile'],
    queryFn: fetchProfile,
    staleTime: CACHE_TTL.BSKY_PROFILE,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['bskyPosts'],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: undefined as string | undefined,
    staleTime: CACHE_TTL.BSKY_POSTS,
  });

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <WindowLayout hasPadding={false}>
      {isLoading ? (
        <StateMessage>
          Loading posts...
        </StateMessage>
      ) : isError ? (
        <div className="text-red-500 p-4 text-center">
          <p className="text-sm">Error loading posts: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <RetroButton onClick={() => refetch()} className="mt-2">
            Retry
          </RetroButton>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {profile && (
            <div className="relative">
              {/* Banner */}
              <div className="h-32 bg-secondary overflow-hidden">
                {profile.banner && (
                  <img
                    src={profile.banner}
                    alt="Profile Banner"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="px-4 pb-4">
                <div className="flex justify-between items-end -mt-10 mb-3">
                  {/* Avatar */}
                  <div className="w-20 h-20 bg-background border-4 border-background overflow-hidden relative z-10">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.handle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        <span className="text-2xl opacity-50">?</span>
                      </div>
                    )}
                  </div>

                  {/* Follow Button */}
                  <RetroButton
                    className="mb-1"
                    onClick={() => window.open(`https://bsky.app/profile/${profile.handle}`, '_blank')}
                  >
                    view on bsky
                  </RetroButton>
                </div>

                {/* Profile Info */}
                <div className="mb-4">
                  <h1 className="text-xl font-bold leading-tight">
                    {profile.displayName || profile.handle}
                  </h1>
                  <p className="text-muted-foreground text-sm">@{profile.handle}</p>
                </div>

                {/* Bio */}
                {profile.description && (
                  <p className="text-sm whitespace-pre-wrap mb-4">
                    {profile.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex gap-4 text-sm">
                  <span className="hover:underline cursor-pointer">
                    <span className="font-bold">{profile.followersCount}</span>{' '}
                    <span className="text-muted-foreground">followers</span>
                  </span>
                  <span className="hover:underline cursor-pointer">
                    <span className="font-bold">{profile.followsCount}</span>{' '}
                    <span className="text-muted-foreground">following</span>
                  </span>
                  <span>
                    <span className="font-bold">{profile.postsCount}</span>{' '}
                    <span className="text-muted-foreground">posts</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {data?.pages.map((page, pageIndex) => (
            <React.Fragment key={pageIndex}>
              {page.feed.map(({ post, reason }) => (
                <div key={`${post.uri}-${reason?.indexedAt || post.record.createdAt}`} className="p-3 hover:bg-accent/5 transition-colors">
                  {reason && (
                    <div className="flex items-center gap-2 mb-1 ml-12 text-xs text-muted-foreground">
                      <span>↻</span>
                      <span>Reposted by {reason.by.displayName || reason.by.handle}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    {post.author.avatar ? (
                      <img
                        src={post.author.avatar}
                        alt={post.author.handle}
                        className="w-10 h-10 border border-border bg-secondary"
                      />
                    ) : (
                      <div className="w-10 h-10 border border-border bg-secondary flex items-center justify-center">
                        <span className="text-xs opacity-50">?</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-sm truncate">
                          {post.author.displayName || post.author.handle}
                        </span>
                        <span className="text-xs opacity-50 truncate">
                          @{post.author.handle}
                        </span>
                        <span className="text-xs opacity-30 ml-auto whitespace-nowrap">
                          {formatTime(post.record.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm whitespace-pre-wrap break-words mb-2">
                        <RichText text={post.record.text} facets={post.record.facets} />
                      </p>

                      {/* Images */}
                      {post.embed?.images && post.embed.images.length > 0 && (
                        <div className={`grid gap-2 mb-2 ${post.embed.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {post.embed.images.map((image, index) => (
                            <div
                              key={index}
                              className="cursor-pointer border border-border bg-secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                addWindow({
                                  title: 'Image Viewer',
                                  content: <ImageViewerApp imageUrl={image.fullsize} />,
                                  width: 800,
                                  height: 600,
                                  iconType: 'image',
                                  componentType: 'ImageViewer',
                                  props: { imageUrl: image.fullsize },
                                });
                              }}
                            >
                              <img
                                src={image.thumb}
                                alt={image.alt}
                                className="w-full h-auto object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-4 text-xs opacity-50">
                        <span title="Replies">✉︎ {post.replyCount || 0}</span>
                        <span title="Reposts">↻ {post.repostCount || 0}</span>
                        <span title="Likes">♡ {post.likeCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Load more indicator */}
          <div ref={loadMoreRef} className="p-4 text-center text-xs opacity-50">
            {isFetchingNextPage ? 'Loading more...' : hasNextPage ? 'Scroll for more' : 'End of feed'}
          </div>
        </div>
      )
      }
    </WindowLayout >
  );
};

export default BskyPostsApp;