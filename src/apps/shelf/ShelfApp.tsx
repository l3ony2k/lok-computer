import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { RetroButton } from '@/components/ui/RetroButton';
import { useWindowManager } from '@/hooks/useWindowManager';
import { ImageViewerApp } from '@/apps/imageviewer/ImageViewerApp';
import { APP_CONFIG } from '@/config/constants';

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

const ShelfContent: React.FC<{ type: ShelfType }> = ({ type }) => {
    const { addWindow } = useWindowManager();
    const [page, setPage] = useState(1);

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['neodbShelf', type, page],
        queryFn: async () => {
            const response = await fetch(`${APP_CONFIG.NEODB_SHELF_ENDPOINT}?type=${type}&page=${page}`);
            if (!response.ok) throw new Error('Failed to fetch shelf');
            return await response.json() as ShelfResponse;
        },
    });

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

    const getCategoryEmoji = (category: string) => {
        const emojis: Record<string, string> = {
            movie: '🎬', book: '📚', tv: '📺', music: '🎵',
            game: '🎮', podcast: '🎙️', performance: '🎭',
        };
        return emojis[category] || '📄';
    };

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
        <div className="flex flex-col h-full">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-3">
                {data.data.map((shelfItem) => (
                    <HoverCard key={shelfItem.post_id} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                            <div
                                className="cursor-pointer group"
                                onClick={() => {
                                    if (shelfItem.item.cover_image_url) {
                                        addWindow({
                                            title: shelfItem.item.display_title,
                                            content: <ImageViewerApp imageUrl={shelfItem.item.cover_image_url} />,
                                            width: 600,
                                            height: 800,
                                            iconType: 'image',
                                        });
                                    }
                                }}
                            >
                                <div className="aspect-[2/3] bg-secondary border border-border overflow-hidden mb-1">
                                    {shelfItem.item.cover_image_url ? (
                                        <img
                                            src={shelfItem.item.cover_image_url}
                                            alt={shelfItem.item.display_title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">
                                            {getCategoryEmoji(shelfItem.item.category)}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs truncate text-center group-hover:text-primary transition-colors">
                                    {shelfItem.item.display_title}
                                </p>
                            </div>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" className="w-72 text-sm">
                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <span className="text-lg">{getCategoryEmoji(shelfItem.item.category)}</span>
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

                                <RetroButton
                                    className="w-full text-xs"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`https://neodb.social${shelfItem.item.url}`, '_blank');
                                    }}
                                >
                                    View on NeoDB
                                </RetroButton>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                ))}
            </div>

            {data.pages > 1 && (
                <div className="flex justify-center items-center gap-2 p-3 border-t border-border mt-auto">
                    <RetroButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</RetroButton>
                    <span className="text-xs text-muted-foreground">Page {page} of {data.pages}</span>
                    <RetroButton onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages}>→</RetroButton>
                </div>
            )}
        </div>
    );
};

export const ShelfApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ShelfType>('wishlist');

    return (
        <WindowLayout
            toolbar={
                <div className="flex border-b border-accent sticky top-0 bg-background p-1 space-x-1">
                    {SHELF_TABS.map((tab) => (
                        <RetroButton
                            key={tab.value}
                            active={activeTab === tab.value}
                            onClick={() => setActiveTab(tab.value)}
                        >
                            {tab.label}
                        </RetroButton>
                    ))}
                </div>
            }
            hasPadding={false}
        >
            <ShelfContent type={activeTab} />
        </WindowLayout>
    );
};

export default ShelfApp;
