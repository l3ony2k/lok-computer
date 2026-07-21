export type ArenaKind = "channel" | "text" | "image" | "link" | "attachment" | "embed";
export type ArenaOwnerType = "User" | "Group";

export interface ArenaOwner {
  id: number;
  type: ArenaOwnerType;
  name: string;
  slug: string;
  avatar: string | null;
  initials: string;
}

export interface ArenaSourceProvider {
  name: string;
  url: string;
}

export interface ArenaSource {
  url: string;
  title: string | null;
  provider: ArenaSourceProvider | null;
}

export interface ArenaImageVariant {
  src: string;
  src2x?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface ArenaImage {
  altText: string | null;
  blurhash: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  contentType: string | null;
  filename: string | null;
  fileSize: number | null;
  updatedAt: string | null;
  original: ArenaImageVariant;
  small: ArenaImageVariant | null;
  medium: ArenaImageVariant | null;
  large: ArenaImageVariant | null;
  square: ArenaImageVariant | null;
}

export interface ArenaAttachment {
  url: string;
  fileName: string | null;
  contentType: string | null;
  fileSize: number | null;
}

export interface ArenaEmbed {
  url: string | null;
  html: string | null;
  embedType: string | null;
}

export interface ArenaConnection {
  id: number;
  position: number;
  pinned: boolean;
  connectedAt: string;
  connectedBy: ArenaOwner | null;
}

export interface ArenaCounts {
  blocks: number;
  channels: number;
  contents: number;
  collaborators: number;
  followers?: number;
}

export interface ArenaPaginationMeta {
  currentPage: number;
  nextPage: number | null;
  prevPage: number | null;
  perPage: number;
  totalPages: number;
  totalCount: number;
  hasMorePages: boolean;
}

export interface ArenaBaseItem {
  id: number;
  kind: ArenaKind;
  title: string;
  createdAt: string;
  updatedAt: string;
  state: string;
  visibility: string;
  descriptionHtml: string | null;
  descriptionPlain: string | null;
  owner: ArenaOwner | null;
  source: ArenaSource | null;
  image: ArenaImage | null;
  connection: ArenaConnection | null;
  commentCount: number;
  arenaUrl: string;
}

export interface ArenaChannel extends ArenaBaseItem {
  kind: "channel";
  slug: string;
  counts: ArenaCounts;
}

export interface ArenaBlock extends ArenaBaseItem {
  kind: Exclude<ArenaKind, "channel">;
  textHtml: string | null;
  textPlain: string | null;
  attachment: ArenaAttachment | null;
  embed: ArenaEmbed | null;
}

export type ArenaItem = ArenaChannel | ArenaBlock;
export type ArenaChannelPreview = ArenaChannel;

export interface ArenaChannelPage {
  items: ArenaItem[];
  meta: ArenaPaginationMeta;
}

export interface ArenaComment {
  id: number;
  bodyHtml: string | null;
  bodyPlain: string;
  createdAt: string | null;
  user: ArenaOwner | null;
}

export interface ArenaPagedResult<T> {
  items: T[];
  meta: ArenaPaginationMeta;
}
