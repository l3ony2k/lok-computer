import React, { useState, useEffect, useRef } from "react";
import { RetroButton } from "@/components/ui/RetroButton";
import { ArenaChannel } from "@/types/arena";
import { getUserChannels } from "@/lib/api";
import { useWindowManager } from "@/hooks/useWindowManager";
import { ChannelExplorer } from "./ChannelExplorer";
import { ArenaWindowLayout } from "../components/ArenaWindowLayout";
import { useIsMobile } from '@/hooks/use-mobile';
import { ContentItemGrid, ContentItemListView, getGridConfiguration, ContentItem, getItemTitle } from '../utils/contentItems';
import { StateMessage } from '@/components/ui/StateMessage';
import { getAppState, setAppState } from "@/lib/storage";

// View state interface for ChannelBrowser
interface BrowserViewState {
  gridSize: 'S' | 'M' | 'L';
  isListView: boolean;
}

const VIEW_STATE_KEY = 'app:arena-browser';

export const ChannelBrowser: React.FC<{ username?: string }> = ({ username = "lok" }) => {
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isListView, setIsListView] = useState(true);
  const { addWindow } = useWindowManager();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<'S' | 'M' | 'L'>('S');
  const isMobile = useIsMobile();
  const isViewStateLoaded = useRef(false);

  // Load saved view state on mount
  useEffect(() => {
    const loadViewState = async () => {
      try {
        const savedState = await getAppState<BrowserViewState>(VIEW_STATE_KEY);
        if (savedState) {
          setGridSize(savedState.gridSize);
          setIsListView(savedState.isListView);
        }
      } catch (error) {
        console.error('[ChannelBrowser] Failed to load view state:', error);
      } finally {
        isViewStateLoaded.current = true;
      }
    };
    loadViewState();
  }, []);

  // Save view state when it changes
  useEffect(() => {
    if (!isViewStateLoaded.current) return;

    const saveViewState = async () => {
      try {
        await setAppState(VIEW_STATE_KEY, { gridSize, isListView });
      } catch (error) {
        console.error('[ChannelBrowser] Failed to save view state:', error);
      }
    };

    const timeout = setTimeout(saveViewState, 300);
    return () => clearTimeout(timeout);
  }, [gridSize, isListView]);

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
      componentType: 'ChannelExplorer',
      props: { channelSlug: channel.slug, username },
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
      componentType: 'ChannelExplorer',
      props: { channelSlug: slug, username },
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
          <StateMessage minHeight="h-24">
            Not found, just hit Go or Enter
          </StateMessage>
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
            <RetroButton size="sm" active={gridSize === 'S'} onClick={() => setGridSize('S')} title="Small Icons">S</RetroButton>
            <RetroButton size="sm" active={gridSize === 'M'} onClick={() => setGridSize('M')} title="Medium Icons">M</RetroButton>
            <RetroButton size="sm" active={gridSize === 'L'} onClick={() => setGridSize('L')} title="Large Icons">L</RetroButton>
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
            <RetroButton
              size="sm"
              onClick={() => handleGoToChannel(search)}
              title="Go to channel slug"
            >
              Go
            </RetroButton>
          </div>
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" active={!isListView} onClick={() => setIsListView(false)}>Grid</RetroButton>
            <RetroButton size="sm" active={isListView} onClick={() => setIsListView(true)}>List</RetroButton>
          </div>
        </div>
      }
    >
      {loadError && (
        <div className="px-2 py-1 mb-2 bg-yellow-100 dark:bg-yellow-900 text-xs">{loadError}</div>
      )}
      {loading ? (
        <StateMessage>Loading channels...</StateMessage>
      ) : (
        isListView ? renderListView() : renderGridView()
      )}
    </ArenaWindowLayout>
  );
};
