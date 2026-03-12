import {
  ArenaAttachment,
  ArenaBlock,
  ArenaChannel,
  ArenaConnection,
  ArenaCounts,
  ArenaEmbed,
  ArenaImage,
  ArenaImageVariant,
  ArenaItem,
  ArenaOwner,
  ArenaPaginationMeta,
  ArenaSource,
} from "@/types/arena";

export interface RawMarkdownContent {
  markdown: string;
  html: string;
  plain: string;
}

export interface RawOwner {
  id: number;
  type: "User" | "Group";
  name: string;
  slug: string;
  avatar: string | null;
  initials: string;
}

export interface RawSourceProvider {
  name: string;
  url: string;
}

export interface RawSource {
  url: string;
  title?: string | null;
  provider?: RawSourceProvider | null;
}

export interface RawImageVariant {
  src: string;
  src_2x?: string;
  width?: number;
  height?: number;
}

export interface RawImage {
  alt_text?: string | null;
  blurhash?: string | null;
  width?: number;
  height?: number;
  src: string;
  aspect_ratio?: number;
  content_type?: string;
  filename?: string;
  file_size?: number;
  updated_at?: string;
  small?: RawImageVariant;
  medium?: RawImageVariant;
  large?: RawImageVariant;
  square?: RawImageVariant;
}

export interface RawAttachment {
  url: string;
  file_name?: string;
  filename?: string;
  content_type?: string;
  file_content_type?: string;
  file_size?: number;
  file_content_size?: number;
}

export interface RawEmbed {
  url?: string | null;
  html?: string | null;
  type?: string | null;
}

export interface RawConnection {
  id: number;
  position: number;
  pinned: boolean;
  connected_at: string;
  connected_by?: RawOwner | null;
}

export interface RawBlock {
  id: number;
  type: string;
  base_type: "Block";
  title: string | null;
  description?: RawMarkdownContent | null;
  state: string;
  visibility: string;
  comment_count: number;
  created_at: string;
  updated_at: string;
  user: RawOwner;
  source?: RawSource | null;
  image?: RawImage | null;
  content?: RawMarkdownContent | null;
  attachment?: RawAttachment | null;
  embed?: RawEmbed | null;
  connection?: RawConnection | null;
}

export interface RawChannel {
  id: number;
  type: "Channel";
  slug: string;
  title: string;
  description?: RawMarkdownContent | null;
  state: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  owner: RawOwner;
  counts: {
    blocks: number;
    channels: number;
    contents: number;
    collaborators: number;
  };
  connection?: RawConnection | null;
}

export type RawArenaItem = RawBlock | RawChannel;

export interface RawPaginationMeta {
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  per_page: number;
  total_pages: number;
  total_count: number;
  has_more_pages: boolean;
}

export interface RawArenaListResponse<T> {
  data: T[];
  meta: RawPaginationMeta;
}

const BLOCK_KIND_MAP: Record<string, ArenaBlock["kind"]> = {
  Text: "text",
  Image: "image",
  Link: "link",
  Attachment: "attachment",
  Embed: "embed",
};

function normalizeMarkdownContent(value?: RawMarkdownContent | null): { html: string | null; plain: string | null } {
  return {
    html: value?.html ?? null,
    plain: value?.plain ?? null,
  };
}

function normalizeOwner(owner?: RawOwner | null): ArenaOwner | null {
  if (!owner) {
    return null;
  }

  return {
    id: owner.id,
    type: owner.type,
    name: owner.name,
    slug: owner.slug,
    avatar: owner.avatar ?? null,
    initials: owner.initials,
  };
}

function normalizeSource(source?: RawSource | null): ArenaSource | null {
  if (!source?.url) {
    return null;
  }

  return {
    url: source.url,
    title: source.title ?? null,
    provider: source.provider
      ? {
          name: source.provider.name,
          url: source.provider.url,
        }
      : null,
  };
}

function normalizeImageVariant(variant?: RawImageVariant | null): ArenaImageVariant | null {
  if (!variant?.src) {
    return null;
  }

  return {
    src: variant.src,
    src2x: variant.src_2x ?? null,
    width: variant.width ?? null,
    height: variant.height ?? null,
  };
}

function normalizeImage(image?: RawImage | null): ArenaImage | null {
  if (!image?.src) {
    return null;
  }

  return {
    altText: image.alt_text ?? null,
    blurhash: image.blurhash ?? null,
    width: image.width ?? null,
    height: image.height ?? null,
    aspectRatio: image.aspect_ratio ?? null,
    contentType: image.content_type ?? null,
    filename: image.filename ?? null,
    fileSize: image.file_size ?? null,
    updatedAt: image.updated_at ?? null,
    original: {
      src: image.src,
      width: image.width ?? null,
      height: image.height ?? null,
    },
    small: normalizeImageVariant(image.small),
    medium: normalizeImageVariant(image.medium),
    large: normalizeImageVariant(image.large),
    square: normalizeImageVariant(image.square),
  };
}

function normalizeAttachment(attachment?: RawAttachment | null): ArenaAttachment | null {
  if (!attachment?.url) {
    return null;
  }

  return {
    url: attachment.url,
    fileName: attachment.file_name ?? attachment.filename ?? null,
    contentType: attachment.content_type ?? attachment.file_content_type ?? null,
    fileSize: attachment.file_size ?? attachment.file_content_size ?? null,
  };
}

function normalizeEmbed(embed?: RawEmbed | null): ArenaEmbed | null {
  if (!embed) {
    return null;
  }

  return {
    url: embed.url ?? null,
    html: embed.html ?? null,
    embedType: embed.type ?? null,
  };
}

function normalizeConnection(connection?: RawConnection | null): ArenaConnection | null {
  if (!connection) {
    return null;
  }

  return {
    id: connection.id,
    position: connection.position,
    pinned: connection.pinned,
    connectedAt: connection.connected_at,
    connectedBy: normalizeOwner(connection.connected_by),
  };
}

function normalizeCounts(rawCounts: RawChannel["counts"], followers?: number): ArenaCounts {
  return {
    blocks: rawCounts.blocks,
    channels: rawCounts.channels,
    contents: rawCounts.contents,
    collaborators: rawCounts.collaborators,
    ...(typeof followers === "number" ? { followers } : {}),
  };
}

export function normalizePaginationMeta(meta: RawPaginationMeta): ArenaPaginationMeta {
  return {
    currentPage: meta.current_page,
    nextPage: meta.next_page,
    prevPage: meta.prev_page,
    perPage: meta.per_page,
    totalPages: meta.total_pages,
    totalCount: meta.total_count,
    hasMorePages: meta.has_more_pages,
  };
}

export function normalizeChannel(rawChannel: RawChannel, followers?: number): ArenaChannel {
  const description = normalizeMarkdownContent(rawChannel.description);

  return {
    id: rawChannel.id,
    kind: "channel",
    slug: rawChannel.slug,
    title: rawChannel.title,
    createdAt: rawChannel.created_at,
    updatedAt: rawChannel.updated_at,
    state: rawChannel.state,
    visibility: rawChannel.visibility,
    descriptionHtml: description.html,
    descriptionPlain: description.plain,
    owner: normalizeOwner(rawChannel.owner),
    source: null,
    image: null,
    connection: normalizeConnection(rawChannel.connection),
    counts: normalizeCounts(rawChannel.counts, followers),
    arenaUrl: `https://www.are.na/channel/${rawChannel.slug}`,
  };
}

export function normalizeBlock(rawBlock: RawBlock): ArenaBlock {
  const description = normalizeMarkdownContent(rawBlock.description);
  const content = normalizeMarkdownContent(rawBlock.content);
  const kind = BLOCK_KIND_MAP[rawBlock.type] ?? "text";

  return {
    id: rawBlock.id,
    kind,
    title: rawBlock.title?.trim() || "Untitled",
    createdAt: rawBlock.created_at,
    updatedAt: rawBlock.updated_at,
    state: rawBlock.state,
    visibility: rawBlock.visibility,
    descriptionHtml: description.html,
    descriptionPlain: description.plain,
    owner: normalizeOwner(rawBlock.user),
    source: normalizeSource(rawBlock.source),
    image: normalizeImage(rawBlock.image),
    connection: normalizeConnection(rawBlock.connection),
    arenaUrl: `https://www.are.na/block/${rawBlock.id}`,
    textHtml: content.html,
    textPlain: content.plain,
    attachment: normalizeAttachment(rawBlock.attachment),
    embed: normalizeEmbed(rawBlock.embed),
  };
}

export function normalizeArenaItem(rawItem: RawArenaItem): ArenaItem {
  if (rawItem.type === "Channel") {
    return normalizeChannel(rawItem);
  }

  return normalizeBlock(rawItem);
}
