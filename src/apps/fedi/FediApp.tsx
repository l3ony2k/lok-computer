import React from 'react';
import { APP_CONFIG } from '@/config/constants';
import { CACHE_TTL } from '@/lib/storage';
import { cachedRequest } from '@/lib/cachedRequest';
import { SocialFeedAdapter, SocialFeedApp } from '@/apps/social/SocialFeedApp';
import { getNextCursor } from '@/apps/social/pagination';

interface Account {
  id: string;
  username: string;
  display_name: string;
  note: string;
  url: string;
  avatar: string;
  header: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  fields: Array<{ name: string; value: string }>;
}

interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'gifv' | 'unknown';
  url: string;
  preview_url: string;
  description: string | null;
  meta?: {
    original?: { width?: number; height?: number; aspect?: number };
    small?: { width?: number; height?: number; aspect?: number };
  };
}

interface Status {
  id: string;
  created_at: string;
  content: string;
  account: Account;
  media_attachments: MediaAttachment[];
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  reblog: Status | null;
}

interface StatusPage {
  statuses: Status[];
  nextCursor?: string;
}

const getMediaAspectRatio = (media: MediaAttachment) => {
  const dimensions = [media.meta?.small, media.meta?.original].find((candidate) => candidate?.width && candidate?.height)
    ?? [media.meta?.small, media.meta?.original].find((candidate) => candidate?.aspect);
  if (dimensions?.width && dimensions?.height) return `${dimensions.width} / ${dimensions.height}`;
  return dimensions?.aspect ? String(dimensions.aspect) : undefined;
};

const adapter: SocialFeedAdapter = {
  id: 'fedi',
  profileTtl: CACHE_TTL.FEDI_ACCOUNT,
  feedTtl: CACHE_TTL.FEDI_STATUSES,
  requiresProfileForFeed: true,
  loadProfile: async () => {
    const cacheKey = `fedi:account:${APP_CONFIG.FEDI_USERNAME}`;
    const account = await cachedRequest<Account>({
      cacheKey,
      ttlMs: CACHE_TTL.FEDI_ACCOUNT,
      source: 'fedi',
      debugLabel: 'fedi:account',
      load: async () => {
        console.log(`[API:Fedi] GET account ${APP_CONFIG.FEDI_USERNAME}`);
        const response = await fetch(`/api/fedi/account?username=${APP_CONFIG.FEDI_USERNAME}`);
        if (!response.ok) throw new Error('Failed to fetch account');
        return response.json() as Promise<Account>;
      },
    });

    return {
      sourceId: account.id,
      displayName: account.display_name || account.username,
      handle: account.username,
      avatar: account.avatar,
      banner: account.header,
      bio: account.note ? <div dangerouslySetInnerHTML={{ __html: account.note }} /> : undefined,
      fields: account.fields?.map((field) => ({
        name: field.name,
        value: <span dangerouslySetInnerHTML={{ __html: field.value }} />,
      })),
      stats: [
        { label: 'followers', value: account.followers_count },
        { label: 'following', value: account.following_count },
        { label: 'posts', value: account.statuses_count },
      ],
      action: { label: 'view on fedi', url: account.url },
    };
  },
  loadPage: async (profile, cursor) => {
    if (!profile) return { posts: [], nextCursor: undefined };
    const cacheKey = `fedi:statuses:${profile.sourceId}:${cursor || 'initial'}`;
    const page = await cachedRequest<StatusPage>({
      cacheKey,
      ttlMs: CACHE_TTL.FEDI_STATUSES,
      source: 'fedi',
      debugLabel: `fedi:statuses:${cursor || 'initial'}`,
      load: async () => {
        console.log(`[API:Fedi] GET statuses ${cursor ? `(max_id: ${cursor})` : ''}`);
        const url = new URL('/api/fedi/statuses', window.location.origin);
        url.searchParams.set('accountId', profile.sourceId);
        if (cursor) url.searchParams.set('max_id', cursor);
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error('Failed to fetch statuses');
        const statuses = await response.json() as Status[];
        return {
          statuses,
          nextCursor: getNextCursor(cursor, statuses.length > 0 ? statuses[statuses.length - 1].id : undefined),
        };
      },
    });

    return {
      nextCursor: page.nextCursor,
      posts: page.statuses.map((status) => {
        const displayStatus = status.reblog || status;
        return {
          id: status.id,
          contextLabel: status.reblog
            ? `Reposted by ${status.account.display_name || status.account.username}`
            : undefined,
          author: {
            displayName: displayStatus.account.display_name || displayStatus.account.username,
            handle: displayStatus.account.username,
            avatar: displayStatus.account.avatar,
          },
          createdAt: displayStatus.created_at,
          body: <div className="text-sm break-words mb-2 [&>p]:mb-2 last:[&>p]:mb-0 [&_a]:text-blue-400 [&_a]:underline" dangerouslySetInnerHTML={{ __html: displayStatus.content }} />,
          media: displayStatus.media_attachments
            .filter((media) => media.type === 'image')
            .map((media) => ({
              id: media.id,
              previewUrl: media.preview_url,
              fullUrl: media.url,
              alt: media.description || 'Attachment',
              aspectRatio: getMediaAspectRatio(media),
            })),
          metrics: {
            replies: displayStatus.replies_count || 0,
            reposts: displayStatus.reblogs_count || 0,
            likes: displayStatus.favourites_count || 0,
          },
        };
      }),
    };
  },
};

export const FediApp = () => <SocialFeedApp adapter={adapter} />;

export default FediApp;
