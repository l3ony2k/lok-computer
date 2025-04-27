import { useState, useEffect } from "react";
import { ArenaBlock, ArenaChannel } from "@/types/arena";
import { getChannelContents } from "@/lib/api";
import { useWindowManager } from "@/hooks/useWindowManager";
import { BlockViewer } from "../blocks/BlockViewer";
import { toast } from "sonner";
import { CustomIcon } from "@/components/window/CustomIcon";

interface ContentItem extends Partial<ArenaBlock>, Partial<ArenaChannel> {
  id: number;
  base_class: string;
  class?: string;
  title?: string;
}

export const ChannelExplorer = ({ 
  channelSlug, 
  username = "lok" 
}: { 
  channelSlug: string; 
  username?: string;
}) => {
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isListView, setIsListView] = useState(false);
  const { addWindow } = useWindowManager();
  const [gridSize, setGridSize] = useState<'S' | 'M' | 'L'>('S');

  useEffect(() => {
    const fetchChannelContents = async () => {
      try {
        setLoading(true);
        const data = await getChannelContents(channelSlug, username);
        setContents(data.contents || []);
        setError(null);
      } catch (err) {
        setError("Failed to load channel contents");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannelContents();
  }, [channelSlug, username]);

  const getIconType = (item: ContentItem): string => {
    if (item.base_class === "Channel") return 'other-channel';
    if (item.class === "Image") return 'image';
    if (item.class === "Text") return 'text'; 
    if (item.class === "Media") return 'video'; // Assuming Media is Video
    if (item.class === "Link") return 'link';
    return 'text'; // Default to text icon for unknown/other block types
  };

  const handleItemClick = (item: ContentItem) => {
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
    const iconSizeClasses = { S: 'w-12 h-12', M: 'w-16 h-16', L: 'w-20 h-20' };
    const dynamicIconSizeClass = iconSizeClasses[gridSize] || 'w-12 h-12';

    // Determine minmax value for auto-fit grid based on size
    const minColWidth = {
      S: '64px',
      M: '96px',
      L: '128px',
    }
    const gridTemplateStyle = { 
      gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth[gridSize] || '64px'}, 1fr))` 
    };

    return (
      <div className={`folder-grid`} style={gridTemplateStyle}> 
        {contents.length === 0 ? (
          // Use grid-column-start to span full width correctly with auto-fit
          <div className="col-start-1 col-end-[-1] text-center p-4">
            No contents found for this channel.
          </div>
        ) : (
          contents.map((item) => (
            <div
              key={item.id}
              className="folder-item"
              onClick={() => handleItemClick(item)}
            >
              {/* Apply dynamic size to folder-icon container */}
              <div className={`folder-icon ${dynamicIconSizeClass}`}> 
                {(item as ArenaBlock).class === "Image" && (item as ArenaBlock).image?.thumb ? (
                  <img 
                    src={renderThumbnail((item as ArenaBlock).image?.thumb)} 
                    alt={item.title || "Thumbnail"}
                    className={`w-full h-full object-cover`} // Fill container
                    loading="lazy"
                  />
                ) : (
                  <CustomIcon iconType={getIconType(item)} className={`w-full h-full`} /> // Fill container
                )}
              </div>
              <div className="folder-name">
                {item.title || 
                  (item as ArenaBlock).generated_title ||
                  "Untitled"}
              </div>
            </div>
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
        {contents.map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="flex items-center space-x-4 p-2 hover:bg-accent/50 cursor-pointer"
          >
            {(item as ArenaBlock).class === "Image" && (item as ArenaBlock).image?.thumb ? (
              <img 
                src={renderThumbnail((item as ArenaBlock).image?.thumb)} 
                alt={item.title || "Thumbnail"}
                className={`${dynamicIconSizeClass} object-cover shrink-0`} // Apply dynamic size directly
                loading="lazy"
              />
            ) : (
              <CustomIcon iconType={getIconType(item)} className={`${dynamicIconSizeClass} shrink-0`} /> // Apply dynamic size directly
            )}
            <span className="truncate text-sm">
              {item.title || (item as ArenaBlock).generated_title || "Untitled"}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between space-x-1 p-1 border-b border-border">
        <div className="flex items-center space-x-0">
          <button 
            onClick={() => setGridSize('S')}
            className={`retro-button text-xs px-1 ${gridSize === 'S' ? 'bg-accent' : ''}`}
            title="Small Icons"
          >
            S
          </button>
          <button 
            onClick={() => setGridSize('M')}
            className={`retro-button text-xs px-1 ${gridSize === 'M' ? 'bg-accent' : ''}`}
            title="Medium Icons"
          >
            M
          </button>
          <button 
            onClick={() => setGridSize('L')}
            className={`retro-button text-xs px-1 ${gridSize === 'L' ? 'bg-accent' : ''}`}
            title="Large Icons"
          >
            L
          </button>
        </div>

        <div className="flex items-center space-x-0"> 
          <button 
            onClick={() => setIsListView(false)}
            className={`retro-button text-xs px-1 ${!isListView ? 'bg-accent' : ''}`}
          >
            Grid
          </button>
          <button 
            onClick={() => setIsListView(true)}
            className={`retro-button text-xs px-1 ${isListView ? 'bg-accent' : ''}`}
          >
            List
          </button>
        </div>
      </div>
      <div className="overflow-auto flex-1">
        {contents.length === 0 ? (
          <div className="text-center p-4">This channel is empty</div>
        ) : isListView ? (
          renderListView()
        ) : (
          renderGridView()
        )}
      </div>
    </div>
  );
};
