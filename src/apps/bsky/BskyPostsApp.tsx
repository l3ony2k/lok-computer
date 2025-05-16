import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppBskyFeedDefs, AppBskyFeedPost, AppBskyEmbedImages } from '@atproto/api';
import { useWindowManager } from '@/hooks/useWindowManager';
import ImageViewerApp from '@/apps/imageviewer/ImageViewerApp';

// Helper for date formatting (YYYY-MM-DD)
const formatDateToISO = (dateString: string): string => {
  return new Date(dateString).toISOString().split('T')[0];
};

// Helper for time formatting (HH:MM - 24h)
const formatTimeTo24H = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

interface PostImage {
  thumb: string;
  fullsize: string;
  alt: string;
  aspectRatio?: number;
}

interface DisplayPost {
  uri: string;
  cid: string;
  text: string;
  createdAt: string;
  isReply: boolean;
  images: PostImage[] | undefined;
}

const INITIAL_POST_LIMIT = 50;
const SUBSEQUENT_POST_LIMIT = 50;

const BskyPostsApp: React.FC = () => {
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const hasFetchedInitial = useRef(false);

  const { addWindow } = useWindowManager();

  const fetchPostsFromWorker = useCallback(async (currentCursor?: string) => {
    if (isLoading) return;

    setIsLoading(true);
    if (!currentCursor && posts.length === 0) setIsLoadingInitial(true);
    setError(null);

    try {
      const limit = currentCursor ? SUBSEQUENT_POST_LIMIT : INITIAL_POST_LIMIT;
      const params = new URLSearchParams({
        limit: limit.toString(),
      });
      if (currentCursor) {
        params.append('cursor', currentCursor);
      }

      const response = await fetch(`/api/bsky/feed?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || `Worker request failed with status ${response.status}`);
      }

      const fetchedFeed = data.feed as AppBskyFeedDefs.FeedViewPost[];
      const newPostsData: DisplayPost[] = fetchedFeed
        .filter(feedViewPost => !AppBskyFeedDefs.isReasonRepost(feedViewPost.reason))
        .map((feedViewPost): DisplayPost | null => {
          if (AppBskyFeedPost.isRecord(feedViewPost.post.record)) {
            const record = feedViewPost.post.record;
            let postImages: PostImage[] | undefined = undefined;
            if (feedViewPost.post.embed && AppBskyEmbedImages.isView(feedViewPost.post.embed)) {
              postImages = feedViewPost.post.embed.images.map(img => {
                let ar: number | undefined = undefined;
                if (img.aspectRatio && img.aspectRatio.width && img.aspectRatio.height && img.aspectRatio.height > 0) {
                  ar = img.aspectRatio.width / img.aspectRatio.height;
                }
                return {
                  thumb: img.thumb,
                  fullsize: img.fullsize,
                  alt: img.alt,
                  aspectRatio: ar,
                };
              });
            }
            return {
              uri: feedViewPost.post.uri,
              cid: feedViewPost.post.cid,
              text: record.text as string,
              createdAt: record.createdAt as string,
              isReply: !!feedViewPost.reply,
              images: (postImages && postImages.length > 0) ? postImages : undefined,
            };
          }
          return null;
        })
        .filter(Boolean) as DisplayPost[];

      setPosts(prevPosts => currentCursor ? [...prevPosts, ...newPostsData] : newPostsData);
      setCursor(data.cursor);

    } catch (err: any) {
      console.error('Failed to fetch Bluesky posts from worker:', err);
      setError(`Failed to load posts: ${err.message}`);
    } finally {
      setIsLoading(false);
      setIsLoadingInitial(false);
    }
  }, [isLoading, posts.length]);

  const triggerFetchPosts = fetchPostsFromWorker;

  useEffect(() => {
    if (!hasFetchedInitial.current) {
      hasFetchedInitial.current = true;
      triggerFetchPosts();
    }
  }, [triggerFetchPosts]);

  const handleOpenImageViewer = (imageUrl: string, altText: string, aspectRatio?: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWindowWidth = viewportWidth * 0.5;
    const maxWindowHeight = viewportHeight * 0.5;
    let initialWidth = 600;
    let initialHeight = 450;
    if (aspectRatio && aspectRatio > 0) {
        let h = maxWindowWidth / aspectRatio;
        if (h <= maxWindowHeight) {
            initialWidth = maxWindowWidth;
            initialHeight = h;
        } else {
            let w = maxWindowHeight * aspectRatio;
            initialWidth = w;
            initialHeight = maxWindowHeight;
        }
    }
    initialWidth = Math.max(initialWidth, 400);
    initialHeight = Math.max(initialHeight, 300);
    initialWidth = Math.min(initialWidth, maxWindowWidth);
    initialHeight = Math.min(initialHeight, maxWindowHeight);
    addWindow({
      title: "Image Viewer",
      content: <ImageViewerApp imageUrl={imageUrl} altText={altText} aspectRatio={aspectRatio} />,
      iconType: 'image',
      width: Math.round(initialWidth),
      height: Math.round(initialHeight),
    });
  };

  const handleLoadMore = () => {
    if (cursor && !isLoading) {
      triggerFetchPosts(cursor);
    }
  };

  return (
    <div className="p-0 h-full flex flex-col window-content-area">
      {isLoadingInitial && posts.length === 0 && !error && (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-neutral-500 dark:text-neutral-400">Loading initial posts...</p>
        </div>
      )}
      
      {!isLoadingInitial && posts.length === 0 && !error && (
         <div className="flex-grow flex items-center justify-center">
            <p className="text-neutral-500 dark:text-neutral-400">No posts found or Bsky app not available.</p>
         </div>
      )}

      {error && (
        <div className="p-4 m-4 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 text-center">
          <p>{error}</p>
          <button 
            onClick={() => {
              hasFetchedInitial.current = false;
              triggerFetchPosts();
            }} 
            className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {posts.length > 0 && (
        <div className="flex-grow overflow-y-auto p-3 space-y-3">
          {posts.map((post) => (
            <div key={post.uri} className="p-3 border border-accent">
              <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words">
                {post.text}
              </p>
              {post.images && post.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {post.images.map((img, index) => (
                    <div // Thumbnail container
                      key={index}
                      className="w-[80px] h-[80px] bg-neutral-300 dark:bg-neutral-600 cursor-pointer overflow-hidden group"
                      onClick={() => handleOpenImageViewer(img.fullsize, img.alt || 'Image from post', img.aspectRatio)}
                    >
                      <img
                        src={img.thumb}
                        alt={img.alt || 'Post image thumbnail'}
                        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 text-right">
                {formatDateToISO(post.createdAt)} {formatTimeTo24H(post.createdAt)}
              </p>
            </div>
          ))}
          
          <div className="py-4 text-center">
            {isLoading && !isLoadingInitial && (
              <p className="text-neutral-500 dark:text-neutral-400">Loading more posts...</p>
            )}
            {!isLoading && cursor && (
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="retro-button flex items-center justify-center mx-auto"
              >
                Load More
              </button>
            )}
            {!isLoading && !cursor && !isLoadingInitial && posts.length >= INITIAL_POST_LIMIT && (
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">All posts loaded.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BskyPostsApp; 