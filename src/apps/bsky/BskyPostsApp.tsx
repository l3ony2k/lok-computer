import React from 'react';
import { APP_CONFIG } from '@/config/constants';
import { CACHE_TTL } from '@/lib/storage';
import { cachedRequest } from '@/lib/cachedRequest';
import { SocialFeedAdapter, SocialFeedApp } from '@/apps/social/SocialFeedApp';
import { getNextCursor } from '@/apps/social/pagination';

interface Facet {
  $type: string;
  features: Array<{
    $type: string;
    uri?: string;
    did?: string;
    tag?: string;
  }>;
  index: { byteStart: number; byteEnd: number };
}

interface Post {
  uri: string;
  author: { handle: string; displayName?: string; avatar?: string };
  record: { text: string; createdAt: string; facets?: Facet[] };
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  embed?: {
    images?: Array<{
      thumb: string;
      fullsize: string;
      alt: string;
      aspectRatio?: { width: number; height: number };
    }>;
  };
}

interface FeedItem {
  post: Post;
  reason?: {
    by: { handle: string; displayName?: string };
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
}

const RichText = ({ text, facets }: { text: string; facets?: Facet[] }) => {
  if (!facets || facets.length === 0) return <>{text}</>;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(text);
  const elements: React.ReactNode[] = [];
  let lastEnd = 0;

  [...facets].sort((left, right) => left.index.byteStart - right.index.byteStart).forEach((facet, index) => {
    const { byteStart, byteEnd } = facet.index;
    if (byteStart > lastEnd) elements.push(decoder.decode(bytes.slice(lastEnd, byteStart)));
    const facetText = decoder.decode(bytes.slice(byteStart, byteEnd));
    const feature = facet.features[0];
    let href: string | undefined;
    if (feature?.uri) href = feature.uri;
    else if (feature?.did) href = `https://bsky.app/profile/${feature.did}`;
    else if (feature?.tag) href = `https://bsky.app/hashtag/${feature.tag}`;

    elements.push(href ? (
      <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline dark:text-blue-400" onClick={(event) => event.stopPropagation()}>
        {facetText}
      </a>
    ) : facetText);
    lastEnd = byteEnd;
  });

  if (lastEnd < bytes.length) elements.push(decoder.decode(bytes.slice(lastEnd)));
  return <>{elements}</>;
};

const adapter: SocialFeedAdapter = {
  id: 'bsky',
  profileTtl: CACHE_TTL.BSKY_PROFILE,
  feedTtl: CACHE_TTL.BSKY_POSTS,
  loadProfile: async () => {
    const profile = await cachedRequest<Profile>({
      cacheKey: 'bsky:profile',
      ttlMs: CACHE_TTL.BSKY_PROFILE,
      source: 'bsky',
      load: async () => {
        console.log('[API:Bsky] GET profile');
        const response = await fetch(APP_CONFIG.BSKY_PROFILE_URL);
        if (!response.ok) throw new Error('Failed to fetch profile');
        return response.json() as Promise<Profile>;
      },
    });

    return {
      sourceId: profile.did,
      displayName: profile.displayName || profile.handle,
      handle: profile.handle,
      avatar: profile.avatar,
      banner: profile.banner,
      bio: profile.description,
      stats: [
        { label: 'followers', value: profile.followersCount },
        { label: 'following', value: profile.followsCount },
        { label: 'posts', value: profile.postsCount },
      ],
      action: { label: 'view on bsky', url: `https://bsky.app/profile/${profile.handle}` },
    };
  },
  loadPage: async (_profile, cursor) => {
    const cacheKey = `bsky:posts:${cursor || 'initial'}`;
    const page = await cachedRequest<FeedResponse>({
      cacheKey,
      ttlMs: CACHE_TTL.BSKY_POSTS,
      source: 'bsky',
      debugLabel: cacheKey,
      load: async () => {
        console.log(`[API:Bsky] GET posts ${cursor ? `(cursor: ${cursor})` : ''}`);
        const url = cursor ? `${APP_CONFIG.BSKY_FEED_URL}&cursor=${encodeURIComponent(cursor)}` : APP_CONFIG.BSKY_FEED_URL;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch posts');
        return response.json() as Promise<FeedResponse>;
      },
    });

    return {
      nextCursor: getNextCursor(cursor, page.cursor),
      posts: page.feed.map(({ post, reason }) => ({
        id: `${post.uri}-${reason?.indexedAt || post.record.createdAt}`,
        contextLabel: reason ? `Reposted by ${reason.by.displayName || reason.by.handle}` : undefined,
        author: {
          displayName: post.author.displayName || post.author.handle,
          handle: post.author.handle,
          avatar: post.author.avatar,
        },
        createdAt: post.record.createdAt,
        body: <p className="text-sm whitespace-pre-wrap break-words mb-2"><RichText text={post.record.text} facets={post.record.facets} /></p>,
        media: post.embed?.images?.map((image, index) => ({
          id: `${post.uri}-${index}`,
          previewUrl: image.thumb,
          fullUrl: image.fullsize,
          alt: image.alt,
          aspectRatio: image.aspectRatio ? `${image.aspectRatio.width} / ${image.aspectRatio.height}` : undefined,
        })),
        metrics: {
          replies: post.replyCount || 0,
          reposts: post.repostCount || 0,
          likes: post.likeCount || 0,
        },
      })),
    };
  },
};

export const BskyPostsApp = () => <SocialFeedApp adapter={adapter} />;

export default BskyPostsApp;
