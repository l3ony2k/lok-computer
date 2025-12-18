
import { ArenaChannel, ArenaChannelContents } from "@/types/arena";
import { toast } from "sonner";
import { FEATURED_CHANNELS, USE_STATIC_CHANNELS, DEFAULT_USERNAME } from "@/config/channels";
import { getCachedData, setCachedData, incrementRequestCount, CACHE_TTL } from "@/lib/storage";


const API_BASE_URL = "https://api.are.na/v2";

// Simulated channels response for when we can't use the API
function getStaticChannels(): ArenaChannel[] {
  return FEATURED_CHANNELS.map((channel, index) => ({
    id: index + 1,
    title: channel.title,
    length: 0,
    status: "closed",
    user_id: 0,
    slug: channel.slug,
    added_to_at: new Date().toISOString(),
    published: true,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    open: true,
    collaboration: false,
    collaborator_count: 0,
    owner: {
      id: 0,
      slug: DEFAULT_USERNAME,
      username: DEFAULT_USERNAME,
      first_name: "",
      last_name: "",
      full_name: DEFAULT_USERNAME,
      avatar: ""
    },
    contents_updated_at: new Date().toISOString(),
    class: "Channel",
    user: {
      id: 0,
      slug: DEFAULT_USERNAME,
      username: DEFAULT_USERNAME,
      first_name: "",
      last_name: "",
      full_name: DEFAULT_USERNAME,
      avatar: ""
    },
    base_class: "Channel",
    current_user_channels_index: null
  }));
}

export async function getUserChannels(username: string = DEFAULT_USERNAME): Promise<ArenaChannel[]> {
  if (USE_STATIC_CHANNELS) {
    console.log("Using static channel list instead of API");
    return getStaticChannels();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/${username}/channels?per=100`);

    if (!response.ok) {
      throw new Error(`Failed to fetch channels: ${response.status}`);
    }

    const data = await response.json();
    return data.channels || [];
  } catch (error) {
    console.error("Error fetching user channels:", error);
    toast.error("Failed to load channels");

    // Fallback to static channels
    console.log("Falling back to static channel list");
    return getStaticChannels();
  }
}

export async function getChannelContents(
  channelSlug: string,
  username: string = DEFAULT_USERNAME,
  page: number = 1,
  perPage: number = 100,
  signal?: AbortSignal
): Promise<ArenaChannelContents> {
  const cacheKey = `arena:channel:${channelSlug}:${page}`;

  // Check cache first (but not if we have an abort signal - those are for fresh fetches)
  if (!signal) {
    try {
      const cached = await getCachedData<ArenaChannelContents>(cacheKey);
      if (cached) {
        console.log(`[Arena API] Cache hit for channel ${channelSlug} page ${page}`);
        return cached;
      }
    } catch (e) {
      console.warn('[Arena API] Cache check failed:', e);
    }
  }

  try {
    await incrementRequestCount('arena');
    // No need to include username for public channels
    const url = `${API_BASE_URL}/channels/${channelSlug}?page=${page}&per=${perPage}`;
    console.log(`[Arena API] Requesting channel contents from: ${url}`);

    const fetchOptions: RequestInit = {
      signal // Add AbortSignal to request options
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`Failed to fetch channel contents: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Arena API] Received channel contents for ${channelSlug}, page ${page}`);

    // Store in cache
    try {
      await setCachedData(cacheKey, data, CACHE_TTL.ARENA_CHANNEL);
    } catch (e) {
      console.warn('[Arena API] Failed to cache data:', e);
    }

    return data;
  } catch (error: any) {
    // Don't show toast for aborted requests
    if (error.name === 'AbortError') {
      console.log(`[Arena API] Fetch for channel ${channelSlug} was aborted`);
      throw error;
    }

    console.error(`[Arena API] Error fetching channel ${channelSlug}:`, error);
    toast.error(`Failed to load channel: ${channelSlug}`);
    throw error;
  }
}

export async function getBlock(blockId: number | string) {
  const cacheKey = `arena:block:${blockId}`;

  // Check cache first
  try {
    const cached = await getCachedData<any>(cacheKey);
    if (cached) {
      console.log(`[Arena API] Cache hit for block ${blockId}`);
      return cached;
    }
  } catch (e) {
    console.warn('[Arena API] Cache check failed:', e);
  }

  try {
    await incrementRequestCount('arena');
    const response = await fetch(`${API_BASE_URL}/blocks/${blockId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch block: ${response.status}`);
    }

    const data = await response.json();

    // Store in cache
    try {
      await setCachedData(cacheKey, data, CACHE_TTL.ARENA_BLOCK);
    } catch (e) {
      console.warn('[Arena API] Failed to cache data:', e);
    }

    return data;
  } catch (error) {
    console.error(`[Arena API] Error fetching block ${blockId}:`, error);
    toast.error(`Failed to load block: ${blockId}`);
    throw error;
  }
}
