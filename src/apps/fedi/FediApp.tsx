import React, { useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { StateMessage } from '@/components/ui/StateMessage';
import { RetroButton } from '@/components/ui/RetroButton';
import { useWindowActions } from '@/hooks/useWindowManager';
import { ImageViewerApp } from '@/apps/imageviewer/ImageViewerApp';
import { APP_CONFIG } from '@/config/constants';
import { getCachedData, setCachedData, incrementRequestCount, CACHE_TTL } from '@/lib/storage';
import { cacheDebugLog } from '@/lib/debug';

interface Account {
    id: string;
    username: string;
    acct: string;
    display_name: string;
    note: string;
    url: string;
    avatar: string;
    avatar_static: string;
    header: string;
    header_static: string;
    followers_count: number;
    following_count: number;
    statuses_count: number;
    fields: { name: string; value: string; verified_at: string | null }[];
}

interface MediaAttachment {
    id: string;
    type: 'image' | 'video' | 'gifv' | 'unknown';
    url: string;
    preview_url: string;
    remote_url: string | null;
    description: string | null;
    meta: unknown;
}

interface Status {
    id: string;
    created_at: string;
    content: string;
    account: Account;
    media_attachments: MediaAttachment[];
    replies_count: number;
    reblogs_count: number;
    favourites_count: number;
    reblog: Status | null;
    url: string;
    visibility: 'public' | 'unlisted' | 'private' | 'direct';
}

const INSTANCE_URL = APP_CONFIG.FEDI_INSTANCE;
const USERNAME = APP_CONFIG.FEDI_USERNAME;

export const FediApp: React.FC = () => {
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const { addWindow } = useWindowActions();

    const fetchAccount = async () => {
        const cacheKey = `fedi:account:${USERNAME}`;

        // Check cache first
        const cached = await getCachedData<Account>(cacheKey);
        if (cached) {
            cacheDebugLog(`[Cache] Hit: fedi:account`);
            return cached;
        }

        console.log(`[API:Fedi] GET account ${USERNAME}`);
        try {
            await incrementRequestCount('fedi');
            // Use relative path for worker proxy
            const response = await fetch(`/api/fedi/account?username=${USERNAME}`);
            if (!response.ok) {
                throw new Error('Failed to fetch account');
            }
            const data = await response.json() as Account;

            // Store in cache
            await setCachedData(cacheKey, data, CACHE_TTL.FEDI_ACCOUNT);

            console.log(`[App:Fedi] Profile loaded: ${data.username}`);
            return data;
        } catch (error) {
            console.error('[FediApp] Error fetching account:', error);
            throw error;
        }
    };

    const { data: account } = useQuery({
        queryKey: ['fediAccount', USERNAME],
        queryFn: fetchAccount,
        staleTime: CACHE_TTL.FEDI_ACCOUNT,
    });

    const fetchStatuses = async ({ pageParam }: { pageParam?: string }) => {
        if (!account) return { statuses: [], nextCursor: undefined };

        const cacheKey = `fedi:statuses:${account.id}:${pageParam || 'initial'}`;

        // Check cache first
        const cached = await getCachedData<{ statuses: Status[]; nextCursor?: string }>(cacheKey);
        if (cached) {
            cacheDebugLog(`[Cache] Hit: fedi:statuses:${pageParam || 'initial'}`);
            return cached;
        }

        console.log(`[API:Fedi] GET statuses ${pageParam ? `(max_id: ${pageParam})` : ''}`);
        try {
            await incrementRequestCount('fedi');
            // Use relative path for worker proxy
            const url = new URL('/api/fedi/statuses', window.location.origin);
            url.searchParams.append('accountId', account.id);

            if (pageParam) {
                url.searchParams.append('max_id', pageParam);
            }

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error('Failed to fetch statuses');
            }
            const data = await response.json() as Status[];
            console.log(`[App:Fedi] Loaded ${data.length} statuses`);

            // Pagination: use the last item's ID for max_id
            const nextCursor = data.length > 0 ? data[data.length - 1].id : undefined;
            const result = { statuses: data, nextCursor };

            // Store in cache
            await setCachedData(cacheKey, result, CACHE_TTL.FEDI_STATUSES);

            return result;
        } catch (error) {
            console.error('[FediApp] Error fetching statuses:', error);
            throw error;
        }
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
        refetch
    } = useInfiniteQuery({
        queryKey: ['fediStatuses', account?.id],
        queryFn: fetchStatuses,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: undefined as string | undefined,
        enabled: !!account, // Only fetch statuses when account is loaded
        staleTime: CACHE_TTL.FEDI_STATUSES,
    });

    // Intersection Observer for infinite scrolling
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.5 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <WindowLayout hasPadding={false}>
            {!account ? (
                <StateMessage>
                    Loading profile...
                </StateMessage>
            ) : (
                <div className="divide-y divide-border">
                    {account && (
                        <div className="relative">
                            {/* Banner */}
                            <div className="h-32 bg-secondary overflow-hidden">
                                {account.header ? (
                                    <img
                                        src={account.header}
                                        alt="Profile Banner"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-secondary" />
                                )}
                            </div>

                            <div className="px-4 pb-4">
                                <div className="flex justify-between items-end -mt-10 mb-3">
                                    {/* Avatar */}
                                    <div className="w-20 h-20 bg-background border-4 border-background overflow-hidden relative z-10">
                                        {account.avatar ? (
                                            <img
                                                src={account.avatar}
                                                alt={account.username}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-secondary flex items-center justify-center">
                                                <span className="text-2xl opacity-50">?</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Follow Button (Link to external) */}
                                    <RetroButton
                                        className="mb-1"
                                        onClick={() => window.open(account.url, '_blank')}
                                    >
                                        view on fedi
                                    </RetroButton>
                                </div>

                                {/* Profile Info */}
                                <div className="mb-4">
                                    <h1 className="text-xl font-bold leading-tight">
                                        {account.display_name || account.username}
                                    </h1>
                                    <p className="text-muted-foreground text-sm">@{account.username}</p>
                                </div>

                                {/* Bio */}
                                {account.note && (
                                    <div
                                        className="text-sm mb-4 [&>p]:mb-2 last:[&>p]:mb-0"
                                        dangerouslySetInnerHTML={{ __html: account.note }}
                                    />
                                )}

                                {/* Profile Fields */}
                                {account.fields && account.fields.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2 mb-4 text-sm border border-border bg-secondary/20 p-2">
                                        {account.fields.map((field, index) => (
                                            <div key={index} className="flex flex-col sm:flex-row sm:justify-between border-b border-border/50 last:border-0 pb-1 last:pb-0">
                                                <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mr-2">{field.name}</span>
                                                <span dangerouslySetInnerHTML={{ __html: field.value }} className="min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap [&_a]:text-blue-400 [&_a]:underline [&_a]:inline-block [&_a]:min-w-0 [&_a]:max-w-full [&_a]:overflow-hidden [&_a]:text-ellipsis [&_a]:whitespace-nowrap" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="flex gap-4 text-sm">
                                    <span className="hover:underline cursor-pointer">
                                        <span className="font-bold">{account.followers_count}</span>{' '}
                                        <span className="text-muted-foreground">followers</span>
                                    </span>
                                    <span className="hover:underline cursor-pointer">
                                        <span className="font-bold">{account.following_count}</span>{' '}
                                        <span className="text-muted-foreground">following</span>
                                    </span>
                                    <span>
                                        <span className="font-bold">{account.statuses_count}</span>{' '}
                                        <span className="text-muted-foreground">posts</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <StateMessage>
                            Loading posts...
                        </StateMessage>
                    ) : isError ? (
                        <div className="text-red-500 p-4 text-center">
                            <p className="text-sm">Error loading posts: {error instanceof Error ? error.message : 'Unknown error'}</p>
                            <RetroButton onClick={() => refetch()} className="mt-2">
                                Retry
                            </RetroButton>
                        </div>
                    ) : (
                        <>
                            {data?.pages.map((page, pageIndex) => (
                                <React.Fragment key={pageIndex}>
                                    {page.statuses.map((status) => {
                                        const isReblog = !!status.reblog;
                                        const displayStatus = status.reblog || status;

                                        return (
                                            <div key={`${status.id}`} className="p-3 hover:bg-accent/5 transition-colors">
                                                {isReblog && (
                                                    <div className="flex items-center gap-2 mb-1 ml-12 text-xs text-muted-foreground">
                                                        <span>↻</span>
                                                        <span>Reposted by {status.account.display_name || status.account.username}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-start gap-3">
                                                    {displayStatus.account.avatar ? (
                                                        <img
                                                            src={displayStatus.account.avatar}
                                                            alt={displayStatus.account.username}
                                                            className="w-10 h-10 border border-border bg-secondary"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 border border-border bg-secondary flex items-center justify-center">
                                                            <span className="text-xs opacity-50">?</span>
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-baseline gap-2 mb-1">
                                                            <span className="font-bold text-sm truncate">
                                                                {displayStatus.account.display_name || displayStatus.account.username}
                                                            </span>
                                                            <span className="text-xs opacity-50 truncate">
                                                                @{displayStatus.account.username}
                                                            </span>
                                                            <span className="text-xs opacity-30 ml-auto whitespace-nowrap">
                                                                {formatTime(displayStatus.created_at)}
                                                            </span>
                                                        </div>

                                                        <div
                                                            className="text-sm break-words mb-2 [&>p]:mb-2 last:[&>p]:mb-0 [&_a]:text-blue-400 [&_a]:underline"
                                                            dangerouslySetInnerHTML={{ __html: displayStatus.content }}
                                                        />

                                                        {/* Images */}
                                                        {displayStatus.media_attachments && displayStatus.media_attachments.length > 0 && (
                                                            <div className={`grid gap-2 mb-2 ${displayStatus.media_attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                                {displayStatus.media_attachments.map((media, index) => (
                                                                    media.type === 'image' ? (
                                                                        <div
                                                                            key={media.id}
                                                                            className="cursor-pointer border border-border bg-secondary"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                addWindow({
                                                                                    title: 'Image Viewer',
                                                                                    content: <ImageViewerApp imageUrl={media.url} />,
                                                                                    width: 800,
                                                                                    height: 600,
                                                                                    iconType: 'image',
                                                                                    componentType: 'ImageViewer',
                                                                                    props: { imageUrl: media.url },
                                                                                });
                                                                            }}
                                                                        >
                                                                            <img
                                                                                src={media.preview_url}
                                                                                alt={media.description || 'Attachment'}
                                                                                className="w-full h-auto object-cover"
                                                                                loading="lazy"
                                                                            />
                                                                        </div>
                                                                    ) : null // Handle other media types if needed
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="flex gap-4 text-xs opacity-50">
                                                            <span title="Replies">✉︎ {displayStatus.replies_count || 0}</span>
                                                            <span title="Reposts">↻ {displayStatus.reblogs_count || 0}</span>
                                                            <span title="Likes">♡ {displayStatus.favourites_count || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}

                            {/* Load more indicator */}
                            <div ref={loadMoreRef} className="p-4 text-center text-xs opacity-50">
                                {isFetchingNextPage ? 'Loading more...' : hasNextPage ? 'Scroll for more' : 'End of feed'}
                            </div>
                        </>
                    )}
                </div>
            )}
        </WindowLayout>
    );
};

export default FediApp;
