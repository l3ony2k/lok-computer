import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArenaChannel, ArenaItem } from "@/types/arena";
import { WindowLayout } from "@/components/window/WindowLayout";
import { RetroButton } from "@/components/ui/RetroButton";
import { StateMessage } from "@/components/ui/StateMessage";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  ARENA_FILE_SORTS,
  ArenaFileSize,
  ArenaFileSort,
  ArenaFileViewMode,
  ArenaFileViewState,
} from "./arenaFileViewState";
import { getArenaPlayableMedia } from "../utils/arenaLinks";

interface ArenaFileViewProps {
  items: ArenaItem[];
  state: ArenaFileViewState;
  onStateChange: (state: ArenaFileViewState) => void;
  selectedId?: number | null;
  onSelect: (item: ArenaItem) => void;
  onOpen: (item: ArenaItem) => void;
  addressBar?: React.ReactNode;
  emptyText?: string;
  loading?: boolean;
  totalCount?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  loadingStatus?: string;
  error?: string | null;
  preview?: React.ReactNode;
  previewMode?: "off" | "horizontal" | "vertical";
  onPreviewModeChange?: (mode: "off" | "horizontal" | "vertical") => void;
  contentViewportRef?: React.RefObject<HTMLDivElement>;
  /** Channel-level actions shown beside Load more and Preview. */
  footerActions?: React.ReactNode;
}

const FILE_SIZES: ArenaFileSize[] = ["small", "medium", "large"];
const GRID_SIZE_CLASSES: Record<ArenaFileSize, string> = {
  small: "arena-file-grid-small",
  medium: "arena-file-grid-medium",
  large: "arena-file-grid-large",
};
const CARD_SIZE_CLASSES: Record<ArenaFileSize, string> = {
  small: "arena-file-card-small",
  medium: "arena-file-card-medium",
  large: "arena-file-card-large",
};
const TABLE_SIZE_CLASSES: Record<ArenaFileSize, string> = {
  small: "arena-file-table-small",
  medium: "arena-file-table-medium",
  large: "arena-file-table-large",
};

const getFileTitle = (item: ArenaItem) => {
  if (item.title && item.title !== "Untitled") return item.title;
  if (item.kind !== "channel" && item.textPlain?.trim()) return item.textPlain.trim();
  return item.source?.title || `Untitled ${item.kind}`;
};

const getFileAuthor = (item: ArenaItem) => item.connection?.connectedBy?.name || item.owner?.name || "—";
const getFileAddedAt = (item: ArenaItem) => item.connection?.connectedAt || item.createdAt;

const formatFileDate = (value?: string | null, dateOnly = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (part: number) => String(part).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return dateOnly ? day : `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getPreviewImageUrl = (item: ArenaItem) => (
  item.image?.square?.src
  ?? item.image?.small?.src
  ?? item.image?.medium?.src
  ?? item.image?.large?.src
  ?? item.image?.original.src
  ?? null
);

const getVisibilityClass = (visibility?: string) => {
  if (visibility === "public") return "arena-vis-public";
  if (visibility === "private") return "arena-vis-private";
  return "arena-vis-closed";
};

const getChannelVisibilityLabel = (visibility?: string) => {
  if (visibility === "public") return "Open Channel";
  if (visibility === "private") return "Private Channel";
  return "Closed Channel";
};

const getFallbackLabel = (item: ArenaItem) => {
  const playable = getArenaPlayableMedia(item);
  if (playable) return playable.kind === "video" ? "VID" : "AUD";
  return {
    text: "TXT",
    link: "URL",
    attachment: "FILE",
    embed: "EMB",
    channel: "CH",
    image: "IMG",
  }[item.kind];
};

const PreviewImage = ({ item }: { item: ArenaItem }) => {
  const [failed, setFailed] = useState(false);
  const source = getPreviewImageUrl(item);

  if (!source || failed) {
    return <span className={item.kind === "channel" ? getVisibilityClass(item.visibility) : ""}>{getFallbackLabel(item)}</span>;
  }

  return (
    <img
      src={source}
      alt={item.image?.altText || getFileTitle(item)}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
};

const ArenaChannelPreview = ({ channel }: { channel: ArenaChannel }) => (
  <div className={`arena-channel-card-preview ${getVisibilityClass(channel.visibility)}`}>
    <div className="arena-channel-card-label"><span aria-hidden="true">✶✶</span> {getChannelVisibilityLabel(channel.visibility)}</div>
    <div className="arena-channel-card-title">{getFileTitle(channel)}</div>
  </div>
);

const ArenaBlockPreview = ({ item }: { item: ArenaItem }) => {
  if (item.kind === "channel") return <ArenaChannelPreview channel={item} />;

  const imageUrl = getPreviewImageUrl(item);
  if (imageUrl) {
    return <PreviewImage item={item} />;
  }

  if (item.kind === "text" && item.textHtml) {
    return <div className="arena-file-text-preview" dangerouslySetInnerHTML={{ __html: item.textHtml }} />;
  }

  return (
    <div className={`arena-file-fallback-preview arena-file-fallback-${item.kind}`}>
      <span>{getFallbackLabel(item)}</span>
      <strong>{getFileTitle(item)}</strong>
    </div>
  );
};

const sortAndFilterItems = (items: ArenaItem[], state: ArenaFileViewState) => {
  const query = state.query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (state.types.length > 0 && !state.types.includes(item.kind)) return false;
    if (!query) return true;
    return [
      getFileTitle(item),
      item.descriptionPlain,
      item.kind === "channel" ? item.slug : item.textPlain,
      item.source?.provider?.name,
      item.owner?.name,
      getFileAuthor(item),
    ].filter(Boolean).join(" ").toLowerCase().includes(query);
  });

  if (state.sort === "default") return filtered;

  const direction = state.direction === "desc" ? -1 : 1;
  const valueFor = (item: ArenaItem) => {
    if (state.sort === "title") return getFileTitle(item).toLowerCase();
    if (state.sort === "type") return item.kind;
    if (state.sort === "added") return getFileAddedAt(item) || "";
    return item.updatedAt || "";
  };

  return [...filtered].sort((left, right) => (
    String(valueFor(left)).localeCompare(String(valueFor(right)), undefined, { numeric: true, sensitivity: "base" }) * direction
  ));
};

interface InteractiveItemProps {
  item: ArenaItem;
  selected: boolean;
  onSelect: (item: ArenaItem) => void;
  onOpen: (item: ArenaItem) => void;
  children: React.ReactNode;
  className: string;
}

const InteractiveItem = ({ item, selected, onSelect, onOpen, children, className }: InteractiveItemProps) => (
  <article
    className={className}
    data-selected={selected || undefined}
    data-item-id={item.id}
    tabIndex={0}
    onClick={(event) => {
      if (event.detail > 1) {
        event.preventDefault();
        onOpen(item);
        return;
      }
      onSelect(item);
    }}
    onKeyDown={(event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onOpen(item);
      }
    }}
  >
    {children}
  </article>
);

const GRID_SKELETON_COUNTS: Record<ArenaFileSize, { initial: number; more: number }> = {
  small: { initial: 18, more: 8 },
  medium: { initial: 12, more: 6 },
  large: { initial: 8, more: 4 },
};

const ArenaGridSkeletonCard = ({ size, index }: { size: ArenaFileSize; index: number }) => (
  <div className={`arena-file-card ${CARD_SIZE_CLASSES[size]} arena-file-skeleton-card`} aria-hidden="true">
    <div className="arena-file-grid-preview">
      <span className="arena-file-skeleton-fill" />
    </div>
    <div className="arena-file-card-text">
      <span className="arena-file-skeleton-line" style={{ width: `${58 + ((index * 13) % 34)}%` }} />
      <span className="arena-file-skeleton-line arena-file-skeleton-line-muted" style={{ width: `${42 + ((index * 17) % 38)}%` }} />
      {size !== "small" && <span className="arena-file-skeleton-line arena-file-skeleton-line-muted" style={{ width: "68%" }} />}
    </div>
  </div>
);

const ArenaFileGrid = ({ items, size, selectedId, onSelect, onOpen, initialLoading = false, loadingMore = false, hasMore = false, loadMoreRef }: {
  items: ArenaItem[];
  size: ArenaFileSize;
  selectedId?: number | null;
  onSelect: (item: ArenaItem) => void;
  onOpen: (item: ArenaItem) => void;
  initialLoading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  loadMoreRef?: React.RefObject<HTMLDivElement>;
}) => {
  const skeletonCount = initialLoading
    ? GRID_SKELETON_COUNTS[size].initial
    : loadingMore ? GRID_SKELETON_COUNTS[size].more : 0;

  return (
  <div className={`arena-file-grid ${GRID_SIZE_CLASSES[size]}`} aria-busy={initialLoading || loadingMore || undefined}>
    {items.map((item) => (
      <InteractiveItem
        key={`${item.kind}-${item.id}`}
        item={item}
        selected={selectedId === item.id}
        onSelect={onSelect}
        onOpen={onOpen}
        className={`arena-file-card ${CARD_SIZE_CLASSES[size]} ${item.kind === "channel" ? "arena-file-channel-card" : ""}`}
      >
        <div className="arena-file-grid-preview"><ArenaBlockPreview item={item} /></div>
        <div className="arena-file-card-text">
          <div className="arena-file-item-title" title={getFileTitle(item)}>{getFileTitle(item)}</div>
          <div className="arena-file-item-meta">
            {item.kind} · {getFileAuthor(item)}
            {item.kind === "channel" && ` · ${item.counts.contents} blocks`}
            {item.commentCount > 0 && ` · ${item.commentCount} comments`}
          </div>
          <div className="arena-file-item-meta arena-file-grid-details">
            A {formatFileDate(getFileAddedAt(item), true)} · U {formatFileDate(item.updatedAt, true)}
          </div>
        </div>
      </InteractiveItem>
    ))}
    {Array.from({ length: skeletonCount }, (_, index) => (
      <ArenaGridSkeletonCard key={`grid-skeleton-${index}`} size={size} index={index} />
    ))}
    {hasMore && <div ref={loadMoreRef} className="arena-file-load-sentinel" aria-hidden="true" />}
  </div>
  );
};

const SortHeader = ({ label, sort, state, onStateChange, className = "" }: {
  label: string;
  sort: ArenaFileSort;
  state: ArenaFileViewState;
  onStateChange: (state: ArenaFileViewState) => void;
  className?: string;
}) => (
  <th className={className}>
    <button
      type="button"
      data-active={state.sort === sort || undefined}
      onClick={() => {
        if (state.sort !== sort) {
          onStateChange({ ...state, sort, direction: "asc" });
        } else if (state.direction === "asc") {
          onStateChange({ ...state, direction: "desc" });
        } else {
          onStateChange({ ...state, sort: "default", direction: "asc" });
        }
      }}
    >
      {label}{state.sort === sort ? ` ${state.direction === "asc" ? "↑" : "↓"}` : ""}
    </button>
  </th>
);

const ArenaFileSkeletonRow = ({ index }: { index: number }) => (
  <tr className="arena-file-skeleton-row" aria-hidden="true">
    <td className="arena-file-thumbnail-cell"><div className="arena-file-list-thumbnail"><span className="arena-file-skeleton-fill" /></div></td>
    <td className="arena-file-list-title"><span className="arena-file-skeleton-line" style={{ width: `${48 + ((index * 11) % 42)}%` }} /></td>
    <td className="arena-file-type-cell"><span className="arena-file-skeleton-line" style={{ width: "58%" }} /></td>
    <td className="arena-file-added-cell"><span className="arena-file-skeleton-line" style={{ width: "82%" }} /></td>
    <td className="arena-file-updated-cell"><span className="arena-file-skeleton-line" style={{ width: "74%" }} /></td>
    <td className="arena-file-author-cell"><span className="arena-file-skeleton-line" style={{ width: `${45 + ((index * 7) % 34)}%` }} /></td>
    <td className="arena-file-comments-cell"><span className="arena-file-skeleton-line" style={{ width: "30%" }} /></td>
  </tr>
);

const ArenaFileTable = ({ items, state, selectedId, onSelect, onOpen, onStateChange, initialLoading = false, loadingMore = false, hasMore = false, loadMoreRef }: {
  items: ArenaItem[];
  state: ArenaFileViewState;
  selectedId?: number | null;
  onSelect: (item: ArenaItem) => void;
  onOpen: (item: ArenaItem) => void;
  onStateChange: (state: ArenaFileViewState) => void;
  initialLoading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  loadMoreRef?: React.RefObject<HTMLDivElement>;
}) => (
  <div className="arena-file-list-frame">
    <div className="arena-file-list-scroller">
      <table className={`arena-file-table ${TABLE_SIZE_CLASSES[state.listSize]}`} aria-busy={initialLoading || loadingMore || undefined}>
        <colgroup>
          <col className="arena-file-column-thumbnail" />
          <col className="arena-file-column-title" />
          <col className="arena-file-column-type" />
          <col className="arena-file-column-added" />
          <col className="arena-file-column-updated" />
          <col className="arena-file-column-author" />
          <col className="arena-file-column-comments" />
        </colgroup>
        <thead>
          <tr>
            <th className="arena-file-thumbnail-cell" />
            <SortHeader label="title" sort="title" state={state} onStateChange={onStateChange} className="arena-file-title-header" />
            <SortHeader label="type" sort="type" state={state} onStateChange={onStateChange} className="arena-file-type-cell" />
            <SortHeader label="added" sort="added" state={state} onStateChange={onStateChange} className="arena-file-added-cell" />
            <SortHeader label="updated" sort="updated" state={state} onStateChange={onStateChange} className="arena-file-updated-cell" />
            <th className="arena-file-static-header arena-file-author-cell">added by</th>
            <th className="arena-file-static-header arena-file-comments-cell">comments</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.kind}-${item.id}`}
              data-selected={selectedId === item.id || undefined}
              data-item-id={item.id}
              tabIndex={0}
              onClick={(event) => {
                if (event.detail > 1) {
                  event.preventDefault();
                  onOpen(item);
                  return;
                }
                onSelect(item);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onOpen(item);
                }
              }}
            >
              <td className="arena-file-thumbnail-cell"><div className="arena-file-list-thumbnail"><PreviewImage item={item} /></div></td>
              <td className={`arena-file-list-title ${item.kind === "channel" ? getVisibilityClass(item.visibility) : ""}`} title={getFileTitle(item)}>{getFileTitle(item)}</td>
              <td className="arena-file-type-cell">{item.kind}</td>
              <td className="arena-file-added-cell">{formatFileDate(getFileAddedAt(item))}</td>
              <td className="arena-file-updated-cell">{formatFileDate(item.updatedAt)}</td>
              <td className="arena-file-author-cell">{getFileAuthor(item)}</td>
              <td className="arena-file-comments-cell">{item.commentCount || "—"}</td>
            </tr>
          ))}
          {Array.from({ length: initialLoading ? 16 : loadingMore ? 6 : 0 }, (_, index) => (
            <ArenaFileSkeletonRow key={`list-skeleton-${index}`} index={index} />
          ))}
        </tbody>
      </table>
      {hasMore && <div ref={loadMoreRef} className="arena-file-load-sentinel" aria-hidden="true" />}
    </div>
  </div>
);

const ArenaFileToolbar = ({ items, state, onStateChange }: {
  items: ArenaItem[];
  state: ArenaFileViewState;
  onStateChange: (state: ArenaFileViewState) => void;
}) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const availableTypes = useMemo(() => Array.from(new Set(items.map((item) => item.kind))).sort(), [items]);
  const activeSize = state.view === "grid" ? state.gridSize : state.listSize;

  useEffect(() => {
    if (!filterOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!filterButtonRef.current?.contains(target) && !filterMenuRef.current?.contains(target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [filterOpen]);

  const toggleFilter = () => {
    const next = !filterOpen;
    if (next && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setFilterPosition({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 170) });
    }
    setFilterOpen(next);
  };

  const updateSize = (size: ArenaFileSize) => onStateChange({
    ...state,
    ...(state.view === "grid" ? { gridSize: size } : { listSize: size }),
  });

  return (
    <div className="arena-file-toolbar">
      <input
        type="search"
        className="arena-toolbar-control arena-file-search"
        placeholder="filter blocks"
        aria-label="Filter Are.na items"
        value={state.query}
        onChange={(event) => onStateChange({ ...state, query: event.target.value })}
      />

      <button
        ref={filterButtonRef}
        type="button"
        className="arena-toolbar-control arena-file-filter-button"
        aria-haspopup="menu"
        aria-expanded={filterOpen}
        onClick={toggleFilter}
      >
        {state.types.length ? `${state.types.length} types` : "all"}
      </button>

      {filterOpen && createPortal(
        <div ref={filterMenuRef} className="menu-surface arena-file-filter-menu" style={filterPosition} role="menu">
          {availableTypes.map((type) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={state.types.includes(type)}
                onChange={(event) => onStateChange({
                  ...state,
                  types: event.target.checked
                    ? [...state.types, type]
                    : state.types.filter((activeType) => activeType !== type),
                })}
              />
              {type}
            </label>
          ))}
        </div>,
        document.body
      )}

      <div className="arena-file-button-group">
        <select
          className="arena-toolbar-control arena-file-sort-select"
          aria-label="Sort Are.na items"
          value={state.sort}
          onChange={(event) => onStateChange({ ...state, sort: event.target.value as ArenaFileSort })}
        >
          {ARENA_FILE_SORTS.map((sort) => <option key={sort} value={sort}>{sort}</option>)}
        </select>
        <button
          type="button"
          className="arena-toolbar-control arena-file-direction-button"
          disabled={state.sort === "default"}
          title="Reverse sort direction"
          onClick={() => onStateChange({ ...state, direction: state.direction === "asc" ? "desc" : "asc" })}
        >
          {state.direction === "asc" ? "↑" : "↓"}
        </button>
      </div>

      <div className="arena-file-toolbar-spacer" />

      <div className="arena-file-button-group arena-file-size-group">
        {FILE_SIZES.map((size, index) => (
          <button
            key={size}
            type="button"
            className="arena-toolbar-control"
            data-active={activeSize === size || undefined}
            title={`${size} previews`}
            onClick={() => updateSize(size)}
          >
            {(["S", "M", "L"] as const)[index]}
          </button>
        ))}
      </div>

      <div className="arena-file-button-group arena-file-view-group">
        {(["grid", "list"] as ArenaFileViewMode[]).map((view) => (
          <button
            key={view}
            type="button"
            className="arena-toolbar-control"
            data-active={state.view === view || undefined}
            onClick={() => onStateChange({ ...state, view })}
          >
            {view}
          </button>
        ))}
      </div>
    </div>
  );
};

export const ArenaFileView = ({
  items,
  state,
  onStateChange,
  selectedId,
  onSelect,
  onOpen,
  addressBar,
  emptyText = "no matching blocks",
  loading = false,
  totalCount = items.length,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  loadingStatus = "loading...",
  error,
  preview,
  previewMode = "off",
  onPreviewModeChange,
  contentViewportRef,
  footerActions,
}: ArenaFileViewProps) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const visibleItems = useMemo(() => sortAndFilterItems(items, state), [items, state]);
  const hasActiveFilter = state.query.trim().length > 0 || state.types.length > 0;
  const countLabel = hasActiveFilter
    ? `${visibleItems.length} matches in ${items.length} loaded`
    : hasMore
      ? `${items.length} of ${totalCount} blocks`
      : `${items.length} blocks`;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || loading || loadingMore || !hasMore || !onLoadMore || error) return;

    const scrollRoot = sentinel.closest<HTMLElement>(".arena-file-list-scroller, .arena-file-contents");
    if (!scrollRoot) return;

    let requested = false;
    const requestNextPage = () => {
      if (requested) return;
      const windowElement = sentinel.closest(".draggable-window");
      if (windowElement && getComputedStyle(windowElement).visibility === "hidden") return;
      requested = true;
      onLoadMore();
    };

    const checkScrollPosition = () => {
      const remaining = scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight;
      const threshold = Math.max(320, scrollRoot.clientHeight * 0.5);
      if (remaining <= threshold) requestNextPage();
    };

    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) requestNextPage();
      }, { root: scrollRoot, rootMargin: "320px 0px" })
      : null;
    const resizeObserver = "ResizeObserver" in window
      ? new ResizeObserver(checkScrollPosition)
      : null;

    observer?.observe(sentinel);
    resizeObserver?.observe(scrollRoot);
    scrollRoot.addEventListener("scroll", checkScrollPosition, { passive: true });
    const initialCheck = requestAnimationFrame(checkScrollPosition);

    return () => {
      cancelAnimationFrame(initialCheck);
      observer?.disconnect();
      resizeObserver?.disconnect();
      scrollRoot.removeEventListener("scroll", checkScrollPosition);
    };
  }, [error, hasMore, loading, loadingMore, onLoadMore, previewMode, state.gridSize, state.listSize, state.view, visibleItems.length]);

  const renderItems = () => {
    if (loading) return state.view === "grid"
      ? <ArenaFileGrid items={[]} size={state.gridSize} selectedId={selectedId} onSelect={onSelect} onOpen={onOpen} initialLoading />
      : <ArenaFileTable items={[]} state={state} selectedId={selectedId} onSelect={onSelect} onOpen={onOpen} onStateChange={onStateChange} initialLoading />;
    if (visibleItems.length === 0) return (
      <div className="arena-file-empty-state">
        <StateMessage>{emptyText}</StateMessage>
        {hasMore && <div ref={loadMoreRef} className="arena-file-load-sentinel" aria-hidden="true" />}
      </div>
    );
    return state.view === "grid"
      ? <ArenaFileGrid items={visibleItems} size={state.gridSize} selectedId={selectedId} onSelect={onSelect} onOpen={onOpen} loadingMore={loadingMore} hasMore={hasMore} loadMoreRef={loadMoreRef} />
      : <ArenaFileTable items={visibleItems} state={state} selectedId={selectedId} onSelect={onSelect} onOpen={onOpen} onStateChange={onStateChange} loadingMore={loadingMore} hasMore={hasMore} loadMoreRef={loadMoreRef} />;
  };

  const cyclePreview = () => {
    if (!onPreviewModeChange) return;
    onPreviewModeChange(previewMode === "off" ? "horizontal" : previewMode === "horizontal" ? "vertical" : "off");
  };

  const collection = (
    <div ref={contentViewportRef} className="arena-file-contents">
      {(loading || loadingMore) && <span className="sr-only" role="status">{loading ? loadingStatus : "loading more blocks..."}</span>}
      {error && <div className="arena-file-error">{error}</div>}
      {renderItems()}
    </div>
  );

  return (
    <WindowLayout
      toolbar={
        <div className="arena-file-chrome">
          {addressBar}
          <ArenaFileToolbar items={items} state={state} onStateChange={onStateChange} />
        </div>
      }
      footer={(
        <div className="arena-file-footer">
          <span>{countLabel}</span>
          <div className="arena-file-footer-actions">
            {footerActions}
            {hasMore && items.length > 0 && onLoadMore && (
              <RetroButton onClick={onLoadMore} disabled={loadingMore}>
                {error ? "Retry" : loadingMore ? "Loading..." : "Load more"}
              </RetroButton>
            )}
            {onPreviewModeChange && (
              <RetroButton active={previewMode !== "off"} onClick={cyclePreview}>Preview</RetroButton>
            )}
          </div>
        </div>
      )}
      isScrollable={false}
      hasPadding={false}
      className="arena-file-view"
    >
      {onPreviewModeChange && previewMode !== "off" ? (
        <ResizablePanelGroup direction={previewMode === "vertical" ? "vertical" : "horizontal"} className="h-full w-full">
          <ResizablePanel defaultSize={50} minSize={20}>{collection}</ResizablePanel>
          <ResizableHandle className="arena-preview-resize-handle" />
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="arena-file-preview-pane">
              {preview ?? <StateMessage>select a block to preview</StateMessage>}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : collection}
    </WindowLayout>
  );
};
