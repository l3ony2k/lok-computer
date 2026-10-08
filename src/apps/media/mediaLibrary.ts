/**
 * Media Player domain: playlist items, launch requests, and source helpers.
 *
 * Kept free of React and DOM work so other apps can import it to hand media
 * to the player without pulling the player chunk into their own.
 */

export type MediaKind = 'audio' | 'video';

export interface MediaItem {
  id: string;
  title: string;
  src: string;
  kind: MediaKind;
  artist?: string;
  /** Attribution line for licensed library items. */
  credit?: string;
  /** Page that documents the source and its license. */
  sourceUrl?: string;
  /** Seconds, filled in once metadata loads. */
  duration?: number;
  /** `file` items wrap object URLs and do not survive a reload. */
  origin: 'library' | 'url' | 'file' | 'app';
}

/** A one-shot instruction delivered to the running player through launch props. */
export interface MediaRequest {
  id: string;
  items: MediaItem[];
  /** Start playing the first requested item. */
  play: boolean;
}

export const MEDIA_PLAYER_TYPE = 'MediaPlayer';

/**
 * Bundled starter library. Every file is public domain or Creative Commons and
 * served by Wikimedia Commons, which sends CORS headers so the spectrum
 * analyzer can read audio samples.
 */
export const DEFAULT_LIBRARY: MediaItem[] = [
  {
    id: 'library-gymnopedie-1',
    title: 'Gymnopédie No. 1',
    artist: 'Erik Satie · Robin Alciatore',
    kind: 'audio',
    src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg.mp3',
    credit: 'Public domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg',
    duration: 183.6,
    origin: 'library',
  },
  {
    id: 'library-clair-de-lune',
    title: 'Clair de lune',
    artist: 'Claude Debussy',
    kind: 'audio',
    src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/b/be/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg.mp3',
    credit: 'Public domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg',
    duration: 304.1,
    origin: 'library',
  },
  {
    id: 'library-nocturne-op9-2',
    title: 'Nocturne in E-flat, Op. 9 No. 2',
    artist: 'Frédéric Chopin',
    kind: 'audio',
    src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/5/5c/Frederic_Chopin_-_Nocturne_Eb_major_Opus_9%2C_number_2.ogg/Frederic_Chopin_-_Nocturne_Eb_major_Opus_9%2C_number_2.ogg.mp3',
    credit: 'Public domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Frederic_Chopin_-_Nocturne_Eb_major_Opus_9,_number_2.ogg',
    duration: 253.1,
    origin: 'library',
  },
  {
    id: 'library-monkeys-spinning-monkeys',
    title: 'Monkeys Spinning Monkeys',
    artist: 'Kevin MacLeod',
    kind: 'audio',
    src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/37/Kevin_MacLeod_-_Monkeys_Spinning_Monkeys.ogg/Kevin_MacLeod_-_Monkeys_Spinning_Monkeys.ogg.mp3',
    credit: 'Kevin MacLeod (incompetech.com), CC BY 3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kevin_MacLeod_-_Monkeys_Spinning_Monkeys.ogg',
    duration: 125.1,
    origin: 'library',
  },
  {
    id: 'library-big-buck-bunny',
    title: 'Big Buck Bunny',
    artist: 'Blender Foundation',
    kind: 'video',
    src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.480p.vp9.webm',
    credit: '© Blender Foundation, bigbuckbunny.org, CC BY 3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Big_Buck_Bunny_4K.webm',
    duration: 634.6,
    origin: 'library',
  },
];

const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'oga', 'ogg', 'opus', 'wav', 'flac', 'weba'];
const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'webm', 'ogv', 'mov', 'mkv'];

const extensionOf = (src: string) => {
  try {
    const { pathname } = new URL(src, 'https://lok.computer');
    return pathname.split('.').pop()?.toLowerCase() ?? '';
  } catch {
    return '';
  }
};

/** Kind from a MIME type, then the URL extension. Unknown sources are treated as audio. */
export const inferMediaKind = (src: string, mime?: string | null): MediaKind | null => {
  const type = mime?.toLowerCase() ?? '';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/') || type === 'application/ogg') return 'audio';
  if (type) return null;

  const extension = extensionOf(src);
  if (VIDEO_EXTENSIONS.includes(extension)) return 'video';
  if (AUDIO_EXTENSIONS.includes(extension)) return 'audio';
  return null;
};

export const isPlayableMedia = (src: string | null | undefined, mime?: string | null) => (
  Boolean(src) && inferMediaKind(src as string, mime) !== null
);

/** A readable title from the last path segment, without extension or encoding. */
export const titleFromSource = (src: string) => {
  try {
    const { pathname, hostname } = new URL(src, 'https://lok.computer');
    const segment = decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '');
    const title = segment.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_+]+/g, ' ').trim();
    return title || hostname || 'Untitled';
  } catch {
    return 'Untitled';
  }
};

let sequence = 0;
export const createMediaId = (prefix: string) => {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
};

export const normalizeMediaUrl = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

export const createMediaItem = (
  src: string,
  options: Partial<Omit<MediaItem, 'id' | 'src'>> = {},
): MediaItem => ({
  id: createMediaId(options.origin ?? 'url'),
  src,
  title: options.title?.trim() || titleFromSource(src),
  kind: options.kind ?? inferMediaKind(src) ?? 'audio',
  artist: options.artist,
  credit: options.credit,
  sourceUrl: options.sourceUrl,
  duration: options.duration,
  origin: options.origin ?? 'url',
});

/** Builds the launch props payload other apps pass to the player. */
export const createMediaRequest = (items: MediaItem[], play = true): MediaRequest => ({
  id: createMediaId('request'),
  items,
  play,
});

export interface MediaPlayerState {
  playlist: MediaItem[];
  currentId: string | null;
  volume: number;
  muted: boolean;
  repeat: 'off' | 'all' | 'one';
  shuffle: boolean;
  rate: number;
  showPlaylist: boolean;
  /** Resume point for the current item, in seconds. */
  position: number;
  /** Requests already applied, so a restored window does not enqueue twice. */
  handledRequests: string[];
}

export const DEFAULT_PLAYER_STATE: MediaPlayerState = {
  playlist: DEFAULT_LIBRARY,
  currentId: DEFAULT_LIBRARY[0].id,
  volume: 0.8,
  muted: false,
  repeat: 'all',
  shuffle: false,
  rate: 1,
  showPlaylist: true,
  position: 0,
  handledRequests: [],
};

const isMediaItem = (value: unknown): value is MediaItem => {
  if (!value || typeof value !== 'object') return false;
  const item = value as MediaItem;
  return typeof item.id === 'string'
    && typeof item.src === 'string'
    && typeof item.title === 'string'
    && (item.kind === 'audio' || item.kind === 'video');
};

const clamp = (value: unknown, min: number, max: number, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
);

/** Validates stored state and drops object-URL items, which die with the page. */
export const normalizePlayerState = (stored: unknown, fallback: MediaPlayerState = DEFAULT_PLAYER_STATE): MediaPlayerState => {
  if (!stored || typeof stored !== 'object') return fallback;
  const value = stored as Partial<MediaPlayerState>;
  const playlist = Array.isArray(value.playlist)
    ? value.playlist.filter(isMediaItem).filter((item) => item.origin !== 'file' && !item.src.startsWith('blob:'))
    : fallback.playlist;
  const currentId = playlist.some((item) => item.id === value.currentId)
    ? value.currentId as string
    : playlist[0]?.id ?? null;

  return {
    playlist,
    currentId,
    volume: clamp(value.volume, 0, 1, fallback.volume),
    muted: typeof value.muted === 'boolean' ? value.muted : fallback.muted,
    repeat: value.repeat === 'off' || value.repeat === 'one' || value.repeat === 'all' ? value.repeat : fallback.repeat,
    shuffle: typeof value.shuffle === 'boolean' ? value.shuffle : fallback.shuffle,
    rate: clamp(value.rate, 0.25, 4, fallback.rate),
    showPlaylist: typeof value.showPlaylist === 'boolean' ? value.showPlaylist : fallback.showPlaylist,
    position: currentId === value.currentId ? clamp(value.position, 0, Number.MAX_SAFE_INTEGER, 0) : 0,
    handledRequests: Array.isArray(value.handledRequests)
      ? value.handledRequests.filter((id): id is string => typeof id === 'string').slice(-20)
      : [],
  };
};

/** Next index for the transport buttons and track-end handling; null means stop. */
export const pickNextIndex = (
  length: number,
  current: number,
  direction: 1 | -1,
  { repeat, shuffle }: Pick<MediaPlayerState, 'repeat' | 'shuffle'>,
  random: () => number = Math.random,
): number | null => {
  if (length === 0) return null;
  if (shuffle && length > 1) {
    const offset = 1 + Math.floor(random() * (length - 1));
    return (current + offset) % length;
  }
  const next = current + direction;
  if (next >= 0 && next < length) return next;
  return repeat === 'all' ? (next + length) % length : null;
};

export const formatMediaTime = (seconds: number | undefined | null) => {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};
