import { escapeHtml } from '@/lib/escapeHtml';
import type { ReactNode } from 'react';
import { APP_CONFIG } from '@/config/constants';
import { CACHE_TTL } from '@/lib/storage';
import { cachedRequest } from '@/lib/cachedRequest';
import { SocialFeedAdapter, SocialFeedApp } from '@/apps/social/SocialFeedApp';
import { getNextCursor } from '@/apps/social/pagination';

interface CustomEmoji {
  shortcode: string;
  url: string;
  static_url: string;
}

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
  emojis?: CustomEmoji[];
}

interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'gifv' | 'audio' | 'unknown';
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
  emojis?: CustomEmoji[];
}

interface StatusPage {
  statuses: Status[];
  nextCursor?: string;
}

// Custom emoji arrive as `:shortcode:` text plus a list of images. Preflight
// makes images block-level, so the inline style keeps them in the line.
const EMOJI_STYLE = 'display:inline;height:1.2em;width:auto;vertical-align:-0.2em';


const findEmoji = (emojis: CustomEmoji[] | undefined) => {
  const byCode = new Map((emojis ?? []).map((emoji) => [emoji.shortcode, emoji]));
  return byCode.size ? byCode : undefined;
};

/** Replaces known `:shortcode:` in server HTML with the emoji image. */
const emojifyHtml = (html: string, emojis: CustomEmoji[] | undefined) => {
  const byCode = findEmoji(emojis);
  if (!byCode) return html;
  return html.replace(/:([a-zA-Z0-9_]+):/g, (match, code: string) => {
    const emoji = byCode.get(code);
    return emoji
      ? `<img src="${escapeHtml(emoji.static_url || emoji.url)}" alt=":${code}:" title=":${code}:" style="${EMOJI_STYLE}">`
      : match;
  });
};

/** Renders a plain-text display name with its custom emoji as images. */
const emojifyName = (name: string, emojis: CustomEmoji[] | undefined): ReactNode => {
  const byCode = findEmoji(emojis);
  if (!byCode || !name.includes(':')) return undefined;
  return name.split(/(:[a-zA-Z0-9_]+:)/g).map((part, index) => {
    const emoji = /^:[a-zA-Z0-9_]+:$/.test(part) ? byCode.get(part.slice(1, -1)) : undefined;
    return emoji
      ? <img key={index} src={emoji.static_url || emoji.url} alt={part} title={part} className="inline h-[1.2em] w-auto align-[-0.2em]" />
      : part;
  });
};

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
      displayNameContent: emojifyName(account.display_name, account.emojis),
      handle: account.username,
      avatar: account.avatar,
      banner: account.header,
      bio: account.note ? <div dangerouslySetInnerHTML={{ __html: emojifyHtml(account.note, account.emojis) }} /> : undefined,
      fields: account.fields?.map((field) => ({
        name: field.name,
        value: <span dangerouslySetInnerHTML={{ __html: emojifyHtml(field.value, account.emojis) }} />,
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
            ? <>Reposted by {emojifyName(status.account.display_name, status.account.emojis) ?? (status.account.display_name || status.account.username)}</>
            : undefined,
          author: {
            displayName: displayStatus.account.display_name || displayStatus.account.username,
            displayNameContent: emojifyName(displayStatus.account.display_name, displayStatus.account.emojis),
            handle: displayStatus.account.username,
            avatar: displayStatus.account.avatar,
          },
          createdAt: displayStatus.created_at,
          body: <div className="text-sm break-words mb-2 [&>p]:mb-2 last:[&>p]:mb-0 [&_a]:underline" dangerouslySetInnerHTML={{ __html: emojifyHtml(displayStatus.content, displayStatus.emojis) }} />,
          media: displayStatus.media_attachments
            .filter((media) => media.type !== 'unknown')
            .map((media) => ({
              id: media.id,
              kind: media.type === 'image' ? 'image' as const : media.type === 'audio' ? 'audio' as const : 'video' as const,
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
