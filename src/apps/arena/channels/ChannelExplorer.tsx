import React, { useState, useEffect, useMemo } from "react";
import { ArenaBlock } from "@/types/arena";
import { getChannelContents } from "@/lib/api";
import { useWindowManager } from "@/hooks/useWindowManager";
import { BlockViewer } from "../blocks/BlockViewer";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContentItemGrid, ContentItemListView, getGridConfiguration, ContentItem, getItemTitle } from "../utils/contentItems";
import { RetroButton } from "@/components/ui/RetroButton";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

// Memoized content item components for better performance
const MemoizedContentItemGrid = React.memo(ContentItemGrid);
const MemoizedContentItemListView = React.memo(ContentItemListView);

interface ContentRendererProps {
  contents: ContentItem[];
  gridSize: 'S' | 'M' | 'L';
  onSingleClick: (itemId: number) => void;
  onDoubleClick: (item: ContentItem) => void;
  renderThumbnail: (image: any) => string;
  getIconType: (item: ContentItem) => string;
  isMobile: boolean;
  selectedId?: number | null;
}

// Memoized grid content renderer
const GridContent = React.memo(({
  contents,
  gridSize,
  onSingleClick,
  onDoubleClick,
  renderThumbnail,
  getIconType,
  isMobile,
  selectedId
}: ContentRendererProps) => {
  const { gridIconSizeClass, itemWidth, gridTemplateStyle } = getGridConfiguration(gridSize);

  if (contents.length === 0) {
    return (
      <div className="col-start-1 col-end-[-1] text-center p-4 opacity-50">
        This channel is empty
      </div>
    );
  }

  return (
    <div className="folder-grid" style={gridTemplateStyle}>
      {contents.map((item) => (
        <div key={item.id} className={selectedId === item.id ? "ring-2 ring-accent" : ""}>
          <MemoizedContentItemGrid
            item={item}
            onSingleClick={() => onSingleClick(item.id)}
            onDoubleClick={() => onDoubleClick(item)}
            itemWidth={itemWidth}
            iconSizeClass={gridIconSizeClass}
            renderThumbnail={renderThumbnail}
            getIconType={getIconType}
            isMobile={isMobile}
          />
        </div>
      ))}
    </div>
  );
});

// Memoized list content renderer
const ListContent = React.memo(({
  contents,
  gridSize,
  onSingleClick,
  onDoubleClick,
  renderThumbnail,
  getIconType,
  isMobile,
  selectedId
}: ContentRendererProps) => {
  const { listIconSizeClass } = getGridConfiguration(gridSize);

  if (contents.length === 0) {
    return (
      <div className="text-center p-1 opacity-50">
        This channel is empty
      </div>
    );
  }

  return (
    <div className="space-y-1 p-1">
      {contents.map((item) => (
        <div key={item.id} className={selectedId === item.id ? "bg-muted/50 rounded-sm" : ""}>
          <MemoizedContentItemListView
            item={item}
            onSingleClick={() => onSingleClick(item.id)}
            onDoubleClick={() => onDoubleClick(item)}
            iconSizeClass={listIconSizeClass}
            renderThumbnail={renderThumbnail}
            getIconType={getIconType}
            isMobile={isMobile}
          />
        </div>
      ))}
    </div>
  );
});

export const ChannelExplorer: React.FC<{ channelSlug?: string; username?: string; items?: ContentItem[] }> = ({
  channelSlug,
  username = "lok",
  items
}) => {
  const [loading, setLoading] = useState(!items);
  const [loadingStatus, setLoadingStatus] = useState<string>("Initializing...");
  const [contents, setContents] = useState<ContentItem[]>(items || []);
  const [error, setError] = useState<string | null>(null);
  const [isListView, setIsListView] = useState(false);
  const { addWindow } = useWindowManager();
  const [gridSize, setGridSize] = useState<'S' | 'M' | 'L'>('S');
  const itemsPerPage = 100;
  const isMobile = useIsMobile();

  // Preview Mode State
  const [showPreview, setShowPreview] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    if (items) {
      setContents(items);
      setLoading(false);
      return;
    }

    if (!channelSlug) return;

    // Create an AbortController to cancel fetch requests if the component unmounts
    const abortController = new AbortController();
    let isMounted = true;

    const fetchAllChannelContents = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        setContents([]);

        // First fetch to get an estimate of total content
        setLoadingStatus("Estimating total content...");
        const initialData = await getChannelContents(channelSlug, username, 1, itemsPerPage, abortController.signal);

        if (!isMounted) return;

        const totalItems = initialData.length || 0;
        const estimatedTotalPages = Math.ceil(totalItems / itemsPerPage);

        console.log(`Channel ${channelSlug} has approximately ${totalItems} items (estimated ${estimatedTotalPages} pages)`);

        // Add first page of content
        let allContents: ContentItem[] = [...(initialData.contents || [])];

        if (estimatedTotalPages <= 1) {
          // If only one page, we're already done
          if (isMounted) {
            // Sort content by position in descending order (newest first)
            allContents.sort((a, b) => (b.position || 0) - (a.position || 0));
            setContents(allContents);
            setError(null);
          }
          return;
        }

        // Fetch remaining pages in batches of 3
        const batchSize = 3;
        let currentPage = 2; // Start from page 2 since we already fetched page 1

        while (currentPage <= estimatedTotalPages && isMounted) {
          // Calculate the batch of pages to fetch in parallel
          const pagesToFetch = [];
          for (let i = 0; i < batchSize && currentPage + i <= estimatedTotalPages; i++) {
            pagesToFetch.push(currentPage + i);
          }

          // Update loading status
          if (isMounted) {
            setLoadingStatus(`Fetching pages ${pagesToFetch[0]}-${pagesToFetch[pagesToFetch.length - 1]}/${estimatedTotalPages}...`);
          }

          // Fetch multiple pages in parallel
          const fetchPromises = pagesToFetch.map(page =>
            getChannelContents(channelSlug, username, page, itemsPerPage, abortController.signal)
          );

          try {
            const results = await Promise.all(fetchPromises);

            if (!isMounted) return;

            // Process results and add to allContents
            let hasMoreContent = false;
            for (const data of results) {
              const pageContents = data.contents || [];
              allContents = [...allContents, ...pageContents];

              // Check if we potentially have more pages
              if (pageContents.length === itemsPerPage) {
                hasMoreContent = true;
              }
            }

            console.log(`Fetched batch, now have ${allContents.length} items`);

            // Update currentPage for next batch
            currentPage += pagesToFetch.length;

            // If the last page in the batch had fewer items than itemsPerPage,
            // we've probably reached the end of content
            if (!hasMoreContent && currentPage > estimatedTotalPages) {
              break;
            }
          } catch (err) {
            // If we're here with an AbortError, the component was unmounted
            if (err.name === 'AbortError') {
              console.log('Fetch aborted due to component unmount');
              return;
            }
            throw err; // Re-throw other errors to be caught by the outer catch
          }
        }

        if (isMounted) {
          // Sort content by position in descending order (newest first)
          allContents.sort((a, b) => (b.position || 0) - (a.position || 0));
          setContents(allContents);
          setError(null);
          console.log(`Completed fetching all ${allContents.length} contents for channel ${channelSlug}`);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load channel contents");
          console.error(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllChannelContents();

    // Cleanup function to abort any in-progress fetches when the component unmounts
    return () => {
      isMounted = false;
      abortController.abort();
      console.log('Aborting channel content fetches due to component unmount');
    };
  }, [channelSlug, username, itemsPerPage, items]);

  const getIconType = (item: ContentItem): string => {
    if (item.base_class === "Channel") return "other-channel";

    const blockClass = (item as ArenaBlock).class;
    if (blockClass === "Text") return "text";
    if (blockClass === "Link") return "link";
    if (blockClass === "Image") return "image";
    if (blockClass === "Attachment") return "text";
    if (blockClass === "Media") return "video";

    return "text"; // Default to text icon for unknown/other block types
  };

  const handleItemSingleClick = (itemId: number) => {
    const item = contents.find(c => c.id === itemId);
    if (item) {
      setSelectedItem(item);
    }
  };

  const handleItemDoubleClick = (item: ContentItem) => {
    if (item.base_class === "Channel") {
      addWindow({
        title: item.title || "Channel",
        content: <ChannelExplorer channelSlug={item.slug!} username={username} />,
        width: 600,
        height: 500,
        iconType: "other-channel",
      });
    } else if (item.class === "Link" && item.source?.url) {
      // Handle Link items specifically (from LinkFolder logic)
      const { WebBrowser } = require("@/apps/web/WebBrowser");
      addWindow({
        title: getItemTitle(item),
        content: <WebBrowser initialUrl={item.source.url} />,
        width: 800,
        height: 600,
        iconType: "link",
      });
    } else {
      addWindow({
        title: getItemTitle(item),
        content: <BlockViewer blockId={item.id} />,
        width: 600,
        height: 500,
        iconType: getIconType(item),
      });
    }
  };

  const renderThumbnail = (image: any) => {
    // Support both string and object URL formats
    if (typeof image === 'string') return image;
    if (image && typeof image === 'object' && 'url' in image) return image.url;
    return '';
  };

  const renderGridView = () => (
    <GridContent
      contents={contents}
      gridSize={gridSize}
      onSingleClick={handleItemSingleClick}
      onDoubleClick={handleItemDoubleClick}
      renderThumbnail={renderThumbnail}
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
      renderThumbnail={renderThumbnail}
      getIconType={getIconType}
      isMobile={isMobile}
      selectedId={selectedItem?.id}
    />
  );

  const renderPreviewContent = () => {
    if (!selectedItem) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
          Select an item to preview
        </div>
      );
    }

    if (selectedItem.base_class === "Channel") {
      const formatDate = (dateString?: string) => {
        if (!dateString) return "Unknown";
        return new Date(dateString).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };

      return (
        <div className="flex flex-col h-full p-4 overflow-y-auto">
          <div className="text-xl font-bold mb-2">{selectedItem.title}</div>
          <div className="text-sm text-muted-foreground mb-2">
            by <a href={`https://www.are.na/${selectedItem.user?.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">{selectedItem.user?.full_name || "Unknown"}</a>
          </div>
          <div className="text-sm mb-4">
            {selectedItem.length} blocks / {selectedItem.follower_count || 0} followers
          </div>

          <div className="text-xs text-muted-foreground space-y-1 mb-6">
            <div>Created: {formatDate(selectedItem.created_at)}</div>
            <div>Updated: {formatDate(selectedItem.updated_at)}</div>
          </div>

          <Button
            onClick={() => handleItemDoubleClick(selectedItem)}
            className="w-full"
            variant="secondary"
          >
            Open Channel
          </Button>
        </div>
      );
    }

    return <BlockViewer blockId={selectedItem.id} mode="embedded" />;
  };

  return (
    <ArenaWindowLayout
      toolbar={
        <div className="flex items-center justify-between space-x-2 p-1 border-b border-border">
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" active={gridSize === 'S'} onClick={() => setGridSize('S')} title="Small Icons">S</RetroButton>
            <RetroButton size="sm" active={gridSize === 'M'} onClick={() => setGridSize('M')} title="Medium Icons">M</RetroButton>
            <RetroButton size="sm" active={gridSize === 'L'} onClick={() => setGridSize('L')} title="Large Icons">L</RetroButton>
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
            <RetroButton size="sm" active={showPreview} onClick={() => setShowPreview(!showPreview)}>Preview</RetroButton>
          </div>
        </div>
      }
    >
      {error && (
        <div className="px-2 py-1 mb-2 bg-yellow-100 dark:bg-yellow-900 text-xs">{error}</div>
      )}
      {loading ? (
        <div className="p-4 text-center">
          <div className="text-xs mb-1">{loadingStatus}</div>
          <div className="progress-bar"></div>
        </div>
      ) : (
        showPreview ? (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="h-full overflow-y-auto">
                {isListView ? renderListView() : renderGridView()}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="h-full bg-background border-l border-border overflow-hidden">
                {renderPreviewContent()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full overflow-y-auto">
            {isListView ? renderListView() : renderGridView()}
          </div>
        )
      )}
    </ArenaWindowLayout>
  );
};
