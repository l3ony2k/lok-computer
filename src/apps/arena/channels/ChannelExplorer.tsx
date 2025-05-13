import React, { useState, useEffect } from "react";
import { ArenaBlock } from "@/types/arena";
import { getChannelContents } from "@/lib/api";
import { useWindowManager } from "@/hooks/useWindowManager";
import { BlockViewer } from "../blocks/BlockViewer";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContentItemGrid, ContentItemListView, getGridConfiguration, ContentItem, getItemTitle } from "../utils/contentItems";

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
            setLoadingStatus(`Fetching pages ${pagesToFetch[0]}-${pagesToFetch[pagesToFetch.length-1]}/${estimatedTotalPages}...`);
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

  const renderGridView = () => {
    const { gridIconSizeClass, itemWidth, gridTemplateStyle } = getGridConfiguration(gridSize);

    return (
      <div className="folder-grid" style={gridTemplateStyle}>
        {contents.length === 0 ? (
          <div className="col-start-1 col-end-[-1] text-center p-4 opacity-50" style={{ gridColumn: '1 / -1' }}>
            This channel is empty
          </div>
        ) : (
          contents.map((item) => (
            <ContentItemGrid
              key={item.id}
              item={item}
              onSingleClick={() => handleItemSingleClick(item.id)}
              onDoubleClick={() => handleItemDoubleClick(item)}
              itemWidth={itemWidth}
              iconSizeClass={gridIconSizeClass}
              renderThumbnail={renderThumbnail}
              getIconType={getIconType}
              isMobile={isMobile}
            />
          ))
        )}
      </div>
    );
  };

  const renderListView = () => {
    const { listIconSizeClass } = getGridConfiguration(gridSize);

    return (
      <div className="space-y-1 p-1">
        {contents.length === 0 ? (
          <div className="text-center p-1 opacity-50">
            This channel is empty
          </div>
        ) : (
          contents.map((item) => (
            <ContentItemListView
              key={item.id}
              item={item}
              onSingleClick={() => handleItemSingleClick(item.id)}
              onDoubleClick={() => handleItemDoubleClick(item)}
              iconSizeClass={listIconSizeClass}
              renderThumbnail={renderThumbnail}
              getIconType={getIconType}
              isMobile={isMobile}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <ArenaWindowLayout
      toolbar={
        <div className="flex items-center justify-between space-x-2 p-1 border-b border-border">
          <div className="flex items-center space-x-0">
            <button onClick={() => setGridSize('S')} className={`retro-button text-xs px-1 ${gridSize === 'S' ? 'bg-accent' : ''}`} title="Small Icons">S</button>
            <button onClick={() => setGridSize('M')} className={`retro-button text-xs px-1 ${gridSize === 'M' ? 'bg-accent' : ''}`} title="Medium Icons">M</button>
            <button onClick={() => setGridSize('L')} className={`retro-button text-xs px-1 ${gridSize === 'L' ? 'bg-accent' : ''}`} title="Large Icons">L</button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs opacity-50">Total: {contents.length} items</span>
          </div>
          <div className="flex items-center space-x-0">
            <button onClick={() => setIsListView(false)} className={`retro-button text-xs px-1 ${!isListView ? 'bg-accent' : ''}`}>Grid</button>
            <button onClick={() => setIsListView(true)} className={`retro-button text-xs px-1 ${isListView ? 'bg-accent' : ''}`}>List</button>
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
