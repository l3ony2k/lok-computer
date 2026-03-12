import React, { useEffect, useRef, useState } from "react";
import { ArenaBlock, ArenaChannel, ArenaConnection } from "@/types/arena";
import { getChannelContents, getChannelPreview } from "@/lib/api";
import { useWindowManager } from "@/hooks/useWindowManager";
import { BlockViewer } from "../blocks/BlockViewer";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ContentItemGrid,
  ContentItemListView,
} from "../utils/contentItems";
import { ContentItem, getGridConfiguration, getItemTitle } from "../utils/contentItemHelpers";
import { RetroButton } from "@/components/ui/RetroButton";
import { StateMessage } from "@/components/ui/StateMessage";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { getAppState, setAppState } from "@/lib/storage";

interface ChannelViewState {
  gridSize: "S" | "M" | "L";
  isListView: boolean;
  previewMode: "off" | "horizontal" | "vertical";
  selectedBlockId?: number;
}

const MemoizedContentItemGrid = React.memo(ContentItemGrid);
const MemoizedContentItemListView = React.memo(ContentItemListView);

interface ContentRendererProps {
  contents: ContentItem[];
  gridSize: "S" | "M" | "L";
  onSingleClick: (itemId: number) => void;
  onDoubleClick: (item: ContentItem) => void;
  getIconType: (item: ContentItem) => string;
  isMobile: boolean;
  selectedId?: number | null;
}

const GridContent = React.memo(({
  contents,
  gridSize,
  onSingleClick,
  onDoubleClick,
  getIconType,
  isMobile,
  selectedId,
}: ContentRendererProps) => {
  const { gridIconSizeClass, itemWidth, gridTemplateStyle } = getGridConfiguration(gridSize);

  if (contents.length === 0) {
    return (
      <StateMessage minHeight="h-24">
        This channel is empty
      </StateMessage>
    );
  }

  return (
    <div className="folder-grid" style={gridTemplateStyle}>
      {contents.map((item) => (
        <div key={item.id} data-item-id={item.id} className={selectedId === item.id ? "ring-2 ring-accent" : ""}>
          <MemoizedContentItemGrid
            item={item}
            onSingleClick={() => onSingleClick(item.id)}
            onDoubleClick={() => onDoubleClick(item)}
            itemWidth={itemWidth}
            iconSizeClass={gridIconSizeClass}
            getIconType={getIconType}
            isMobile={isMobile}
          />
        </div>
      ))}
    </div>
  );
});

const ListContent = React.memo(({
  contents,
  gridSize,
  onSingleClick,
  onDoubleClick,
  getIconType,
  isMobile,
  selectedId,
}: ContentRendererProps) => {
  const { listIconSizeClass } = getGridConfiguration(gridSize);

  if (contents.length === 0) {
    return (
      <StateMessage minHeight="h-24">
        This channel is empty
      </StateMessage>
    );
  }

  return (
    <div className="space-y-1 p-1">
      {contents.map((item) => (
        <div key={item.id} data-item-id={item.id} className={selectedId === item.id ? "bg-muted/50" : ""}>
          <MemoizedContentItemListView
            item={item}
            onSingleClick={() => onSingleClick(item.id)}
            onDoubleClick={() => onDoubleClick(item)}
            iconSizeClass={listIconSizeClass}
            getIconType={getIconType}
            isMobile={isMobile}
          />
        </div>
      ))}
    </div>
  );
});

interface ChannelExplorerProps {
  channelSlug?: string;
  username?: string;
  items?: ContentItem[];
  initialGridSize?: "S" | "M" | "L";
  initialIsListView?: boolean;
  initialPreviewMode?: "off" | "horizontal" | "vertical";
  initialSelectedBlockId?: number;
  onPropsChange?: (props: Partial<ChannelExplorerProps>) => void;
}

const isArenaBlock = (item: ContentItem): item is ArenaBlock => item.kind !== "channel";
const isArenaChannel = (item: ContentItem): item is ArenaChannel => item.kind === "channel";

const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === "AbortError";
};

const formatDate = (dateString?: string) => {
  if (!dateString) {
    return "Unknown";
  }

  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getConnectionPosition = (item: ContentItem): number => {
  return item.connection?.position ?? Number.MIN_SAFE_INTEGER;
};

const sortItemsForExplorer = (items: ContentItem[]): ContentItem[] => {
  return [...items].sort((left, right) => {
    const leftPinned = left.connection?.pinned ?? false;
    const rightPinned = right.connection?.pinned ?? false;

    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    const positionDiff = getConnectionPosition(right) - getConnectionPosition(left);
    if (positionDiff !== 0) {
      return positionDiff;
    }

    return right.id - left.id;
  });
};

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
  const [loading, setLoading] = useState(!items);
  const [loadingStatus, setLoadingStatus] = useState<string>("Initializing...");
  const [contents, setContents] = useState<ContentItem[]>(items || []);
  const [error, setError] = useState<string | null>(null);
  const [isListView, setIsListView] = useState(initialIsListView);
  const { addWindow } = useWindowManager();
  const [gridSize, setGridSize] = useState<"S" | "M" | "L">(initialGridSize);
  const [previewMode, setPreviewMode] = useState<"off" | "horizontal" | "vertical">(initialPreviewMode);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [selectedChannelPreview, setSelectedChannelPreview] = useState<ArenaChannel | null>(null);
  const [isViewStateLoaded, setIsViewStateLoaded] = useState(false);
  const [savedSelectedBlockId, setSavedSelectedBlockId] = useState<number | undefined>(undefined);
  const isInitialRestoreComplete = useRef(false);
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const viewStateKey = channelSlug ? `channel:view:${channelSlug}` : null;
  const itemsPerPage = 100;
  const isMobile = useIsMobile();
  const selectedItemId = selectedItem?.id;

  useEffect(() => {
    if (!viewStateKey) {
      return;
    }

    const loadViewState = async () => {
      try {
        const savedState = await getAppState<ChannelViewState>(viewStateKey);
        if (savedState) {
          setGridSize(savedState.gridSize);
          setIsListView(savedState.isListView);
          setPreviewMode(savedState.previewMode);
          setSavedSelectedBlockId(savedState.selectedBlockId);
          console.debug(`[ChannelExplorer] Loaded view state for ${channelSlug}, selectedBlockId: ${savedState.selectedBlockId}`);
        }
      } catch (stateError) {
        console.error("[ChannelExplorer] Failed to load view state:", stateError);
      } finally {
        setIsViewStateLoaded(true);
      }
    };

    loadViewState();
  }, [viewStateKey, channelSlug]);

  useEffect(() => {
    if (!viewStateKey || !isViewStateLoaded || !isInitialRestoreComplete.current) {
      return;
    }

    const saveViewState = async () => {
      try {
        const state: ChannelViewState = {
          gridSize,
          isListView,
          previewMode,
          selectedBlockId: selectedItem?.id,
        };
        await setAppState(viewStateKey, state);

        onPropsChange?.({
          initialGridSize: gridSize,
          initialIsListView: isListView,
          initialPreviewMode: previewMode,
          initialSelectedBlockId: selectedItem?.id,
        });
      } catch (stateError) {
        console.error("[ChannelExplorer] Failed to save view state:", stateError);
      }
    };

    const timeout = setTimeout(saveViewState, 300);
    return () => clearTimeout(timeout);
  }, [viewStateKey, isViewStateLoaded, gridSize, isListView, previewMode, selectedItem?.id, onPropsChange]);

  useEffect(() => {
    if (!isViewStateLoaded) {
      return;
    }

    const itemIdToRestore = initialSelectedBlockId || savedSelectedBlockId;
    const shouldScrollToRestoredItem = Boolean(initialSelectedBlockId);

    if (itemIdToRestore && contents.length > 0 && !selectedItem) {
      const restoredItem = contents.find((item) => item.id === itemIdToRestore);
      if (restoredItem) {
        setSelectedItem(restoredItem);
        if (shouldScrollToRestoredItem) {
          setTimeout(() => {
            const element = document.querySelector(`[data-item-id="${restoredItem.id}"]`);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          }, 100);
        }
      }
    }

    if (contents.length > 0) {
      isInitialRestoreComplete.current = true;
    }
  }, [isViewStateLoaded, initialSelectedBlockId, savedSelectedBlockId, contents, selectedItem]);

  useEffect(() => {
    if (loading || initialSelectedBlockId || !contentViewportRef.current) {
      return;
    }

    contentViewportRef.current.scrollTo({ top: 0, behavior: "auto" });
  }, [channelSlug, loading, initialSelectedBlockId, contents.length]);

  useEffect(() => {
    if (!selectedItem || loading) {
      return;
    }

    const timeout = setTimeout(() => {
      const element = document.querySelector(`[data-item-id="${selectedItemId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [isListView, loading, selectedItem, selectedItemId]);

  useEffect(() => {
    if (items) {
      setContents(sortItemsForExplorer(items));
      setLoading(false);
      return;
    }

    if (!channelSlug) {
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;

    const fetchAllChannelContents = async () => {
      try {
        setLoading(true);
        setError(null);
        setContents([]);
        setLoadingStatus("Loading channel...");

        const firstPage = await getChannelContents(channelSlug, 1, itemsPerPage, abortController.signal);

        if (!isMounted) {
          return;
        }

        const allItems: ContentItem[] = [...firstPage.items];
        const { totalCount, totalPages } = firstPage.meta;
        setLoadingStatus(`Loaded ${allItems.length} of ${totalCount} items...`);

        if (totalPages > 1) {
          const batchSize = 3;
          let currentPage = 2;

          while (currentPage <= totalPages && isMounted) {
            const pagesToFetch = Array.from(
              { length: Math.min(batchSize, totalPages - currentPage + 1) },
              (_, index) => currentPage + index
            );

            setLoadingStatus(`Fetching pages ${pagesToFetch[0]}-${pagesToFetch[pagesToFetch.length - 1]} of ${totalPages}...`);

            const results = await Promise.all(
              pagesToFetch.map((pageNumber) =>
                getChannelContents(channelSlug, pageNumber, itemsPerPage, abortController.signal)
              )
            );

            if (!isMounted) {
              return;
            }

            results.forEach((page) => {
              allItems.push(...page.items);
            });

            setLoadingStatus(`Loaded ${allItems.length} of ${totalCount} items...`);
            currentPage += pagesToFetch.length;
          }
        }

        if (isMounted) {
          setContents(sortItemsForExplorer(allItems));
          setError(null);
          console.log(`[App:Arena] Complete: ${allItems.length} items for ${channelSlug}`);
        }
      } catch (fetchError) {
        if (!isMounted || isAbortError(fetchError)) {
          return;
        }

        setError("Failed to load channel contents");
        console.error(fetchError);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllChannelContents();

    return () => {
      isMounted = false;
      abortController.abort();
      console.log("[App:Arena] Aborting fetches (unmount)");
    };
  }, [channelSlug, items, itemsPerPage]);

  useEffect(() => {
    if (!selectedItem || !isArenaChannel(selectedItem)) {
      setSelectedChannelPreview(null);
      return;
    }

    let isActive = true;

    const loadChannelPreview = async () => {
      try {
        const preview = await getChannelPreview(selectedItem.slug, selectedItem);
        if (isActive) {
          setSelectedChannelPreview(preview);
        }
      } catch (previewError) {
        if (isActive) {
          console.warn("[ChannelExplorer] Failed to enrich channel preview:", previewError);
          setSelectedChannelPreview(selectedItem);
        }
      }
    };

    loadChannelPreview();

    return () => {
      isActive = false;
    };
  }, [selectedItem]);

  const getIconType = (item: ContentItem): string => {
    switch (item.kind) {
      case "channel":
        return "other-channel";
      case "link":
        return "link";
      case "image":
        return "image";
      case "embed":
        return "video";
      case "attachment":
      case "text":
      default:
        return "text";
    }
  };

  const handleItemSingleClick = (itemId: number) => {
    const item = contents.find((contentItem) => contentItem.id === itemId);
    if (item) {
      setSelectedItem(item);
    }
  };

  const handleItemDoubleClick = (item: ContentItem) => {
    if (isArenaChannel(item)) {
      addWindow({
        title: item.title || "Channel",
        content: <ChannelExplorer channelSlug={item.slug} username={username} />,
        width: 600,
        height: 500,
        iconType: "other-channel",
        componentType: "ChannelExplorer",
        props: { channelSlug: item.slug, username },
      });
      return;
    }

    addWindow({
      title: getItemTitle(item),
      content: <BlockViewer blockId={item.id} initialConnection={item.connection} />,
      width: 600,
      height: 500,
      iconType: getIconType(item),
      componentType: "BlockViewer",
      props: { blockId: item.id, initialConnection: item.connection as ArenaConnection | null },
    });
  };

  const renderGridView = () => (
    <GridContent
      contents={contents}
      gridSize={gridSize}
      onSingleClick={handleItemSingleClick}
      onDoubleClick={handleItemDoubleClick}
      getIconType={getIconType}
      isMobile={isMobile}
      selectedId={selectedItem?.id}
    />
  );

  const renderListView = () => (
    <ListContent
      contents={contents}
      gridSize={gridSize}
      onSingleClick={handleItemSingleClick}
      onDoubleClick={handleItemDoubleClick}
      getIconType={getIconType}
      isMobile={isMobile}
      selectedId={selectedItem?.id}
    />
  );

  const renderPreviewContent = () => {
    if (!selectedItem) {
      return (
        <StateMessage>
          Select an item<br />to preview
        </StateMessage>
      );
    }

    if (isArenaChannel(selectedItem)) {
      const previewItem = selectedChannelPreview ?? selectedItem;

      return (
        <div className="flex flex-col h-full p-4 overflow-y-auto">
          <div className="text-xl font-bold mb-2">{previewItem.title}</div>
          <div className="text-sm text-muted-foreground mb-2">
            by{" "}
            {previewItem.owner ? (
              <a
                href={`https://www.are.na/${previewItem.owner.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-primary"
              >
                {previewItem.owner.name}
              </a>
            ) : (
              "Unknown"
            )}
          </div>
          <div className="text-sm mb-4">
            {previewItem.counts.contents} items
            {typeof previewItem.counts.followers === "number" ? ` / ${previewItem.counts.followers} followers` : ""}
          </div>

          {previewItem.descriptionPlain && (
            <div className="text-sm mb-4 text-muted-foreground">
              {previewItem.descriptionPlain}
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 mb-6">
            <div>Created: {formatDate(previewItem.createdAt)}</div>
            <div>Updated: {formatDate(previewItem.updatedAt)}</div>
          </div>

          <RetroButton onClick={() => handleItemDoubleClick(selectedItem)} className="w-full">
            Open Channel
          </RetroButton>
        </div>
      );
    }

    return <BlockViewer blockId={selectedItem.id} mode="embedded" initialBlock={selectedItem} />;
  };

  const handlePreviewToggle = () => {
    if (previewMode === "off") {
      setPreviewMode("horizontal");
    } else if (previewMode === "horizontal") {
      setPreviewMode("vertical");
    } else {
      setPreviewMode("off");
    }
  };

  return (
    <ArenaWindowLayout
      toolbar={
        <div className="flex items-center justify-between space-x-2 p-1 border-b border-border">
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" active={gridSize === "S"} onClick={() => setGridSize("S")} title="Small Icons">S</RetroButton>
            <RetroButton size="sm" active={gridSize === "M"} onClick={() => setGridSize("M")} title="Medium Icons">M</RetroButton>
            <RetroButton size="sm" active={gridSize === "L"} onClick={() => setGridSize("L")} title="Large Icons">L</RetroButton>
          </div>
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" active={!isListView} onClick={() => setIsListView(false)}>Grid</RetroButton>
            <RetroButton size="sm" active={isListView} onClick={() => setIsListView(true)}>List</RetroButton>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between space-x-2 p-1 border-t border-border bg-background">
          <div className="flex items-center space-x-2">
            <span className="text-xs opacity-50">Total: {contents.length} items</span>
          </div>
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" active={previewMode !== "off"} onClick={handlePreviewToggle}>
              Preview
            </RetroButton>
          </div>
        </div>
      }
    >
      {error && (
        <div className="px-2 py-1 mb-2 bg-yellow-100 dark:bg-yellow-900 text-xs">{error}</div>
      )}
      {loading ? (
        <StateMessage>
          <div className="text-center">
            <div className="mb-1">{loadingStatus}</div>
            <div className="progress-bar" />
          </div>
        </StateMessage>
      ) : previewMode !== "off" ? (
        <ResizablePanelGroup direction={previewMode === "vertical" ? "vertical" : "horizontal"} className="h-full w-full">
          <ResizablePanel defaultSize={50} minSize={20}>
            <div ref={contentViewportRef} className="h-full overflow-y-auto">
              {isListView ? renderListView() : renderGridView()}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className={`h-full bg-background ${previewMode === "vertical" ? "border-t" : "border-l"} border-border overflow-hidden`}>
              {renderPreviewContent()}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div ref={contentViewportRef} className="h-full overflow-y-auto">
          {isListView ? renderListView() : renderGridView()}
        </div>
      )}
    </ArenaWindowLayout>
  );
};
