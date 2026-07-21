import {
  ArenaBlock,
  ArenaChannel,
  ArenaChannelPage,
  ArenaChannelPreview,
  ArenaComment,
  ArenaItem,
  ArenaPagedResult,
} from "@/types/arena";
import { toast } from "sonner";
import { DEFAULT_USERNAME, FEATURED_CHANNELS, USE_STATIC_CHANNELS } from "@/config/channels";
import { CACHE_TTL, getCachedData, incrementRequestCount, setCachedData } from "@/lib/storage";
import { cacheDebugLog } from "@/lib/debug";
import {
  RawArenaItem,
  RawArenaListResponse,
  RawBlock,
  RawChannel,
  RawOwner,
  normalizeArenaItem,
  normalizeBlock,
  normalizeChannel,
  normalizePaginationMeta,
} from "@/lib/arena-normalizers";

const API_BASE_URL = "https://api.are.na/v3";
const ARENA_CACHE_PREFIX = "arena:v3";
const USER_CHANNELS_PAGE_SIZE = 100;
const CHANNEL_PAGE_SIZE = 100;

interface RequestOptions {
  signal?: AbortSignal;
  cacheKey?: string;
  ttlMs?: number;
}

interface RawComment {
  id: number;
  body?: {
    html?: string | null;
    plain?: string | null;
  } | null;
  created_at?: string | null;
  user?: RawOwner | null;
}

function buildArenaUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
  }

  const query = searchParams.toString();
  return `${API_BASE_URL}${path}${query ? `?${query}` : ""}`;
}

async function fetchArenaJson<T>(path: string, params?: Record<string, string | number | undefined>, options?: RequestOptions): Promise<T> {
  const url = buildArenaUrl(path, params);

  if (options?.cacheKey) {
    const cached = await getCachedData<T>(options.cacheKey);
    if (cached) {
      cacheDebugLog(`[Cache] Hit: ${options.cacheKey}`);
      return cached;
    }
  }

  await incrementRequestCount("arena");

  const response = await fetch(url, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Are.na request failed (${response.status})`);
  }

  const data = (await response.json()) as T;

  if (options?.cacheKey && options.ttlMs) {
    await setCachedData(options.cacheKey, data, options.ttlMs);
  }

  return data;
}

function createStaticOwner(username: string): RawOwner {
  return {
    id: 0,
    type: "User",
    name: username,
    slug: username,
    avatar: null,
    initials: username.slice(0, 2).toUpperCase(),
  };
}

function getStaticChannels(username: string = DEFAULT_USERNAME): ArenaChannel[] {
  const owner = createStaticOwner(username);

  return FEATURED_CHANNELS.map((channel, index) =>
    normalizeChannel({
      id: index + 1,
      type: "Channel",
      slug: channel.slug,
      title: channel.title,
      description: null,
      state: "available",
      visibility: "closed",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner,
      counts: {
        blocks: 0,
        channels: 0,
        contents: 0,
        collaborators: 0,
      },
      connection: null,
    })
  );
}

async function getUserChannelsPage(username: string, page: number, signal?: AbortSignal): Promise<RawArenaListResponse<RawArenaItem>> {
  return fetchArenaJson<RawArenaListResponse<RawArenaItem>>(
    `/users/${username}/contents`,
    {
      type: "Channel",
      per: USER_CHANNELS_PAGE_SIZE,
      page,
    },
    {
      signal,
      cacheKey: `${ARENA_CACHE_PREFIX}:user:${username}:channels:${page}`,
      ttlMs: CACHE_TTL.ARENA_CHANNEL,
    }
  );
}

function isArenaChannel(item: ArenaItem): item is ArenaChannel {
  return item.kind === "channel";
}

function mergeBlockConnection(block: ArenaBlock, fallbackConnection: ArenaBlock["connection"]): ArenaBlock {
  if (block.connection || !fallbackConnection) {
    return block;
  }

  return {
    ...block,
    connection: fallbackConnection,
  };
}

export async function getUserChannels(username: string = DEFAULT_USERNAME): Promise<ArenaChannel[]> {
  if (USE_STATIC_CHANNELS) {
    console.log("[API:Arena] Using static channel list");
    return getStaticChannels(username);
  }

  try {
    const firstPage = await getUserChannelsPage(username, 1);
    const firstItems = firstPage.data.map(normalizeArenaItem).filter(isArenaChannel);
    const { totalPages } = normalizePaginationMeta(firstPage.meta);

    if (totalPages <= 1) {
      return firstItems;
    }

    const remainingPageNumbers = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
    const remainingPages = await Promise.all(
      remainingPageNumbers.map((page) => getUserChannelsPage(username, page))
    );

    return [
      ...firstItems,
      ...remainingPages.flatMap((page) => page.data.map(normalizeArenaItem).filter(isArenaChannel)),
    ];
  } catch (error) {
    console.error("[Arena API] Failed to fetch user channels:", error);
    toast.error("Failed to load channels");
    console.log("[API:Arena] Falling back to static channels");
    return getStaticChannels(username);
  }
}

export async function getChannelContents(
  channelSlug: string,
  page: number = 1,
  perPage: number = CHANNEL_PAGE_SIZE,
  signal?: AbortSignal
): Promise<ArenaChannelPage> {
  const rawPage = await fetchArenaJson<RawArenaListResponse<RawArenaItem>>(
    `/channels/${channelSlug}/contents`,
    {
      page,
      per: perPage,
      sort: "position_desc",
    },
    {
      signal,
      cacheKey: `${ARENA_CACHE_PREFIX}:channel:${channelSlug}:contents:${page}:${perPage}`,
      ttlMs: CACHE_TTL.ARENA_CHANNEL,
    }
  );

  return {
    items: rawPage.data.map(normalizeArenaItem),
    meta: normalizePaginationMeta(rawPage.meta),
  };
}

export async function getAllChannelContents(
  channelSlug: string,
  signal?: AbortSignal
): Promise<ArenaItem[]> {
  const firstPage = await getChannelContents(channelSlug, 1, CHANNEL_PAGE_SIZE, signal);

  if (firstPage.meta.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPageNumbers = Array.from(
    { length: firstPage.meta.totalPages - 1 },
    (_, index) => index + 2
  );
  const remainingPages = await Promise.all(
    remainingPageNumbers.map((page) => getChannelContents(channelSlug, page, CHANNEL_PAGE_SIZE, signal))
  );

  return [...firstPage.items, ...remainingPages.flatMap((page) => page.items)];
}

export async function getBlock(
  blockId: number | string,
  initialBlock?: ArenaBlock | null
): Promise<ArenaBlock> {
  try {
    const rawBlock = await fetchArenaJson<RawBlock>(
      `/blocks/${blockId}`,
      undefined,
      {
        cacheKey: `${ARENA_CACHE_PREFIX}:block:${blockId}`,
        ttlMs: CACHE_TTL.ARENA_BLOCK,
      }
    );

    return mergeBlockConnection(normalizeBlock(rawBlock), initialBlock?.connection ?? null);
  } catch (error) {
    console.error(`[Arena API] Error fetching block ${blockId}:`, error);
    toast.error(`Failed to load block: ${blockId}`);
    throw error;
  }
}

export async function getBlockConnections(
  blockId: number | string,
  page: number = 1,
  perPage: number = 24
): Promise<ArenaPagedResult<ArenaChannel>> {
  const response = await fetchArenaJson<RawArenaListResponse<RawArenaItem>>(
    `/blocks/${blockId}/connections`,
    { page, per: perPage, sort: "created_at_desc" },
    {
      cacheKey: `${ARENA_CACHE_PREFIX}:block:${blockId}:connections:${page}:${perPage}`,
      ttlMs: CACHE_TTL.ARENA_CHANNEL,
    }
  );

  return {
    items: response.data.map(normalizeArenaItem).filter(isArenaChannel),
    meta: normalizePaginationMeta(response.meta),
  };
}

export async function getChannelConnections(
  channelSlug: string,
  page: number = 1,
  perPage: number = 24
): Promise<ArenaPagedResult<ArenaChannel>> {
  const response = await fetchArenaJson<RawArenaListResponse<RawArenaItem>>(
    `/channels/${channelSlug}/connections`,
    { page, per: perPage, sort: "created_at_desc" },
    {
      cacheKey: `${ARENA_CACHE_PREFIX}:channel:${channelSlug}:connections:${page}:${perPage}`,
      ttlMs: CACHE_TTL.ARENA_CHANNEL,
    }
  );

  return {
    items: response.data.map(normalizeArenaItem).filter(isArenaChannel),
    meta: normalizePaginationMeta(response.meta),
  };
}

export async function getBlockComments(
  blockId: number | string,
  page: number = 1,
  perPage: number = 24
): Promise<ArenaPagedResult<ArenaComment>> {
  const response = await fetchArenaJson<RawArenaListResponse<RawComment>>(
    `/blocks/${blockId}/comments`,
    { page, per: perPage },
    {
      cacheKey: `${ARENA_CACHE_PREFIX}:block:${blockId}:comments:${page}:${perPage}`,
      ttlMs: CACHE_TTL.ARENA_BLOCK,
    }
  );

  return {
    items: response.data.map((comment) => ({
      id: comment.id,
      bodyHtml: comment.body?.html ?? null,
      bodyPlain: comment.body?.plain ?? "",
      createdAt: comment.created_at ?? null,
      user: comment.user
        ? {
            id: comment.user.id,
            type: comment.user.type,
            name: comment.user.name,
            slug: comment.user.slug,
            avatar: comment.user.avatar ?? null,
            initials: comment.user.initials,
          }
        : null,
    })),
    meta: normalizePaginationMeta(response.meta),
  };
}

async function getChannelFollowersCount(channelSlug: string): Promise<number | undefined> {
  try {
    const response = await fetchArenaJson<RawArenaListResponse<RawOwner>>(
      `/channels/${channelSlug}/followers`,
      {
        per: 1,
      },
      {
        cacheKey: `${ARENA_CACHE_PREFIX}:channel:${channelSlug}:followers`,
        ttlMs: CACHE_TTL.ARENA_CHANNEL,
      }
    );

    return response.meta.total_count;
  } catch (error) {
    console.warn(`[Arena API] Failed to fetch followers for ${channelSlug}:`, error);
    return undefined;
  }
}

export async function getChannelPreview(
  channelSlug: string,
  initialChannel?: ArenaChannel | null
): Promise<ArenaChannelPreview> {
  try {
    const rawChannel = await fetchArenaJson<RawChannel>(
      `/channels/${channelSlug}`,
      undefined,
      {
        cacheKey: `${ARENA_CACHE_PREFIX}:channel:${channelSlug}:detail`,
        ttlMs: CACHE_TTL.ARENA_CHANNEL,
      }
    );

    const followers = await getChannelFollowersCount(channelSlug);
    const normalizedChannel = normalizeChannel(rawChannel, followers);

    return {
      ...normalizedChannel,
      connection: normalizedChannel.connection ?? initialChannel?.connection ?? null,
      counts: {
        ...normalizedChannel.counts,
        ...(typeof followers === "number"
          ? { followers }
          : initialChannel?.counts.followers !== undefined
            ? { followers: initialChannel.counts.followers }
            : {}),
      },
    };
  } catch (error) {
    console.error(`[Arena API] Error fetching channel ${channelSlug}:`, error);

    if (initialChannel) {
      return initialChannel;
    }

    throw error;
  }
}
