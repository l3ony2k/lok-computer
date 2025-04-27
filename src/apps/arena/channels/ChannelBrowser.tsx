import { useState, useEffect } from "react";
import { ArenaChannel } from "@/types/arena";
import { getUserChannels } from "@/lib/api";
import { useWindowManager } from "@/hooks/useWindowManager";
import { ChannelExplorer } from "./ChannelExplorer";
import { CustomIcon } from "@/components/window/CustomIcon";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";

export const ChannelBrowser = ({ username = "lok" }: { username?: string }) => {
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isListView, setIsListView] = useState(false);
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

  const handleChannelClick = (channel: ArenaChannel) => {
    addWindow({
      title: channel.title,
      content: <ChannelExplorer channelSlug={channel.slug} username={username} />,
      width: 600,
      height: 500,
      iconType: 'folder',
    });
  };

  const filteredChannels = channels.filter(
    (channel) => channel.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderGridView = () => {
    // Determine icon size classes based on size
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
        {filteredChannels.length === 0 ? (
          <div className="col-start-1 col-end-[-1] text-center p-4">
            No channels found
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <div
              key={channel.id}
              className="folder-item"
              onClick={() => handleChannelClick(channel)}
            >
              {/* Apply dynamic size to folder-icon container */}
              <div className={`folder-icon ${dynamicIconSizeClass}`}> 
                <CustomIcon iconType="folder" className="w-full h-full" /> 
              </div>
              <div className="folder-name">{channel.title}</div>
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
        {filteredChannels.length === 0 ? (
          <div className="text-center p-1">
            No channels found
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => handleChannelClick(channel)}
              className="flex items-center space-x-1 p-1 hover:bg-accent/50 cursor-pointer"
            >
              {/* Apply dynamic size to CustomIcon */}
              <CustomIcon iconType="folder" className={`${dynamicIconSizeClass} shrink-0`} /> 
              <span className="truncate text-sm">{channel.title}</span>
            </div>
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
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="search-input text-xs flex-1 mx-2"
          />
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
      ) : isListView ? (
        renderListView()
      ) : (
        renderGridView()
      )}
    </ArenaWindowLayout>
  );
};
