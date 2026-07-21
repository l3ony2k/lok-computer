import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArenaBlock, ArenaChannel, ArenaConnection, ArenaItem, ArenaPaginationMeta } from "@/types/arena";
import { getChannelContents } from "@/lib/api";
import { useWindowActions } from "@/hooks/useWindowManager";
import { ARENA_WINDOW_DEFAULTS } from "@/config/arenaWindows";
import { BlockViewer } from "../blocks/BlockViewer";
import { ImageViewerApp } from "@/apps/imageviewer/ImageViewerApp";
import { getAppState, setAppState } from "@/lib/storage";
import { ArenaDetailPanel } from "../components/ArenaDetailPanel";
import {
  ArenaFileView,
} from "../components/ArenaFileView";
import {
  ArenaFileSize,
  ArenaFileViewState,
  createArenaFileViewState,
  normalizeArenaFileViewState,
} from "../components/arenaFileViewState";

interface ChannelViewState {
  fileState?: ArenaFileViewState;
  previewMode: "off" | "horizontal" | "vertical";
  selectedBlockId?: number;
  gridSize?: "S" | "M" | "L";
  isListView?: boolean;
}

interface ChannelExplorerProps {
  channelSlug?: string;
  username?: string;
  items?: ArenaItem[];
  initialGridSize?: "S" | "M" | "L";
  initialIsListView?: boolean;
  initialPreviewMode?: "off" | "horizontal" | "vertical";
  initialSelectedBlockId?: number;
  onPropsChange?: (props: Partial<ChannelExplorerProps>) => void;
}

const sizeFromRoute = (size: "S" | "M" | "L" = "S"): ArenaFileSize => ({ S: "small", M: "medium", L: "large" })[size] as ArenaFileSize;
const sizeToRoute = (size: ArenaFileSize): "S" | "M" | "L" => ({ small: "S", medium: "M", large: "L" })[size] as "S" | "M" | "L";
const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";
const CHANNEL_BATCH_SIZE = 100;

const sortItemsForExplorer = (items: ArenaItem[]) => [...items].sort((left, right) => {
  const leftPinned = left.connection?.pinned ?? false;
  const rightPinned = right.connection?.pinned ?? false;
  if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
  const positionDiff = (right.connection?.position ?? Number.MIN_SAFE_INTEGER) - (left.connection?.position ?? Number.MIN_SAFE_INTEGER);
  return positionDiff || right.id - left.id;
});

export const ChannelExplorer: React.FC<ChannelExplorerProps> = ({
  channelSlug,
  username = "lok",
  items,
  initialGridSize = "S",
  initialIsListView = false,
  initialPreviewMode = "off",
  initialSelectedBlockId,
  onPropsChange,
}) => {
  const defaultFileState = useRef(createArenaFileViewState({
    view: initialIsListView ? "list" : "grid",
    gridSize: sizeFromRoute(initialGridSize),
    listSize: initialIsListView ? sizeFromRoute(initialGridSize) : "medium",
  })).current;
  const [fileState, setFileState] = useState<ArenaFileViewState>(defaultFileState);
  const [previewMode, setPreviewMode] = useState<"off" | "horizontal" | "vertical">(initialPreviewMode);
  const [contents, setContents] = useState<ArenaItem[]>(() => sortItemsForExplorer(items || []).slice(0, CHANNEL_BATCH_SIZE));
  const [selectedItem, setSelectedItem] = useState<ArenaItem | null>(null);
  const [savedSelectedId, setSavedSelectedId] = useState<number | undefined>();
  const [loading, setLoading] = useState(!items);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("loading channel...");
  const [pagination, setPagination] = useState<ArenaPaginationMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stateLoaded, setStateLoaded] = useState(false);
  const restoreComplete = useRef(false);
  const contentViewportRef = useRef<HTMLDivElement>(null);
  const loadMoreControllerRef = useRef<AbortController | null>(null);
  const viewStateKey = channelSlug ? `channel:view:${channelSlug}` : null;
  const { addWindow } = useWindowActions();

  useEffect(() => {
    if (!viewStateKey) {
      setStateLoaded(true);
      return;
    }
    const loadState = async () => {
      try {
        const saved = await getAppState<ChannelViewState>(viewStateKey);
        if (saved) {
          setFileState(normalizeArenaFileViewState(
            saved.fileState ?? { gridSize: saved.gridSize, isListView: saved.isListView },
            defaultFileState
          ));
          setPreviewMode(saved.previewMode ?? initialPreviewMode);
          setSavedSelectedId(saved.selectedBlockId);
        }
      } catch (stateError) {
        console.error("[ChannelExplorer] Failed to load view state", stateError);
      } finally {
        setStateLoaded(true);
      }
    };
    loadState();
  }, [viewStateKey, defaultFileState, initialPreviewMode]);

  useEffect(() => {
    if (!viewStateKey || !stateLoaded || !restoreComplete.current) return;
    const timeout = setTimeout(() => {
      const state: ChannelViewState = {
        fileState,
        previewMode,
        selectedBlockId: selectedItem?.id,
      };
      setAppState(viewStateKey, state).catch((stateError) => {
        console.error("[ChannelExplorer] Failed to save view state", stateError);
      });
      onPropsChange?.({
        initialGridSize: sizeToRoute(fileState.gridSize),
        initialIsListView: fileState.view === "list",
        initialPreviewMode: previewMode,
        initialSelectedBlockId: selectedItem?.id,
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [viewStateKey, stateLoaded, fileState, previewMode, selectedItem?.id, onPropsChange]);

  useEffect(() => {
    if (items) {
      const sortedItems = sortItemsForExplorer(items);
      const visibleItems = sortedItems.slice(0, CHANNEL_BATCH_SIZE);
      setContents(visibleItems);
      setPagination({
        currentPage: 1,
        nextPage: visibleItems.length < sortedItems.length ? 2 : null,
        prevPage: null,
        perPage: CHANNEL_BATCH_SIZE,
        totalPages: Math.ceil(sortedItems.length / CHANNEL_BATCH_SIZE),
        totalCount: sortedItems.length,
        hasMorePages: visibleItems.length < sortedItems.length,
      });
      setLoading(false);
      return;
    }
    if (!channelSlug) return;

    const controller = new AbortController();
    let active = true;
    const loadContents = async () => {
      try {
        setLoading(true);
        setError(null);
        setContents([]);
        setPagination(null);
        setLoadingStatus("loading channel...");
        const firstPage = await getChannelContents(channelSlug, 1, CHANNEL_BATCH_SIZE, controller.signal);
        if (!active) return;
        setContents(sortItemsForExplorer(firstPage.items));
        setPagination(firstPage.meta);
      } catch (fetchError) {
        if (!active || isAbortError(fetchError)) return;
        console.error(fetchError);
        setError("Failed to load channel contents");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadContents();
    return () => {
      active = false;
      controller.abort();
    };
  }, [channelSlug, items]);

  useEffect(() => () => {
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = null;
  }, [channelSlug]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination?.hasMorePages) return;

    if (items) {
      const sortedItems = sortItemsForExplorer(items);
      const nextCount = Math.min(contents.length + CHANNEL_BATCH_SIZE, sortedItems.length);
      const currentPage = Math.ceil(nextCount / CHANNEL_BATCH_SIZE);
      setContents(sortedItems.slice(0, nextCount));
      setPagination({
        currentPage,
        nextPage: nextCount < sortedItems.length ? currentPage + 1 : null,
        prevPage: currentPage > 1 ? currentPage - 1 : null,
        perPage: CHANNEL_BATCH_SIZE,
        totalPages: Math.ceil(sortedItems.length / CHANNEL_BATCH_SIZE),
        totalCount: sortedItems.length,
        hasMorePages: nextCount < sortedItems.length,
      });
      return;
    }

    if (!channelSlug || !pagination.nextPage) return;
    const controller = new AbortController();
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = controller;

    try {
      setLoadingMore(true);
      setError(null);
      const nextPage = await getChannelContents(channelSlug, pagination.nextPage, CHANNEL_BATCH_SIZE, controller.signal);
      setContents((current) => {
        const existing = new Set(current.map((item) => `${item.kind}-${item.id}`));
        const additions = nextPage.items.filter((item) => !existing.has(`${item.kind}-${item.id}`));
        return sortItemsForExplorer([...current, ...additions]);
      });
      setPagination(nextPage.meta);
    } catch (fetchError) {
      if (isAbortError(fetchError)) return;
      console.error(fetchError);
      setError("Failed to load more channel contents");
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
        setLoadingMore(false);
      }
    }
  }, [channelSlug, contents.length, items, loadingMore, pagination]);

  useEffect(() => {
    if (!stateLoaded || contents.length === 0 || selectedItem) return;
    const targetId = initialSelectedBlockId || savedSelectedId;
    if (targetId) {
      const restored = contents.find((item) => item.id === targetId);
      if (restored) setSelectedItem(restored);
    }
    restoreComplete.current = true;
  }, [stateLoaded, contents, selectedItem, initialSelectedBlockId, savedSelectedId]);

  useEffect(() => {
    if (!selectedItem || loading) return;
    const timeout = setTimeout(() => {
      contentViewportRef.current?.querySelector(`[data-item-id="${selectedItem.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
    return () => clearTimeout(timeout);
  }, [selectedItem, fileState.view, loading]);

  const openChannel = (channel: ArenaChannel) => {
    addWindow({
      title: channel.title || "Channel",
      content: <ChannelExplorer channelSlug={channel.slug} username={username} />,
      width: ARENA_WINDOW_DEFAULTS.channelExplorer.width,
      height: ARENA_WINDOW_DEFAULTS.channelExplorer.height,
      iconType: "other-channel",
      componentType: "ChannelExplorer",
      props: { channelSlug: channel.slug, username },
    });
  };

  const openImage = (imageUrl: string, title: string) => {
    addWindow({
      title,
      content: <ImageViewerApp imageUrl={imageUrl} />,
      width: 800,
      height: 600,
      iconType: "image",
      componentType: "ImageViewer",
      props: { imageUrl },
    });
  };

  const openItem = (item: ArenaItem) => {
    if (item.kind === "channel") {
      openChannel(item);
      return;
    }
    addWindow({
      title: item.title || "Block Details",
      content: <BlockViewer blockId={item.id} initialBlock={item as ArenaBlock} initialConnection={item.connection} />,
      width: ARENA_WINDOW_DEFAULTS.blockViewer.width,
      height: ARENA_WINDOW_DEFAULTS.blockViewer.height,
      iconType: item.kind === "image" ? "image" : item.kind === "link" ? "link" : "text",
      componentType: "BlockViewer",
      props: { blockId: item.id, initialConnection: item.connection as ArenaConnection | null },
    });
  };

  const preview = selectedItem ? (
    <ArenaDetailPanel
      key={`${selectedItem.kind}-${selectedItem.id}`}
      item={selectedItem}
      clearWhileLoading
      onOpenChannel={openChannel}
      onOpenImage={openImage}
    />
  ) : null;

  return (
    <ArenaFileView
      items={contents}
      state={fileState}
      onStateChange={setFileState}
      selectedId={selectedItem?.id}
      onSelect={setSelectedItem}
      onOpen={openItem}
      loading={loading}
      loadingStatus={loadingStatus}
      totalCount={pagination?.totalCount}
      hasMore={pagination?.hasMorePages}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
      error={error}
      emptyText="this channel is empty"
      preview={preview}
      previewMode={previewMode}
      onPreviewModeChange={setPreviewMode}
      contentViewportRef={contentViewportRef}
    />
  );
};
