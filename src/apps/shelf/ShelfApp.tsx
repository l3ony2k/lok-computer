import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { RetroButton } from '@/components/ui/RetroButton';
import { StateMessage } from '@/components/ui/StateMessage';
import { LoadFailure } from '@/components/ui/LoadFailure';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { APP_CONFIG } from '@/config/constants';
import { CACHE_TTL } from '@/lib/storage';
import { usePersistedState } from '@/hooks/useStorage';
import { cachedRequest } from '@/lib/cachedRequest';
import './shelf.css';

type ShelfType = 'wishlist' | 'progress' | 'complete' | 'dropped';
const SHELF_TYPES: ShelfType[] = ['wishlist', 'progress', 'complete', 'dropped'];

interface ShelfItem {
    shelf_type: string;
    visibility: number;
    post_id: number;
    item: {
        type: string;
        title: string;
        description: string;
        cover_image_url: string | null;
        rating: number | null;
        rating_count: number;
        tags: string[];
        brief: string;
        uuid: string;
        url: string;
        category: string;
        display_title: string;
        external_resources?: { url: string }[];
    };
    created_time: string;
    comment_text: string | null;
    rating_grade: number | null;
    tags: string[];
}

interface ShelfResponse {
    data: ShelfItem[];
    pages: number;
    count: number;
}

const SHELF_TABS: { value: ShelfType; label: string }[] = SHELF_TYPES.map((value) => ({
    value,
    label: value[0].toUpperCase() + value.slice(1),
}));

const PAGE_SIZE = 50;

// Category to Noto Emoji Unicode mapping (black & white compatible)
const getCategorySymbol = (category: string): string => {
    const symbols: Record<string, string> = {
        movie: '🎬',
        book: '📖',
        tv: '📺',
        music: '♪',
        game: '🎮',
        podcast: '🔈',
        performance: '🎭',
    };
    return symbols[category] || '📄';
};

// Extract external links from item
const getExternalLinks = (item: ShelfItem['item']) => {
    const links: { label: string; url: string }[] = [];

    // Always add NeoDB link
    links.push({ label: 'neodb', url: `https://neodb.social${item.url}` });

    // Parse external resources for IMDB, TMDB, Douban
    if (item.external_resources) {
        item.external_resources.forEach(res => {
            const url = res.url;
            if (url.includes('imdb.com')) {
                links.push({ label: 'imdb', url });
            } else if (url.includes('themoviedb.org') || url.includes('tmdb.org')) {
                links.push({ label: 'tmdb', url });
            } else if (url.includes('douban.com')) {
                links.push({ label: 'douban', url });
            }
        });
    }

    return links;
};

interface ShelfContentProps {
    type: ShelfType;
    page: number;
    onDataLoaded: (type: ShelfType, pages: number, count: number) => void;
}

const ShelfContent: React.FC<ShelfContentProps> = ({ type, page, onDataLoaded }) => {
    const openApplication = useApplicationLauncher();

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['neodbShelf', type, page],
        queryFn: async () => {
            const cacheKey = `neodb:shelf:${type}:${page}`;
            return cachedRequest({
                cacheKey,
                ttlMs: CACHE_TTL.NEODB_SHELF,
                source: 'shelf',
                debugLabel: cacheKey,
                load: async () => {
                    console.log(`[API:Shelf] GET ${type} page ${page}`);
                    const response = await fetch(`${APP_CONFIG.NEODB_SHELF_ENDPOINT}?type=${type}&page=${page}&page_size=${PAGE_SIZE}`);
                    if (!response.ok) throw new Error('Failed to fetch shelf');
                    const result = await response.json() as ShelfResponse;
                    console.log(`[App:Shelf] Loaded ${result.data.length} ${type} items`);
                    return result;
                },
            });
        },
        staleTime: CACHE_TTL.NEODB_SHELF,
    });

    React.useEffect(() => {
        if (data) onDataLoaded(type, data.pages, data.count);
    }, [data, onDataLoaded, type]);

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

    if (isLoading) {
        return (
            <StateMessage minHeight="h-48">
                Loading {type}...
            </StateMessage>
        );
    }

    if (isError) {
        return <LoadFailure error={error} what="the shelf" onRetry={() => void refetch()} />;
    }

    if (!data || data.data.length === 0) {
        return (
            <StateMessage minHeight="h-48">
                No items in {type}
            </StateMessage>
        );
    }

    return (
        <div className="flex flex-wrap gap-3 p-3 content-start">
            {data.data.map((shelfItem) => (
                <HoverCard key={shelfItem.post_id} openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                        <div
                            className="cursor-pointer group flex-shrink-0"
                            style={{ width: '80px' }}
                            onClick={() => {
                                if (shelfItem.item.cover_image_url) {
                                    openApplication('ImageViewer', {
                                        title: shelfItem.item.display_title,
                                        width: 600,
                                        height: 800,
                                        props: { imageUrl: shelfItem.item.cover_image_url },
                                    });
                                }
                            }}
                        >
                            <div className="aspect-[2/3] bg-secondary border border-border overflow-hidden mb-1">
                                {shelfItem.item.cover_image_url ? (
                                    <img
                                        src={shelfItem.item.cover_image_url}
                                        alt={shelfItem.item.display_title}
                                        className="w-full h-full object-cover transition-transform"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl opacity-30 noto-emoji">
                                        {getCategorySymbol(shelfItem.item.category)}
                                    </div>
                                )}
                            </div>
                            {/* Title with emoji */}
                            <p className="text-xs truncate text-center group-hover:text-primary transition-colors">
                                <span className="noto-emoji opacity-60">{getCategorySymbol(shelfItem.item.category)}</span>{' '}
                                {shelfItem.item.display_title}
                            </p>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent side="right" className="w-72 text-sm">
                        <div className="space-y-2">
                            <div className="flex items-start gap-2">
                                <span className="text-lg noto-emoji">{getCategorySymbol(shelfItem.item.category)}</span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold leading-tight">{shelfItem.item.display_title}</h4>
                                    <p className="text-xs text-muted-foreground capitalize">{shelfItem.item.type}</p>
                                </div>
                            </div>

                            {shelfItem.item.rating && (
                                <div className="text-xs">
                                    <span className="text-yellow-500">★</span> {shelfItem.item.rating.toFixed(1)}
                                    <span className="text-muted-foreground ml-1">({shelfItem.item.rating_count})</span>
                                </div>
                            )}

                            {shelfItem.rating_grade && (
                                <div className="text-xs bg-secondary/50 px-2 py-1">
                                    My rating: <span className="font-bold">{shelfItem.rating_grade}/10</span>
                                </div>
                            )}

                            {shelfItem.item.brief && (
                                <p className="text-xs text-muted-foreground line-clamp-3">{shelfItem.item.brief}</p>
                            )}

                            {shelfItem.comment_text && (
                                <div className="text-xs italic border-l-2 border-primary/50 pl-2">
                                    "{shelfItem.comment_text}"
                                </div>
                            )}

                            <div className="text-xs text-muted-foreground">Added: {formatDate(shelfItem.created_time)}</div>

                            {/* External links row */}
                            <div className="flex flex-wrap gap-1">
                                {getExternalLinks(shelfItem.item).map((link) => (
                                    <RetroButton
                                        key={link.label}
                                        size="sm"
                                        className="text-xs"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(link.url, '_blank');
                                        }}
                                    >
                                        {link.label}
                                    </RetroButton>
                                ))}
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            ))}
        </div>
    );
};

// App state interface
interface ShelfAppState {
    activeTab: ShelfType;
    page: number;
}

const APP_STATE_KEY = 'app:shelf';
const DEFAULT_STATE: ShelfAppState = { activeTab: 'wishlist', page: 1 };

interface ShelfAppProps {
    initialTab?: ShelfType;
    initialPage?: number;
    onPropsChange?: (props: Partial<ShelfAppProps>) => void;
}

export const ShelfApp: React.FC<ShelfAppProps> = ({ initialTab, initialPage, onPropsChange }) => {
    // Using usePersistedState hook instead of manual load/save useEffects
    const [persistedState, setPersistedState] = usePersistedState<ShelfAppState>({
        key: APP_STATE_KEY,
        defaultValue: DEFAULT_STATE,
        debounceMs: 150,
        normalize: (stored, fallback) => {
            const saved = (stored && typeof stored === 'object' ? stored : {}) as Partial<ShelfAppState>;
            return {
                activeTab: SHELF_TYPES.includes(saved.activeTab as ShelfType) ? saved.activeTab as ShelfType : fallback.activeTab,
                page: typeof saved.page === 'number' && Number.isInteger(saved.page) && saved.page > 0 ? saved.page : fallback.page,
            };
        },
    });
    const [paginationByTab, setPaginationByTab] = useState<Partial<Record<ShelfType, { pages: number; count: number }>>>({});

    // Extract values for convenience
    const activeTab = persistedState.activeTab;
    const page = persistedState.page;
    const paginationInfo = paginationByTab[activeTab] ?? { pages: 1, count: 0 };

    // Deep link priority: if initial props are provided and differ from state, override state on mount
    React.useEffect(() => {
        if (initialTab && initialTab !== activeTab) {
            setPersistedState(prev => ({ ...prev, activeTab: initialTab }));
        }
        if (initialPage && initialPage !== page && initialPage > 0) {
            setPersistedState(prev => ({ ...prev, page: initialPage }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialTab, initialPage]);

    // Reset page when tab changes
    const handleTabChange = (tab: ShelfType) => {
        setPersistedState({ activeTab: tab, page: 1 });
        // Sync to window props for share URL
        if (onPropsChange) {
            onPropsChange({ initialTab: tab, initialPage: 1 });
        }
    };

    const setPage = (pageOrUpdater: number | ((prev: number) => number)) => {
        setPersistedState(prev => {
            const newPage = typeof pageOrUpdater === 'function' ? pageOrUpdater(prev.page) : pageOrUpdater;
            // Sync to window props for share URL
            if (onPropsChange) {
                onPropsChange({ initialTab: prev.activeTab, initialPage: newPage });
            }
            return { ...prev, page: newPage };
        });
    };

    const handleDataLoaded = React.useCallback((type: ShelfType, pages: number, count: number) => {
        setPaginationByTab((current) => {
            const existing = current[type];
            if (existing?.pages === pages && existing.count === count) return current;
            return { ...current, [type]: { pages, count } };
        });
    }, []);

    return (
        <WindowLayout
            toolbar={
                <div className="app-toolbar-row app-tab-bar sticky top-0">
                    {SHELF_TABS.map((tab) => (
                        <RetroButton
                            key={tab.value}
                            size="sm"
                            active={activeTab === tab.value}
                            onClick={() => handleTabChange(tab.value)}
                        >
                            {tab.label}
                        </RetroButton>
                    ))}
                </div>
            }
            footer={
                <div className="app-footer-row">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs opacity-50">Total: {paginationInfo.count} items</span>
                    </div>
                    {paginationInfo.pages > 1 && (
                        <div className="flex items-center space-x-0">
                            <RetroButton size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</RetroButton>
                            <span className="text-xs text-muted-foreground px-2">Page {page} of {paginationInfo.pages}</span>
                            <RetroButton size="sm" onClick={() => setPage((p) => Math.min(paginationInfo.pages, p + 1))} disabled={page === paginationInfo.pages}>→</RetroButton>
                        </div>
                    )}
                </div>
            }
            hasPadding={false}
        >
            <ShelfContent type={activeTab} page={page} onDataLoaded={handleDataLoaded} />
        </WindowLayout>
    );
};

export default ShelfApp;
