import { useCallback, useEffect, useRef, useState } from 'react';
import { getChannelContents } from '@/lib/api';
import { ArenaItem, ArenaPaginationMeta } from '@/types/arena';

const CHANNEL_BATCH_SIZE = 100;
const isAbortError = (error: unknown) => error instanceof Error && error.name === 'AbortError';

const sortItems = (items: ArenaItem[]) => [...items].sort((left, right) => {
  const leftPinned = left.connection?.pinned ?? false;
  const rightPinned = right.connection?.pinned ?? false;
  if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
  const positionDiff = (right.connection?.position ?? Number.MIN_SAFE_INTEGER)
    - (left.connection?.position ?? Number.MIN_SAFE_INTEGER);
  return positionDiff || right.id - left.id;
});

const memoryPagination = (visibleCount: number, totalCount: number): ArenaPaginationMeta => {
  const currentPage = Math.max(1, Math.ceil(visibleCount / CHANNEL_BATCH_SIZE));
  return {
    currentPage,
    nextPage: visibleCount < totalCount ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
    perPage: CHANNEL_BATCH_SIZE,
    totalPages: Math.max(1, Math.ceil(totalCount / CHANNEL_BATCH_SIZE)),
    totalCount,
    hasMorePages: visibleCount < totalCount,
  };
};

interface ArenaChannelBrowsingOptions {
  channelSlug?: string;
  items?: ArenaItem[];
  selectedId?: number;
}

/**
 * Owns the Are.na channel browsing lifecycle for both remote pages and
 * supplied in-memory items. Cancellation, ordering, dedupe, pagination, and
 * selection restoration stay behind this interface.
 */
export const useArenaChannelBrowsing = ({
  channelSlug,
  items,
  selectedId,
}: ArenaChannelBrowsingOptions) => {
  const [contents, setContents] = useState<ArenaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ArenaItem | null>(null);
  const [loading, setLoading] = useState(!items);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<ArenaPaginationMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadMoreController = useRef<AbortController | null>(null);

  useEffect(() => {
    loadMoreController.current?.abort();
    loadMoreController.current = null;
    setSelectedItem(null);

    if (items) {
      const sorted = sortItems(items);
      const visible = sorted.slice(0, CHANNEL_BATCH_SIZE);
      setContents(visible);
      setPagination(memoryPagination(visible.length, sorted.length));
      setError(null);
      setLoading(false);
      return;
    }

    if (!channelSlug) {
      setContents([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    setContents([]);
    setPagination(null);

    void getChannelContents(channelSlug, 1, CHANNEL_BATCH_SIZE, controller.signal)
      .then((firstPage) => {
        if (!active) return;
        setContents(sortItems(firstPage.items));
        setPagination(firstPage.meta);
      })
      .catch((fetchError) => {
        if (!active || isAbortError(fetchError)) return;
        console.error(fetchError);
        setError('Failed to load channel contents');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [channelSlug, items]);

  useEffect(() => () => loadMoreController.current?.abort(), []);

  useEffect(() => {
    if (!selectedId || selectedItem?.id === selectedId || contents.length === 0) return;
    const restored = contents.find((item) => item.id === selectedId);
    if (restored) setSelectedItem(restored);
  }, [contents, selectedId, selectedItem?.id]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination?.hasMorePages) return;

    if (items) {
      const sorted = sortItems(items);
      const nextCount = Math.min(contents.length + CHANNEL_BATCH_SIZE, sorted.length);
      setContents(sorted.slice(0, nextCount));
      setPagination(memoryPagination(nextCount, sorted.length));
      return;
    }

    if (!channelSlug || !pagination.nextPage) return;
    const controller = new AbortController();
    loadMoreController.current?.abort();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setError(null);

    try {
      const nextPage = await getChannelContents(
        channelSlug,
        pagination.nextPage,
        CHANNEL_BATCH_SIZE,
        controller.signal,
      );
      setContents((current) => {
        const existing = new Set(current.map((item) => `${item.kind}-${item.id}`));
        const additions = nextPage.items.filter((item) => !existing.has(`${item.kind}-${item.id}`));
        return sortItems([...current, ...additions]);
      });
      setPagination(nextPage.meta);
    } catch (fetchError) {
      if (!isAbortError(fetchError)) {
        console.error(fetchError);
        setError('Failed to load more channel contents');
      }
    } finally {
      if (loadMoreController.current === controller) {
        loadMoreController.current = null;
        setLoadingMore(false);
      }
    }
  }, [channelSlug, contents.length, items, loadingMore, pagination]);

  return {
    contents,
    selectedItem,
    selectItem: setSelectedItem,
    loading,
    loadingMore,
    loadingStatus: 'loading channel...',
    pagination,
    error,
    loadMore,
  };
};
