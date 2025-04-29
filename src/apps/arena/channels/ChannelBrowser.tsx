import React, { useState, useEffect } from "react";
import { useDoubleClick } from "@/hooks/useDoubleClick";
import { ArenaChannel } from "@/types/arena";
import { getUserChannels } from "@/lib/api";
import { useWindowManager } from "@/hooks/useWindowManager";
import { ChannelExplorer } from "./ChannelExplorer";
import { CustomIcon } from "@/components/window/CustomIcon";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";

// Component for grid view channel item
const ChannelItem = React.memo(({ 
  channel, 
  onSingleClick, 
  onDoubleClick, 
  itemWidth, 
  iconSizeClass 
}: { 
  channel: ArenaChannel; 
  onSingleClick: () => void; 
  onDoubleClick: () => void; 
  itemWidth: string; 
  iconSizeClass: string;
}) => {
  const handleClick = useDoubleClick(
    (event: React.MouseEvent) => onSingleClick(),
    (event: React.MouseEvent) => onDoubleClick()
  );

  return (
    <div
      className="folder-item focus:ring-2 focus:ring-accent focus:ring-opacity-50"
      onClick={handleClick}
      style={{ width: itemWidth }}
      tabIndex={0}
    >
      <div className={`folder-icon ${iconSizeClass}`}>
        <CustomIcon iconType="folder" className="w-full h-full" />
      </div>
      <div className="folder-name">{channel.title}</div>
    </div>
  );
});

// Component for list view channel item
const ChannelItemListView = React.memo(({ 
  channel, 
  onSingleClick, 
  onDoubleClick, 
  iconSizeClass 
}: { 
  channel: ArenaChannel; 
  onSingleClick: () => void; 
  onDoubleClick: () => void; 
  iconSizeClass: string;
}) => {
  const handleClick = useDoubleClick(
    (event: React.MouseEvent) => onSingleClick(),
    (event: React.MouseEvent) => onDoubleClick()
  );

  return (
    <div
      onClick={handleClick}
      className="flex items-center space-x-1 p-1 hover:bg-accent/50 cursor-pointer focus:ring-2 focus:ring-accent focus:ring-opacity-50"
      tabIndex={0}
    >
      <CustomIcon iconType="folder" className={`${iconSizeClass} shrink-0`} />
      <span className="truncate text-sm">{channel.title}</span>
    </div>
  );
});

export const ChannelBrowser: React.FC<{ username?: string }> = ({ username = "lok" }) => {
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isListView, setIsListView] = useState(false);
  // Removed custom focus state, using native focus instead
  const { addWindow } = useWindowManager();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<'S' | 'M' | 'L'>('S');

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        
        const fetchedChannels = await getUserChannels(username);
        setChannels(fetchedChannels);
      } catch (error) {
        console.error("Error fetching user channels:", error);
        setLoadError("Failed to load channels. Using featured channels instead.");
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [username]);

  const handleChannelSingleClick = (channelId: number) => {
    // No custom focus state needed, native focus handles it
  };

  const handleChannelDoubleClick = (channel: ArenaChannel) => {
    addWindow({
      title: channel.title,
      content: <ChannelExplorer channelSlug={channel.slug} username={username} />,
      width: 600,
      height: 500,
      iconType: 'folder',
    });
  };

  const handleGoToChannel = (slug: string) => {
    if (!slug.trim()) return; 
    addWindow({
      title: slug, 
      content: <ChannelExplorer channelSlug={slug} username={username} />,
      width: 600,
      height: 500,
      iconType: 'other-channel', 
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleGoToChannel(search);
    }
  };

  const filteredChannels = channels.filter(
    (channel) => channel.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderGridView = () => {
    // Determine icon size classes based on size
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
        {filteredChannels.length === 0 ? (
          <div className="col-start-1 col-end-[-1] text-center p-4 opacity-50" style={{ gridColumn: '1 / -1' }}>
            Not found, just hit Go or Enter
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              // Removed isFocused prop, using native focus instead
              onSingleClick={() => handleChannelSingleClick(channel.id)}
              onDoubleClick={() => handleChannelDoubleClick(channel)}
              itemWidth={itemWidth[gridSize]}
              iconSizeClass={dynamicIconSizeClass}
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
        {filteredChannels.length === 0 ? (
          <div className="text-center p-1 opacity-50">
            Not found, just hit Go or Enter
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <ChannelItemListView
              key={channel.id}
              channel={channel}
              // Removed isFocused prop, using native focus instead
              onSingleClick={() => handleChannelSingleClick(channel.id)}
              onDoubleClick={() => handleChannelDoubleClick(channel)}
              iconSizeClass={dynamicIconSizeClass}
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
          <div className="flex items-center flex-1 mx-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown} 
              placeholder="Search titles or enter slug..."
              className="search-input text-xs flex-1 h-[18px] border-r-0 focus:outline-none" 
            />
            <button 
              onClick={() => handleGoToChannel(search)} 
              className={`retro-button text-xs px-1 h-[18px]`} 
              title="Go to channel slug"
            >
              Go
            </button>
          </div>
          <div className="flex items-center space-x-0">
            <button onClick={() => setIsListView(false)} className={`retro-button text-xs px-1 ${!isListView ? 'bg-accent' : ''}`}>Grid</button>
            <button onClick={() => setIsListView(true)} className={`retro-button text-xs px-1 ${isListView ? 'bg-accent' : ''}`}>List</button>
          </div>
        </div>
      }
    >
      {loadError && (
        <div className="px-2 py-1 mb-2 bg-yellow-100 dark:bg-yellow-900 text-xs">{loadError}</div>
      )}
      {loading ? (
        <div className="p-1 text-center">Loading...</div>
      ) : channels.length === 0 && !loadError ? (
        <div className="p-1 text-center">No channels available. Please try again later.</div>
      ) : isListView ? (
        renderListView()
      ) : (
        renderGridView()
      )}
    </ArenaWindowLayout>
  );
};
