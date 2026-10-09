/**
 * Are.na links and the media they point at.
 *
 * Pure helpers shared by the Are.na apps, the Media Player, and the Image
 * Viewer: parsing pasted links, and picking playable media or viewable images
 * out of blocks. Network work lives in `arenaImport.ts`.
 */
import type { ArenaBlock, ArenaItem } from '@/types/arena';
import {
  createMediaItem,
  inferMediaKind,
  titleFromSource,
  type MediaItem,
  type MediaKind,
} from '@/apps/media/mediaLibrary';

export type ArenaReference =
  | { type: 'channel'; slug: string }
  | { type: 'block'; id: number };

const ARENA_HOSTS = new Set(['are.na', 'www.are.na']);
const ARENA_API_HOST = 'api.are.na';
const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

/** First path segments on are.na that are pages, not user profiles. */
const RESERVED_PATHS = new Set([
  'about', 'blog', 'block', 'blocks', 'channel', 'channels', 'developers', 'editorial',
  'explore', 'feed', 'group', 'groups', 'import', 'log_in', 'login', 'notifications',
  'pricing', 'privacy', 'search', 'settings', 'share', 'sign_up', 'signup', 'support',
  'terms', 'tools',
]);

const isSlug = (value: string | undefined): value is string => Boolean(value && SLUG_PATTERN.test(value));

const blockIdFrom = (value: string | undefined) => (
  value && /^\d+$/.test(value) ? Number(value) : null
);

/**
 * Reads an Are.na channel or block from a pasted link or a bare channel slug.
 *
 * Accepts are.na/<user>/<channel>, are.na/channel/<channel>, are.na/block/<id>,
 * the matching api.are.na URLs, and slugs such as `physical-digital-surrealism`.
 * Anything with a dot that isn't an Are.na host is left for the caller.
 */
export const parseArenaReference = (input: string): ArenaReference | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // A bare slug can't be a media or image URL, which always has a dot.
  if (isSlug(trimmed) && /[a-z]/i.test(trimmed)) return { type: 'channel', slug: trimmed };

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase();
  let segments: string[];
  try {
    segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }

  if (host === ARENA_API_HOST) {
    // /v2|v3/channels/<slug>[/contents], /v2|v3/blocks/<id>
    const [, collection, key] = segments;
    if (collection === 'blocks') {
      const id = blockIdFrom(key);
      return id === null ? null : { type: 'block', id };
    }
    return collection === 'channels' && isSlug(key) ? { type: 'channel', slug: key } : null;
  }

  if (!ARENA_HOSTS.has(host)) return null;

  const blockIndex = segments.indexOf('block');
  if (blockIndex >= 0) {
    const id = blockIdFrom(segments[blockIndex + 1]);
    return id === null ? null : { type: 'block', id };
  }
  if (segments[0] === 'channel') {
    return isSlug(segments[1]) ? { type: 'channel', slug: segments[1] } : null;
  }
  if (segments.length >= 2 && !RESERVED_PATHS.has(segments[0].toLowerCase()) && isSlug(segments[1])) {
    return { type: 'channel', slug: segments[1] };
  }
  return null;
};

/** The canonical are.na page for a reference; also the persisted form. */
export const formatArenaReference = (reference: ArenaReference) => (
  reference.type === 'channel'
    ? `https://www.are.na/channel/${reference.slug}`
    : `https://www.are.na/block/${reference.id}`
);

const MEDIA_FILE_NAME = /^\S+\.(mp3|m4a|aac|oga|ogg|opus|wav|flac|weba|mp4|m4v|webm|ogv|mov|mkv)$/i;

/** Block titles are often the uploaded file name; show those like a track name. */
/** Upload names like "A554B4FF-2603-4E39-8593-2D2A309A3073.mov" say nothing about the content. */
const GENERATED_FILE_NAME = /^(?=[0-9-]*[a-f])[0-9a-f-]{16,}(\.[a-z0-9]{2,5})?$/i;

const readableTitle = (block: ArenaBlock, fallbackSource: string, fileName?: string | null) => {
  const title = block.title && block.title !== 'Untitled' ? block.title.trim() : '';
  const raw = title || fileName?.trim() || '';
  const readable = !raw
    ? titleFromSource(fallbackSource)
    : MEDIA_FILE_NAME.test(raw) ? titleFromSource(`https://are.na/${encodeURIComponent(raw)}`) : raw;
  return GENERATED_FILE_NAME.test(readable) ? `Block ${block.id}` : readable;
};

export interface ArenaPlayable {
  src: string;
  kind: MediaKind;
  title: string;
}

/** Audio or video the Media Player can stream: attachments first, then direct file links. */
export const getArenaPlayableMedia = (item: ArenaItem): ArenaPlayable | null => {
  if (item.kind === 'channel') return null;
  if (item.kind === 'attachment' && item.attachment?.url) {
    const kind = inferMediaKind(item.attachment.url, item.attachment.contentType);
    if (kind) return { src: item.attachment.url, kind, title: readableTitle(item, item.attachment.url, item.attachment.fileName) };
  }
  const linked = item.source?.url;
  if (linked) {
    const kind = inferMediaKind(linked);
    if (kind) return { src: linked, kind, title: readableTitle(item, linked) };
  }
  return null;
};

/** The playlist entry for a playable block, credited the way the detail panel does. */
export const arenaBlockToMediaItem = (item: ArenaItem): MediaItem | null => {
  const playable = getArenaPlayableMedia(item);
  if (!playable || item.kind === 'channel') return null;
  return createMediaItem(playable.src, {
    title: playable.title,
    artist: item.owner?.name ? `${item.owner.name} · Are.na` : 'Are.na',
    kind: playable.kind,
    sourceUrl: item.arenaUrl,
    origin: 'app',
  });
};

export interface ArenaGalleryImage {
  /** Block id, so a gallery can open at a chosen block. */
  id: number;
  src: string;
  title: string;
  arenaUrl: string;
}

/**
 * The image an Image Viewer shows for a block. Display-size renditions keep
 * paging fast; GIFs use the original so they still animate.
 */
export const getArenaImage = (item: ArenaItem): ArenaGalleryImage | null => {
  if (item.kind === 'channel') return null;
  // Uploads are often titled with a generated file name; that says nothing.
  const title = item.title && item.title !== 'Untitled' && !GENERATED_FILE_NAME.test(item.title) ? item.title : '';
  if (item.kind === 'image' && item.image) {
    const isGif = item.image.contentType === 'image/gif' || /\.gif$/i.test(item.image.filename ?? '');
    const src = isGif
      ? item.image.original.src
      : item.image.large?.src ?? item.image.medium?.src ?? item.image.original.src;
    return src ? { id: item.id, src, title, arenaUrl: item.arenaUrl } : null;
  }
  if (item.kind === 'attachment' && item.attachment?.url && item.attachment.contentType?.startsWith('image/')) {
    return { id: item.id, src: item.attachment.url, title, arenaUrl: item.arenaUrl };
  }
  return null;
};
