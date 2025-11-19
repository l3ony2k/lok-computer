import React, { useState, useEffect, useMemo } from "react";
import { ArenaBlock } from "@/types/arena";
import { getChannelContents } from "@/lib/api";
import { useWindowManager } from "@/hooks/useWindowManager";
import { BlockViewer } from "../blocks/BlockViewer";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContentItemGrid, ContentItemListView, getGridConfiguration, ContentItem, getItemTitle } from "../utils/contentItems";
import { FixedSizeGrid, FixedSizeList, GridChildComponentProps, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { RetroButton } from "@/components/ui/RetroButton";

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
}

interface AutoSizerProps {
  height: number;
  width: number;
}

// Memoized grid content renderer
const GridContent = React.memo(({
  contents,
  gridSize,
  onSingleClick,
  onDoubleClick,
  renderThumbnail,
  getIconType,
  isMobile
}: ContentRendererProps) => {
  const { gridIconSizeClass, itemWidth } = getGridConfiguration(gridSize);
  // Convert itemWidth from string (e.g. '64px') to number for grid calculations
  const itemWidthNum = parseInt(itemWidth.replace('px', ''), 10);

  if (contents.length === 0) {
    return (
      <div className="col-start-1 col-end-[-1] text-center p-4 opacity-50">
        This channel is empty
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }: AutoSizerProps) => {
          // Add gap/padding to column width calculations
          const gap = 8; // 4px padding on each side
          const columnWidth = itemWidthNum + gap;
          const columnCount = Math.max(1, Math.floor(width / columnWidth));
          const rowCount = Math.ceil(contents.length / columnCount);
          const itemHeight = columnWidth + 32; // Approximate height based on content

          return (
            <FixedSizeGrid
              className="folder-grid"
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={height}
              rowCount={rowCount}
              rowHeight={itemHeight}
              width={width}
              style={{ overflow: 'auto' }}
            >
              {({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
                const itemIndex = rowIndex * columnCount + columnIndex;
                const item = contents[itemIndex];

                if (!item) return null;

                return (
                  <div style={style} className="p-1">
                    <MemoizedContentItemGrid
                      key={item.id}
                      item={item}
                      onSingleClick={() => onSingleClick(item.id)}
                      onDoubleClick={() => onDoubleClick(item)}
                      itemWidth={itemWidth} // Pass the original string width
                      iconSizeClass={gridIconSizeClass}
                      renderThumbnail={renderThumbnail}
                      getIconType={getIconType}
                      isMobile={isMobile}
                    />
                  </div>
                );
              }}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>
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
  isMobile
}: ContentRendererProps) => {
  const { listIconSizeClass } = getGridConfiguration(gridSize);

  // Dynamic item size to fix list view overlapping
  const itemSizeMap = {
    S: 40, // icon (h-6, 24px) + vertical padding (p-2, 16px)
    M: 48, // icon (h-8, 32px) + vertical padding (p-2, 16px)
    L: 56, // icon (h-10, 40px) + vertical padding (p-2, 16px)
  };
  const itemSize = (itemSizeMap[gridSize] || 40) + 4; // Add 4px for gap

  if (contents.length === 0) {
    return (
      <div className="text-center p-1 opacity-50">
        This channel is empty
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }: AutoSizerProps) => (
          <FixedSizeList
            className="space-y-1 p-1"
            height={height}
            itemCount={contents.length}
            itemSize={itemSize}
            width={width}
            style={{ overflow: 'auto' }}
          >
            {({ index, style }: ListChildComponentProps) => (
              <div style={{ ...style, width: width - 8, left: 4 }}>
                <MemoizedContentItemListView
                  key={contents[index].id}
                  item={contents[index]}
                  onSingleClick={() => onSingleClick(contents[index].id)}
                  onDoubleClick={() => onDoubleClick(contents[index])}
                  iconSizeClass={listIconSizeClass}
                  renderThumbnail={renderThumbnail}
                  getIconType={getIconType}
                  isMobile={isMobile}
                />
              </div>
            )}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
});

export const ChannelExplorer: React.FC<{ channelSlug: string; username?: string }> = ({
  channelSlug,
  username = "lok"
}) => {
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState<string>("Initializing...");
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isListView, setIsListView] = useState(false);
  const { addWindow } = useWindowManager();
  const [gridSize, setGridSize] = useState<'S' | 'M' | 'L'>('S');
  const itemsPerPage = 100;
  const isMobile = useIsMobile();

  useEffect(() => {
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
  }, [channelSlug, username, itemsPerPage]);

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
    // Using native focus, no custom focus state needed
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
    />
  );

  return (
    <ArenaWindowLayout
      toolbar={
        <div className="flex items-center justify-between space-x-2 p-1 border-b border-border">
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" active={gridSize === 'S'} onClick={() => setGridSize('S')} title="Small Icons">S</RetroButton>
            <RetroButton size="sm" active={gridSize === 'M'} onClick={() => setGridSize('M')} title="Medium Icons">M</RetroButton>
            <RetroButton size="sm" active={gridSize === 'L'} onClick={() => setGridSize('L')} title="Large Icons">L</RetroButton>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs opacity-50">Total: {contents.length} items</span>
          </div>
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" active={!isListView} onClick={() => setIsListView(false)}>Grid</RetroButton>
            <RetroButton size="sm" active={isListView} onClick={() => setIsListView(true)}>List</RetroButton>
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
        isListView ? renderListView() : renderGridView()
      )}
    </ArenaWindowLayout>
  );
};
