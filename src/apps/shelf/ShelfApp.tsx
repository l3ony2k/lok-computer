import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { RetroButton } from '@/components/ui/RetroButton';
import { useWindowManager } from '@/hooks/useWindowManager';
import { ImageViewerApp } from '@/apps/imageviewer/ImageViewerApp';
import { APP_CONFIG } from '@/config/constants';
import { getCachedData, setCachedData, incrementRequestCount, getAppState, setAppState, CACHE_TTL } from '@/lib/storage';

type ShelfType = 'wishlist' | 'progress' | 'complete' | 'dropped';

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

const SHELF_TABS: { value: ShelfType; label: string }[] = [
    { value: 'wishlist', label: 'Wishlist' },
    { value: 'progress', label: 'Progress' },
    { value: 'complete', label: 'Complete' },
    { value: 'dropped', label: 'Dropped' },
];

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
    onDataLoaded: (pages: number, count: number) => void;
}

const ShelfContent: React.FC<ShelfContentProps> = ({ type, page, onDataLoaded }) => {
    const { addWindow } = useWindowManager();

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['neodbShelf', type, page],
        queryFn: async () => {
            const cacheKey = `neodb:shelf:${type}:${page}`;

            // Check cache first
            const cached = await getCachedData<ShelfResponse>(cacheKey);
            if (cached) {
                console.log(`[Cache] Hit: neodb:shelf:${type}:${page}`);
                onDataLoaded(cached.pages, cached.count);
                return cached;
            }

            // Fetch fresh data
            console.log(`[API:Shelf] GET ${type} page ${page}`);
            await incrementRequestCount('shelf');
            const response = await fetch(`${APP_CONFIG.NEODB_SHELF_ENDPOINT}?type=${type}&page=${page}&page_size=${PAGE_SIZE}`);
            if (!response.ok) throw new Error('Failed to fetch shelf');
            const result = await response.json() as ShelfResponse;

            // Store in cache
            await setCachedData(cacheKey, result, CACHE_TTL.NEODB_SHELF);
            console.log(`[App:Shelf] Loaded ${result.data.length} ${type} items`);

            onDataLoaded(result.pages, result.count);
            return result;
        },
        staleTime: CACHE_TTL.NEODB_SHELF,
    });

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48 text-muted-foreground text-sm">
                <p>Loading {type}...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-red-500 p-4 text-center">
                <p className="text-sm">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
                <RetroButton onClick={() => refetch()} className="mt-2">Retry</RetroButton>
            </div>
        );
    }

    if (!data || data.data.length === 0) {
        return (
            <div className="flex justify-center items-center h-48 text-muted-foreground text-sm">
                <p>No items in {type}</p>
            </div>
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
                                    addWindow({
                                        title: shelfItem.item.display_title,
                                        content: <ImageViewerApp imageUrl={shelfItem.item.cover_image_url} />,
                                        width: 600,
                                        height: 800,
                                        iconType: 'image',
                                        componentType: 'ImageViewer',
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

export const ShelfApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ShelfType>('wishlist');
    const [page, setPage] = useState(1);
    const [paginationInfo, setPaginationInfo] = useState<{ pages: number; count: number }>({ pages: 1, count: 0 });
    const isInitialLoad = useRef(true);

    // Load persisted state on mount
    useEffect(() => {
        let mounted = true;

        const loadState = async () => {
            try {
                const saved = await getAppState<ShelfAppState>(APP_STATE_KEY);
                if (mounted && saved) {
                    setActiveTab(saved.activeTab);
                    setPage(saved.page);
                }
            } catch (error) {
                console.error('[ShelfApp] Failed to load state:', error);
            } finally {
                if (mounted) {
                    isInitialLoad.current = false;
                }
            }
        };

        loadState();

        return () => {
            mounted = false;
        };
    }, []);

    // Save state when it changes
    useEffect(() => {
        if (isInitialLoad.current) return;

        const saveState = async () => {
            try {
                await setAppState<ShelfAppState>(APP_STATE_KEY, { activeTab, page });
            } catch (error) {
                console.error('[ShelfApp] Failed to save state:', error);
            }
        };

        saveState();
    }, [activeTab, page]);

    // Reset page when tab changes
    const handleTabChange = (tab: ShelfType) => {
        setActiveTab(tab);
        setPage(1);
        setPaginationInfo({ pages: 1, count: 0 });
    };

    const handleDataLoaded = (pages: number, count: number) => {
        setPaginationInfo({ pages, count });
    };

    return (
        <WindowLayout
            toolbar={
                <div className="flex border-b border-border sticky top-0 bg-background p-1 space-x-1">
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
                <div className="flex items-center justify-between space-x-2 p-1 border-t border-border bg-background">
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
