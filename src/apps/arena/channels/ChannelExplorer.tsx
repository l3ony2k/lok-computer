import React, { useState, useEffect } from "react";
import { useDoubleClick } from "@/hooks/useDoubleClick";
import { ArenaBlock, ArenaChannel } from "@/types/arena";
import { getChannelContents } from "@/lib/api";
import { useWindowManager } from "@/hooks/useWindowManager";
import { BlockViewer } from "../blocks/BlockViewer";
import { CustomIcon } from "@/components/window/CustomIcon";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";
import { useIsMobile } from "@/hooks/use-mobile";

interface ContentItem extends Partial<ArenaBlock>, Partial<ArenaChannel> {
  id: number;
  base_class: string;
  class?: string;
  title?: string;
}

// Component for grid view content item
const ContentItemGrid = React.memo(({ 
  item, 
  onSingleClick, 
  onDoubleClick, 
  itemWidth, 
  iconSizeClass,
  renderThumbnail,
  getIconType,
  isMobile
}: { 
  item: ContentItem; 
  onSingleClick: () => void; 
  onDoubleClick: () => void; 
  itemWidth: string; 
  iconSizeClass: string;
  renderThumbnail: (image: any) => string;
  getIconType: (item: ContentItem) => string;
  isMobile: boolean;
}) => {
  // Always call useDoubleClick
  const doubleClickHandler = useDoubleClick(
    (event: React.MouseEvent | React.TouchEvent) => onSingleClick(),
    (event: React.MouseEvent | React.TouchEvent) => onDoubleClick()
  );
  // Conditionally choose the action for onClick
  const handleClick = isMobile ? onDoubleClick : doubleClickHandler;

  return (
    <div
      className="folder-item focus:ring-2 focus:ring-accent focus:ring-opacity-50"
      onClick={handleClick}
      style={{ width: itemWidth }}
      tabIndex={0}
    >
      <div className={`folder-icon ${iconSizeClass}`}> 
        {(item as ArenaBlock).class === "Image" && (item as ArenaBlock).image?.thumb ? (
          <img 
            src={renderThumbnail((item as ArenaBlock).image?.thumb)} 
            alt={item.title || "Thumbnail"}
            className={`w-full h-full object-cover`}
            loading="lazy"
          />
        ) : (
          <CustomIcon iconType={getIconType(item)} className={`w-full h-full`} />
        )}
      </div>
      <div className="folder-name">
        {item.title || (item as ArenaBlock).generated_title || "Untitled"}
      </div>
    </div>
  );
});

// Component for list view content item
const ContentItemListView = React.memo(({ 
  item, 
  onSingleClick, 
  onDoubleClick, 
  iconSizeClass,
  renderThumbnail,
  getIconType,
  isMobile
}: { 
  item: ContentItem; 
  onSingleClick: () => void; 
  onDoubleClick: () => void; 
  iconSizeClass: string;
  renderThumbnail: (image: any) => string;
  getIconType: (item: ContentItem) => string;
  isMobile: boolean;
}) => {
  // Always call useDoubleClick
  const doubleClickHandler = useDoubleClick(
    (event: React.MouseEvent | React.TouchEvent) => onSingleClick(),
    (event: React.MouseEvent | React.TouchEvent) => onDoubleClick()
  );
  // Conditionally choose the action for onClick
  const handleClick = isMobile ? onDoubleClick : doubleClickHandler;

  return (
    <div
      onClick={handleClick}
      className="flex items-center space-x-4 p-2 hover:bg-accent/50 cursor-pointer focus:ring-2 focus:ring-accent focus:ring-opacity-50"
      tabIndex={0}
    >
      {(item as ArenaBlock).class === "Image" && (item as ArenaBlock).image?.thumb ? (
        <img 
          src={renderThumbnail((item as ArenaBlock).image?.thumb)} 
          alt={item.title || "Thumbnail"}
          className={`${iconSizeClass} object-cover shrink-0`}
          loading="lazy"
        />
      ) : (
        <CustomIcon iconType={getIconType(item)} className={`${iconSizeClass} shrink-0`} />
      )}
      <span className="truncate text-sm">
        {item.title || (item as ArenaBlock).generated_title || "Untitled"}
      </span>
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
    if (item.base_class === "Channel") return 'other-channel';
    if (item.class === "Image") return 'image';
    if (item.class === "Text") return 'text'; 
    if (item.class === "Media") return 'video'; // Assuming Media is Video
    if (item.class === "Link") return 'link';
    return 'text'; // Default to text icon for unknown/other block types
  };

  const handleItemSingleClick = (itemId: number) => {
    // No custom focus state needed, native focus handles it
  };

  const handleItemDoubleClick = (item: ContentItem) => {
    const iconType = getIconType(item);
    if (item.base_class === "Channel") {
      addWindow({
        title: item.title || "Untitled Channel",
        content: <ChannelExplorer channelSlug={item.slug!} username={username} />,
        width: 600,
        height: 500,
        iconType: iconType, // Pass 'other-channel'
      });
    } else {
      addWindow({
        title: item.title || (item as ArenaBlock).generated_title || "Untitled Block",
        content: <BlockViewer blockId={item.id} />,
        width: 600,
        height: 500,
        iconType: iconType, // Pass derived iconType
      });
    }
  };

  const renderThumbnail = (image: any) => {
    // If image is a string, return it directly
    if (typeof image === 'string') {
      return image;
    }
    // If it's an object with url property, return the url
    return image?.url || '';
  };

  const renderGridView = () => {
    // Determine icon container size classes based on size
    const iconSizeClasses = { S: 'w-12 h-12', M: 'w-20 h-20', L: 'w-28 h-28' };
    const dynamicIconSizeClass = iconSizeClasses[gridSize] || 'w-12 h-12';

    // Fixed width for each grid item based on size
    const itemWidth = {
      S: '64px',
      M: '109px',
      L: '136px',
    };

    // Use fixed width instead of minmax with 1fr
    const gridTemplateStyle = { 
      gridTemplateColumns: `repeat(auto-fill, ${itemWidth[gridSize]})`,
      justifyContent: 'start' // Align items to the start instead of stretching
    };

    return (
      <div className={`folder-grid`} style={gridTemplateStyle}> 
        {contents.length === 0 ? (
          // Use grid-column-start to span full width correctly with auto-fit
          <div className="col-start-1 col-end-[-1] text-center p-4 opacity-50" style={{ gridColumn: '1 / -1' }}>
            No contents found for this channel.
          </div>
        ) : (
          contents.map((item, index) => (
            <ContentItemGrid
              key={item.id + "-" + index} 
              item={item}
              isMobile={isMobile}
              onSingleClick={() => handleItemSingleClick(item.id)}
              onDoubleClick={() => handleItemDoubleClick(item)}
              itemWidth={itemWidth[gridSize]}
              iconSizeClass={dynamicIconSizeClass}
              renderThumbnail={renderThumbnail}
              getIconType={getIconType}
            />
          ))
        )}
      </div>
    );
  };

  const renderListView = () => {
    // Determine icon size classes based on size
    const iconSizeClasses = { S: 'w-6 h-6', M: 'w-8 h-8', L: 'w-10 h-10' };
    const dynamicIconSizeClass = iconSizeClasses[gridSize] || 'w-6 h-6';

    return (
      <div className="space-y-1 p-1">
        {contents.map((item, index) => (
          <ContentItemListView
            key={item.id + "-" + index}
            item={item}
            isMobile={isMobile}
            onSingleClick={() => handleItemSingleClick(item.id)}
            onDoubleClick={() => handleItemDoubleClick(item)}
            iconSizeClass={dynamicIconSizeClass}
            renderThumbnail={renderThumbnail}
            getIconType={getIconType}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full">
        <div className="text-center opacity-50">{loadingStatus}</div>
        <div className="text-center mt-2 opacity-50">Please wait while all content is fetched...</div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <ArenaWindowLayout
      toolbar={
        <div className="flex items-center justify-between space-x-1 p-1 border-b border-border">
          <div className="flex items-center space-x-0">
            <button onClick={() => setGridSize('S')} className={`retro-button text-xs px-1 ${gridSize === 'S' ? 'bg-accent' : ''}`} title="Small Icons">
              S
            </button>
            <button onClick={() => setGridSize('M')} className={`retro-button text-xs px-1 ${gridSize === 'M' ? 'bg-accent' : ''}`} title="Medium Icons">
              M
            </button>
            <button onClick={() => setGridSize('L')} className={`retro-button text-xs px-1 ${gridSize === 'L' ? 'bg-accent' : ''}`} title="Large Icons">
              L
            </button>
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
      <div>
        {contents.length === 0 ? (
          <div className="text-center p-4">This channel is empty</div>
        ) : isListView ? (
          renderListView()
        ) : (
          renderGridView()
        )}
      </div>
    </ArenaWindowLayout>
  );
};
