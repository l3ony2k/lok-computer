import {
  ArenaBlock,
  ArenaChannel,
  ArenaChannelPage,
  ArenaChannelPreview,
  ArenaItem,
} from "@/types/arena";
import { toast } from "sonner";
import { DEFAULT_USERNAME, FEATURED_CHANNELS, USE_STATIC_CHANNELS } from "@/config/channels";
import { CACHE_TTL, getCachedData, incrementRequestCount, setCachedData } from "@/lib/storage";
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
      console.log(`[Cache] Hit: ${options.cacheKey}`);
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
