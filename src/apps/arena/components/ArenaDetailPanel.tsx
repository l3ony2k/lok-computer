import React, { useEffect, useState } from "react";
import {
  ArenaBlock,
  ArenaChannel,
  ArenaComment,
  ArenaConnection,
  ArenaItem,
} from "@/types/arena";
import {
  getBlock,
  getBlockComments,
  getBlockConnections,
  getChannelConnections,
  getChannelPreview,
} from "@/lib/api";
import { RetroButton } from "@/components/ui/RetroButton";
import { StateMessage } from "@/components/ui/StateMessage";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface ArenaDetailPanelProps {
  item?: ArenaItem | null;
  blockId?: number | string;
  initialConnection?: ArenaConnection | null;
  onOpenChannel?: (channel: ArenaChannel) => void;
  onOpenImage?: (imageUrl: string, title: string) => void;
  clearWhileLoading?: boolean;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const seconds = Math.round((Date.now() - time) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 30 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(time).toLocaleDateString();
};

const getBestImageSource = (item: ArenaItem) => (
  item.image?.large?.src
  ?? item.image?.medium?.src
  ?? item.image?.original.src
  ?? item.image?.small?.src
  ?? null
);

const getSourceActionUrl = (block: ArenaBlock) => {
  if (block.kind === "image") return block.image?.original.src || null;
  if (block.kind === "attachment") return block.attachment?.url || null;
  return block.source?.url || block.embed?.url || null;
};

const getVisibilityClass = (visibility?: string) => {
  if (visibility === "public") return "arena-vis-public";
  if (visibility === "private") return "arena-vis-private";
  return "arena-vis-closed";
};

const getVisibilityLabel = (visibility?: string) => ({
  public: "Public",
  private: "Private",
  closed: "Closed",
}[visibility || ""] || "Unknown");

const MetaItem = ({ label, children, wide = false, wrap = false }: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
  wrap?: boolean;
}) => (
  <div className={`arena-detail-meta-item ${wide ? "arena-detail-meta-wide" : ""} ${wrap ? "arena-detail-meta-wrap" : "arena-detail-meta-compact"}`}>
    <strong>{label}: </strong>{children}
  </div>
);

const ConnectionsSection = ({ item, onOpenChannel }: {
  item: ArenaItem;
  onOpenChannel?: (channel: ArenaChannel) => void;
}) => {
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setChannels([]);
    setTotal(null);
    setPage(1);
    setHasMore(false);
    setOpen(false);
    setLoading(true);
    setError(false);

    const load = async () => {
      try {
        const result = item.kind === "channel"
          ? await getChannelConnections(item.slug, 1, 24)
          : await getBlockConnections(item.id, 1, 24);
        if (!active) return;
        setChannels(result.items);
        setTotal(result.meta.totalCount);
        setHasMore(result.meta.hasMorePages);
      } catch (connectionError) {
        console.error("Failed to load Are.na connections", connectionError);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [item]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const result = item.kind === "channel"
        ? await getChannelConnections(item.slug, nextPage, 24)
        : await getBlockConnections(item.id, nextPage, 24);
      setChannels((current) => [...current, ...result.items]);
      setPage(nextPage);
      setHasMore(result.meta.hasMorePages);
    } catch (connectionError) {
      console.error("Failed to load more Are.na connections", connectionError);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const label = loading && total === null
    ? "loading..."
    : error && total === null
      ? "failed to load"
      : total === 0
        ? "none"
        : `${total ?? channels.length} ${(total ?? channels.length) === 1 ? "channel" : "channels"}`;

  return (
    <MetaItem label="Connections" wide wrap>
      {total && total > 0 ? (
        <>
          <button type="button" className="arena-detail-toggle" onClick={() => setOpen((current) => !current)}>
            {label} {open ? "▾" : "▸"}
          </button>
          {open && (
            <div className="arena-detail-expand-list">
              {channels.map((channel) => (
                <button key={channel.id} type="button" className="arena-detail-connection" onClick={() => onOpenChannel?.(channel)}>
                  <span className={getVisibilityClass(channel.visibility)}>{channel.title || "Untitled Channel"}</span>
                  <span>{[channel.owner?.name, `${channel.counts.contents} blocks`].filter(Boolean).join(" · ")}</span>
                </button>
              ))}
              {hasMore && (
                <button type="button" className="arena-detail-load-more" onClick={loadMore} disabled={loading}>
                  {loading ? "Loading..." : `Load more (${channels.length}/${total})`}
                </button>
              )}
            </div>
          )}
        </>
      ) : <span className="arena-detail-muted">{label}</span>}
    </MetaItem>
  );
};

const CommentsSection = ({ block }: { block: ArenaBlock }) => {
  const [comments, setComments] = useState<ArenaComment[]>([]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  if (block.commentCount < 1) return null;

  const loadPage = async (nextPage: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await getBlockComments(block.id, nextPage, 24);
      setComments((current) => nextPage === 1 ? result.items : [...current, ...result.items]);
      setPage(nextPage);
      setHasMore(result.meta.hasMorePages);
    } catch (commentError) {
      console.error("Failed to load Are.na comments", commentError);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && page === 0) loadPage(1);
  };

  return (
    <MetaItem label="Comments" wide wrap>
      <button type="button" className="arena-detail-toggle" onClick={toggle}>
        {block.commentCount} {block.commentCount === 1 ? "comment" : "comments"} {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="arena-detail-expand-list">
          {loading && comments.length === 0 && <div className="arena-detail-list-status">Loading...</div>}
          {comments.map((comment) => (
            <div key={comment.id} className="arena-detail-comment">
              <div className="arena-detail-comment-header">
                {comment.user?.slug ? (
                  <a href={`https://www.are.na/${comment.user.slug}`} target="_blank" rel="noopener noreferrer">{comment.user.name}</a>
                ) : <strong>{comment.user?.name || "Unknown"}</strong>}
                <span>{formatRelativeTime(comment.createdAt)}</span>
              </div>
              <div
                className="arena-detail-comment-body"
                {...(comment.bodyHtml
                  ? { dangerouslySetInnerHTML: { __html: comment.bodyHtml } }
                  : { children: comment.bodyPlain })}
              />
            </div>
          ))}
          {hasMore && (
            <button type="button" className="arena-detail-load-more" onClick={() => loadPage(page + 1)} disabled={loading}>
              {loading ? "Loading..." : `Load more (${comments.length}/${block.commentCount})`}
            </button>
          )}
        </div>
      )}
    </MetaItem>
  );
};

const BlockContent = ({ block, onOpenImage }: {
  block: ArenaBlock;
  onOpenImage?: (imageUrl: string, title: string) => void;
}) => {
  const imageUrl = getBestImageSource(block);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={block.image?.altText || block.title || "Are.na block"}
        className={onOpenImage ? "arena-detail-clickable-image" : ""}
        onClick={() => onOpenImage?.(imageUrl, block.title || "Image")}
      />
    );
  }

  if (block.kind === "text" && block.textHtml) {
    return <div className="arena-detail-rich-text" dangerouslySetInnerHTML={{ __html: block.textHtml }} />;
  }

  if (block.kind === "attachment" && block.attachment?.url) {
    return <a className="arena-detail-file-link" href={block.attachment.url} target="_blank" rel="noopener noreferrer">{block.attachment.fileName || "Download attachment"}</a>;
  }

  if (block.kind === "embed" && block.embed?.html) {
    return <div className="arena-detail-embed" dangerouslySetInnerHTML={{ __html: block.embed.html }} />;
  }

  return <div className="arena-detail-fallback-content">{block.title || `Untitled ${block.kind}`}</div>;
};

export const ArenaDetailPanel = ({ item: initialItem, blockId, initialConnection, onOpenChannel, onOpenImage, clearWhileLoading = false }: ArenaDetailPanelProps) => {
  const [item, setItem] = useState<ArenaItem | null>(clearWhileLoading ? null : initialItem ?? null);
  const [loading, setLoading] = useState(clearWhileLoading || !initialItem);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const target = initialItem;
      try {
        if (clearWhileLoading) setItem(null);
        setLoading(true);
        setError(null);
        if (target?.kind === "channel") {
          const channel = await getChannelPreview(target.slug, target);
          if (active) setItem(channel);
        } else {
          const id = target?.id ?? blockId;
          if (id === undefined) throw new Error("Missing block ID");
          const block = await getBlock(id, target?.kind !== "channel" ? target : null);
          if (active) {
            setItem(!block.connection && initialConnection ? { ...block, connection: initialConnection } : block);
          }
        }
      } catch (detailError) {
        console.error("Failed to load Are.na detail", detailError);
        if (active) setError("Failed to load details");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [initialItem, blockId, initialConnection, clearWhileLoading]);

  if (loading && !item) return <StateMessage>Loading details...</StateMessage>;
  if (error || !item) return <StateMessage>{error || "Item not found"}</StateMessage>;

  const isChannel = item.kind === "channel";
  const block = !isChannel ? item : null;
  const sourceUrl = block ? getSourceActionUrl(block) : null;

  return (
    <div className="arena-detail-panel">
      <ResizablePanelGroup direction="vertical" className="arena-detail-split">
        <ResizablePanel defaultSize={70} minSize={20}>
          <div className="arena-detail-content-wrapper">
            {isChannel ? (
              <div className="arena-channel-detail">
                <div className="arena-channel-detail-text">
                  {item.descriptionHtml && <div className="arena-detail-rich-text" dangerouslySetInnerHTML={{ __html: item.descriptionHtml }} />}
                  {onOpenChannel && <RetroButton className="arena-detail-action arena-detail-action-primary" variant="primary" onClick={() => onOpenChannel(item)}>→ Open Channel</RetroButton>}
                </div>
                {getBestImageSource(item) && <img src={getBestImageSource(item)!} alt={`${item.title} channel cover`} />}
              </div>
            ) : (
              <div className="arena-detail-content"><BlockContent block={block} onOpenImage={onOpenImage} /></div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle className="arena-detail-resize-handle" />

        <ResizablePanel defaultSize={30} minSize={15}>
          <div className="arena-detail-meta">
            <div className="arena-detail-meta-content">
        {block?.descriptionHtml && <MetaItem label="Description" wide wrap><div className="arena-detail-rich-text" dangerouslySetInnerHTML={{ __html: block.descriptionHtml }} /></MetaItem>}
        {(sourceUrl || (block && block.source?.url)) && (
          <div className="arena-detail-actions arena-detail-meta-wide">
            {sourceUrl && <a className="arena-detail-action arena-detail-action-primary" href={sourceUrl} target="_blank" rel="noopener noreferrer">Open source</a>}
            {block?.source?.url && block.source.url !== sourceUrl && <a className="arena-detail-action" href={block.source.url} target="_blank" rel="noopener noreferrer">Visit source page</a>}
          </div>
        )}
        {item.owner?.name && <MetaItem label={isChannel ? "Author" : "By"}><a href={`https://www.are.na/${item.owner.slug}`} target="_blank" rel="noopener noreferrer">{item.owner.name}</a></MetaItem>}
        {isChannel ? (
          <>
            <MetaItem label="Blocks">{item.counts.contents}</MetaItem>
            {typeof item.counts.followers === "number" && <MetaItem label="Followers">{item.counts.followers}</MetaItem>}
            <MetaItem label="Created">{formatDate(item.createdAt)}</MetaItem>
            <MetaItem label="Updated">{formatDate(item.updatedAt)}</MetaItem>
            <MetaItem label="Visibility"><span className={getVisibilityClass(item.visibility)}>{getVisibilityLabel(item.visibility)}</span></MetaItem>
            <MetaItem label="State">{item.state || "—"}</MetaItem>
          </>
        ) : (
          <>
            <MetaItem label="Block ID"><a href={item.arenaUrl} target="_blank" rel="noopener noreferrer">{item.id}</a></MetaItem>
            <MetaItem label="Type">{item.kind}</MetaItem>
            {item.source?.url && <MetaItem label="Source"><a href={item.source.url} target="_blank" rel="noopener noreferrer">{item.source.title || item.source.url}</a></MetaItem>}
          </>
        )}
        {item.connection?.connectedAt && <MetaItem label="Connected At">{formatDateTime(item.connection.connectedAt)}</MetaItem>}
        {item.connection?.connectedBy?.name && <MetaItem label="Connected By"><a href={`https://www.are.na/${item.connection.connectedBy.slug}`} target="_blank" rel="noopener noreferrer">{item.connection.connectedBy.name}</a></MetaItem>}
        <ConnectionsSection item={item} onOpenChannel={onOpenChannel} />
        {block && <CommentsSection block={block} />}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
