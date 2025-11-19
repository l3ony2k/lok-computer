import React, { useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';

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
}

interface FeedResponse {
  feed: { post: Post }[];
  cursor?: string;
}

import { APP_CONFIG } from '@/config/constants';

const FEED_URL = APP_CONFIG.BSKY_FEED_URL;

export const BskyPostsApp: React.FC = () => {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPosts = async ({ pageParam }: { pageParam?: string }) => {
    const url = pageParam ? `${FEED_URL}&cursor=${pageParam}` : FEED_URL;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }
    return response.json() as Promise<FeedResponse>;
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
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
          <RetroButton onClick={() => window.location.reload()} className="mt-2">
            Retry
          </RetroButton>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {data?.pages.map((page, pageIndex) => (
            <React.Fragment key={pageIndex}>
              {page.feed.map(({ post }) => (
                <div key={post.uri} className="p-3 hover:bg-accent/5 transition-colors">
                  <div className="flex items-start gap-3">
                    {post.author.avatar ? (
                      <img
                        src={post.author.avatar}
                        alt={post.author.handle}
                        className="w-10 h-10 rounded-full border border-border bg-secondary"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full border border-border bg-secondary flex items-center justify-center">
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

                      <div className="flex gap-4 text-xs opacity-50">
                        <span title="Replies">💬 {post.replyCount || 0}</span>
                        <span title="Reposts">🔁 {post.repostCount || 0}</span>
                        <span title="Likes">❤️ {post.likeCount || 0}</span>
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