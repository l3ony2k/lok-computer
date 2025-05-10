import React, { useState, useEffect } from "react";
import { ArenaChannel } from "@/types/arena";
import { getUserChannels } from "@/lib/api";
import { useWindowManager } from "@/hooks/useWindowManager";
import { ChannelExplorer } from "./ChannelExplorer";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";
import { useIsMobile } from '@/hooks/use-mobile';
import { ContentItemGrid, ContentItemListView, getGridConfiguration, ContentItem } from "../utils/contentItems";

export const ChannelBrowser: React.FC<{ username?: string }> = ({ username = "lok" }) => {
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isListView, setIsListView] = useState(false);
  const { addWindow } = useWindowManager();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<'S' | 'M' | 'L'>('S');
  const isMobile = useIsMobile();

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

  // Function to determine the icon type for a channel
  const getIconType = (item: ContentItem): string => {
    return 'folder';
  };

  const renderGridView = () => {
    const { gridIconSizeClass, itemWidth, gridTemplateStyle } = getGridConfiguration(gridSize);

    return (
      <div className="folder-grid" style={gridTemplateStyle}>
        {filteredChannels.length === 0 ? (
          <div className="col-start-1 col-end-[-1] text-center p-4 opacity-50" style={{ gridColumn: '1 / -1' }}>
            Not found, just hit Go or Enter
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <ContentItemGrid
              key={channel.id}
              item={channel as ContentItem}
              onSingleClick={() => handleChannelSingleClick(channel.id)}
              onDoubleClick={() => handleChannelDoubleClick(channel)}
              itemWidth={itemWidth}
              iconSizeClass={gridIconSizeClass}
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
        {filteredChannels.length === 0 ? (
          <div className="text-center p-1 opacity-50">
            Not found, just hit Go or Enter
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <ContentItemListView
              key={channel.id}
              item={channel as ContentItem}
              onSingleClick={() => handleChannelSingleClick(channel.id)}
              onDoubleClick={() => handleChannelDoubleClick(channel)}
              iconSizeClass={listIconSizeClass}
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
        <div className="text-center p-4">Loading channels...</div>
      ) : (
        isListView ? renderListView() : renderGridView()
      )}
    </ArenaWindowLayout>
  );
};
