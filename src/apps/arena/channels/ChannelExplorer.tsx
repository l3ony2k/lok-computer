import React, { useEffect, useMemo, useRef } from 'react';
import { APP_CONFIG } from '@/config/constants';
import { ArenaChannel, ArenaItem } from '@/types/arena';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { usePersistedState } from '@/hooks/useStorage';
import { scrollIntoViewWithin } from '@/lib/utils';
import { ArenaDetailPanel } from '../components/ArenaDetailPanel';
import { ArenaFileView } from '../components/ArenaFileView';
import {
  ArenaFileSize,
  ArenaFileViewState,
  StoredArenaFileViewState,
  createArenaFileViewState,
  normalizeArenaFileViewState,
} from '../components/arenaFileViewState';
import { useArenaChannelBrowsing } from './useArenaChannelBrowsing';
import { Images, Play } from 'lucide-react';
import { RetroButton } from '@/components/ui/RetroButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { MEDIA_PLAYER_TYPE, createMediaRequest } from '@/apps/media/mediaLibrary';
import {
  arenaBlockToMediaItem,
  formatArenaReference,
  getArenaImage,
  getArenaPlayableMedia,
} from '../utils/arenaLinks';

interface ChannelViewState {
  fileState: ArenaFileViewState;
  previewMode: 'off' | 'horizontal' | 'vertical';
  selectedBlockId?: number;
}

/** A stored view state, possibly from before fileState existed (flat gridSize/isListView). */
interface StoredChannelViewState {
  fileState?: StoredArenaFileViewState;
  previewMode?: unknown;
  selectedBlockId?: unknown;
  gridSize?: 'S' | 'M' | 'L';
  isListView?: boolean;
}

interface ChannelExplorerProps {
  channelSlug?: string;
  username?: string;
  items?: ArenaItem[];
  initialGridSize?: 'S' | 'M' | 'L';
  initialIsListView?: boolean;
  initialPreviewMode?: 'off' | 'horizontal' | 'vertical';
  initialSelectedBlockId?: number;
  onPropsChange?: (props: Partial<ChannelExplorerProps>) => void;
}

const sizeFromRoute = (size: 'S' | 'M' | 'L' = 'S'): ArenaFileSize => ({
  S: 'small',
  M: 'medium',
  L: 'large',
})[size] as ArenaFileSize;

const sizeToRoute = (size: ArenaFileSize): 'S' | 'M' | 'L' => ({
  small: 'S',
  medium: 'M',
  large: 'L',
})[size] as 'S' | 'M' | 'L';

export const ChannelExplorer: React.FC<ChannelExplorerProps> = ({
  channelSlug,
  username = APP_CONFIG.ARENA_USERNAME,
  items,
  initialGridSize = 'S',
  initialIsListView = false,
  initialPreviewMode = 'off',
  initialSelectedBlockId,
  onPropsChange,
}) => {
  const defaultViewState = useMemo<ChannelViewState>(() => ({
    fileState: createArenaFileViewState({
      view: initialIsListView ? 'list' : 'grid',
      gridSize: sizeFromRoute(initialGridSize),
      listSize: initialIsListView ? sizeFromRoute(initialGridSize) : 'medium',
    }),
    previewMode: initialPreviewMode,
    selectedBlockId: initialSelectedBlockId,
  }), [initialGridSize, initialIsListView, initialPreviewMode, initialSelectedBlockId]);

  const viewStateKey = channelSlug ? `channel:view:${channelSlug}` : 'channel:view:transient';
  const [viewState, setViewState, stateLoading] = usePersistedState<ChannelViewState>({
    key: viewStateKey,
    enabled: Boolean(channelSlug),
    defaultValue: defaultViewState,
    debounceMs: 300,
    normalize: (stored, fallback) => {
      if (!stored || typeof stored !== 'object') return fallback;
      const saved = stored as StoredChannelViewState;
      return {
        fileState: normalizeArenaFileViewState(
          saved.fileState ?? { gridSize: saved.gridSize, isListView: saved.isListView },
          fallback.fileState,
        ),
        previewMode: saved.previewMode === 'horizontal' || saved.previewMode === 'vertical' || saved.previewMode === 'off'
          ? saved.previewMode
          : fallback.previewMode,
        selectedBlockId: typeof saved.selectedBlockId === 'number'
          ? saved.selectedBlockId
          : fallback.selectedBlockId,
      };
    },
  });

  const browsing = useArenaChannelBrowsing({
    channelSlug,
    items,
    selectedId: viewState.selectedBlockId,
  });
  const contentViewportRef = useRef<HTMLDivElement>(null);
  const openApplication = useApplicationLauncher();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (stateLoading) return;
    onPropsChange?.({
      initialGridSize: sizeToRoute(viewState.fileState.gridSize),
      initialIsListView: viewState.fileState.view === 'list',
      initialPreviewMode: viewState.previewMode,
      initialSelectedBlockId: viewState.selectedBlockId,
    });
  }, [onPropsChange, stateLoading, viewState]);

  // Scroll only the file list, never the window layer (see scrollIntoViewWithin).
  useEffect(() => {
    if (!browsing.selectedItem || browsing.loading) return;
    const timeout = setTimeout(() => {
      scrollIntoViewWithin(
        contentViewportRef.current?.querySelector<HTMLElement>(`[data-item-id="${browsing.selectedItem?.id}"]`),
        { block: 'nearest' },
      );
    }, 50);
    return () => clearTimeout(timeout);
  }, [browsing.loading, browsing.selectedItem, viewState.fileState.view]);

  const selectItem = (item: ArenaItem) => {
    browsing.selectItem(item);
    setViewState((current) => ({ ...current, selectedBlockId: item.id }));
  };

  const openChannel = (channel: ArenaChannel) => {
    openApplication('ChannelExplorer', {
      title: channel.title || 'Channel',
      iconType: 'other-channel',
      props: { channelSlug: channel.slug, username },
    });
  };

  const openImage = (imageUrl: string, title: string) => {
    openApplication('ImageViewer', { title, props: { imageUrl } });
  };

  const openItem = (item: ArenaItem) => {
    if (item.kind === 'channel') {
      openChannel(item);
      return;
    }

    // Audio and video go straight to the player, the way images open in the viewer.
    const media = arenaBlockToMediaItem(item);
    if (media) {
      openApplication(MEDIA_PLAYER_TYPE, { props: { request: createMediaRequest([media]) } });
      return;
    }

    openApplication('BlockViewer', {
      title: item.title || 'Block Details',
      iconType: item.kind === 'image' ? 'image' : item.kind === 'link' ? 'link' : 'text',
      props: { blockId: item.id, initialConnection: item.connection },
    });
  };

  // The loaded page decides whether the actions show; the apps then read the whole channel.
  const hasPlayable = useMemo(() => browsing.contents.some((item) => getArenaPlayableMedia(item)), [browsing.contents]);
  const hasImages = useMemo(() => browsing.contents.some((item) => getArenaImage(item)), [browsing.contents]);
  const channelReference = channelSlug ? formatArenaReference({ type: 'channel', slug: channelSlug }) : null;

  const playAll = () => {
    if (!channelReference) return;
    openApplication(MEDIA_PLAYER_TYPE, {
      props: { request: createMediaRequest([], true, { arena: channelReference }) },
    });
  };

  const openGallery = () => {
    if (!channelReference) return;
    const selected = browsing.selectedItem && getArenaImage(browsing.selectedItem) ? browsing.selectedItem.id : undefined;
    openApplication('ImageViewer', {
      props: { arena: channelReference, startBlockId: selected },
    });
  };

  const footerActions = channelReference && (hasPlayable || hasImages) ? (
    <>
      {hasPlayable && (
        <RetroButton
          className="gap-1"
          onClick={playAll}
          title="Queue every audio and video block in the Media Player"
          aria-label="Play all"
        >
          <Play className="h-3 w-3" />{!isMobile && ' Play all'}
        </RetroButton>
      )}
      {hasImages && (
        <RetroButton
          className="gap-1"
          onClick={openGallery}
          title="Page through this channel's images in the Image Viewer"
          aria-label="Gallery"
        >
          <Images className="h-3 w-3" />{!isMobile && ' Gallery'}
        </RetroButton>
      )}
    </>
  ) : null;

  const preview = browsing.selectedItem ? (
    <ArenaDetailPanel
      key={`${browsing.selectedItem.kind}-${browsing.selectedItem.id}`}
      item={browsing.selectedItem}
      clearWhileLoading
      onOpenChannel={openChannel}
      onOpenImage={openImage}
    />
  ) : null;

  return (
    <ArenaFileView
      items={browsing.contents}
      state={viewState.fileState}
      onStateChange={(fileState) => setViewState((current) => ({ ...current, fileState }))}
      selectedId={browsing.selectedItem?.id}
      onSelect={selectItem}
      onOpen={openItem}
      loading={browsing.loading || stateLoading}
      loadingStatus={browsing.loadingStatus}
      totalCount={browsing.pagination?.totalCount}
      hasMore={browsing.pagination?.hasMorePages}
      loadingMore={browsing.loadingMore}
      onLoadMore={browsing.loadMore}
      error={browsing.error}
      emptyText="this channel is empty"
      preview={preview}
      previewMode={viewState.previewMode}
      onPreviewModeChange={(previewMode) => setViewState((current) => ({ ...current, previewMode }))}
      contentViewportRef={contentViewportRef}
      footerActions={footerActions}
    />
  );
};
