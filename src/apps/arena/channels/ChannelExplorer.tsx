import React, { useEffect, useMemo, useRef } from 'react';
import { ArenaChannel, ArenaItem } from '@/types/arena';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { usePersistedState } from '@/hooks/useStorage';
import { ArenaDetailPanel } from '../components/ArenaDetailPanel';
import { ArenaFileView } from '../components/ArenaFileView';
import {
  ArenaFileSize,
  ArenaFileViewState,
  createArenaFileViewState,
  normalizeArenaFileViewState,
} from '../components/arenaFileViewState';
import { useArenaChannelBrowsing } from './useArenaChannelBrowsing';

interface ChannelViewState {
  fileState: ArenaFileViewState;
  previewMode: 'off' | 'horizontal' | 'vertical';
  selectedBlockId?: number;
}

interface LegacyChannelViewState extends Partial<ChannelViewState> {
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
  username = 'lok',
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
      const saved = stored as LegacyChannelViewState;
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

  useEffect(() => {
    if (stateLoading) return;
    onPropsChange?.({
      initialGridSize: sizeToRoute(viewState.fileState.gridSize),
      initialIsListView: viewState.fileState.view === 'list',
      initialPreviewMode: viewState.previewMode,
      initialSelectedBlockId: viewState.selectedBlockId,
    });
  }, [onPropsChange, stateLoading, viewState]);

  useEffect(() => {
    if (!browsing.selectedItem || browsing.loading) return;
    const timeout = setTimeout(() => {
      contentViewportRef.current
        ?.querySelector(`[data-item-id="${browsing.selectedItem?.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

    openApplication('BlockViewer', {
      title: item.title || 'Block Details',
      iconType: item.kind === 'image' ? 'image' : item.kind === 'link' ? 'link' : 'text',
      props: { blockId: item.id, initialConnection: item.connection },
    });
  };

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
    />
  );
};
