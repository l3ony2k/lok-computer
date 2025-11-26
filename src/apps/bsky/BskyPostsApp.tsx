import React, { useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { useWindowManager } from '@/hooks/useWindowManager';
import { ImageViewerApp } from '@/apps/imageviewer/ImageViewerApp';

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

import { APP_CONFIG } from '@/config/constants';

const FEED_URL = APP_CONFIG.BSKY_FEED_URL;
const PROFILE_URL = APP_CONFIG.BSKY_PROFILE_URL;

export const BskyPostsApp: React.FC = () => {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { addWindow } = useWindowManager();

  const fetchProfile = async () => {
    console.log('Fetching Bluesky profile...');
    try {
      const response = await fetch(PROFILE_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json() as Profile;
      console.log(`Fetched profile for ${data.handle}`);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  };

  const fetchPosts = async ({ pageParam }: { pageParam?: string }) => {
    console.log(`Fetching posts... ${pageParam ? `(cursor: ${pageParam})` : '(initial)'}`);
    try {
      const url = pageParam ? `${FEED_URL}&cursor=${pageParam}` : FEED_URL;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json() as FeedResponse;
      console.log(`Fetched ${data.feed.length} posts`);
      return data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  };

  const { data: profile } = useQuery({
    queryKey: ['bskyProfile'],
    queryFn: fetchProfile,
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
        <div className="flex justify-center items-center h-full p-4">
          <p>Loading posts...</p>
        </div>
      ) : isError ? (
        <div className="text-red-500 p-4 text-center">
          <p>Error loading posts: {error instanceof Error ? error.message : 'Unknown error'}</p>
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
                        {post.record.text}
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
      )}
    </WindowLayout>
  );
};

export default BskyPostsApp;