/**
 * Route Configuration for URL Deep Linking
 * 
 * Maps URL paths to component types and extracts props from URL params.
 * Used by RouteInterpreter to open windows from URLs.
 */

export interface RouteConfig {
    /** URL path pattern, e.g., 'explorer/:channelSlug' */
    pattern: string;
    /** Application identity from the authoritative catalog */
    componentType: string;
    /** Extract props from URL params and query string */
    extractProps: (params: Record<string, string>, query: URLSearchParams) => Record<string, unknown>;
    /** Generate URL path from props (reverse of extractProps) */
    generateUrl?: (props: Record<string, unknown>) => string | null;
    /** Generate window title from props */
    getTitle: (props: Record<string, unknown>) => string;
}

/**
 * Route definitions for all deep-linkable apps
 * Order matters: more specific routes should come before generic ones
 */
export const ROUTES: RouteConfig[] = [
    // Are.na Channel Explorer
    {
        pattern: 'explorer/:channelSlug',
        componentType: 'ChannelExplorer',
        extractProps: (params, query) => ({
            channelSlug: params.channelSlug,
            username: query.get('user') || 'lok',
            initialGridSize: query.get('size') as 'S' | 'M' | 'L' || undefined,
            initialIsListView: query.get('view') === 'list',
            initialPreviewMode: query.get('preview') as 'off' | 'horizontal' | 'vertical' || undefined,
            initialSelectedBlockId: query.get('block') ? parseInt(query.get('block')!, 10) : undefined,
        }),
        generateUrl: (props) => {
            if (!props.channelSlug) return null;
            let url = `/explorer/${encodeURIComponent(String(props.channelSlug))}`;
            const queryParts: string[] = [];
            // Include view state
            if (props.initialIsListView) queryParts.push('view=list');
            // Include grid size
            if (props.initialGridSize) queryParts.push(`size=${encodeURIComponent(String(props.initialGridSize))}`);
            // Include preview mode
            if (props.initialPreviewMode && props.initialPreviewMode !== 'off') {
                queryParts.push(`preview=${encodeURIComponent(String(props.initialPreviewMode))}`);
            }
            // Include selected block
            if (props.initialSelectedBlockId) {
                queryParts.push(`block=${encodeURIComponent(String(props.initialSelectedBlockId))}`);
            }
            if (queryParts.length > 0) url += '?' + queryParts.join('&');
            return url;
        },
        getTitle: (props) => String(props.channelSlug || 'Channel'),
    },

    // Are.na Block Viewer
    {
        pattern: 'block/:blockId',
        componentType: 'BlockViewer',
        extractProps: (params) => ({
            blockId: parseInt(params.blockId, 10),
        }),
        generateUrl: (props) => {
            if (!props.blockId) return null;
            return `/block/${encodeURIComponent(String(props.blockId))}`;
        },
        getTitle: (props) => `Block #${props.blockId}`,
    },

    // Image Viewer: one image (`url`) or an Are.na channel gallery (`arena`, page `i`).
    {
        pattern: 'image',
        componentType: 'ImageViewer',
        extractProps: (_, query) => {
            const arena = query.get('arena');
            if (arena) {
                const index = Number(query.get('i'));
                return { arena, index: Number.isInteger(index) && index > 0 ? index - 1 : 0 };
            }
            return { imageUrl: query.get('url') || undefined };
        },
        generateUrl: (props) => {
            if (props.arena) {
                const params = new URLSearchParams({ arena: String(props.arena) });
                if (typeof props.index === 'number' && props.index > 0) params.set('i', String(props.index + 1));
                return `/image?${params.toString()}`;
            }
            if (!props.imageUrl) return '/image';
            return `/image?url=${encodeURIComponent(String(props.imageUrl))}`;
        },
        getTitle: (props) => (props.imageUrl ? 'Image' : 'Images'),
    },

    // Static apps (single instance, no dynamic props)
    {
        pattern: 'about',
        componentType: 'About',
        extractProps: (_, query) => ({
            initialTab: query.get('tab') || undefined,
        }),
        generateUrl: (props) => {
            if (props.initialTab) return `/about?tab=${encodeURIComponent(String(props.initialTab))}`;
            return '/about';
        },
        getTitle: () => 'About',
    },

    {
        pattern: 'config',
        componentType: 'Config',
        extractProps: () => ({}),
        generateUrl: () => '/config',
        getTitle: () => 'Config',
    },

    {
        pattern: 'arena',
        componentType: 'Are.na',
        extractProps: () => ({ username: 'lok' }),
        generateUrl: () => '/arena',
        getTitle: () => 'Are.na',
    },

    {
        pattern: 'shelf',
        componentType: 'Shelf',
        extractProps: (_, query) => ({
            initialTab: query.get('tab') || undefined,
            initialPage: query.get('page') ? parseInt(query.get('page')!, 10) : undefined,
        }),
        generateUrl: (props) => {
            let url = '/shelf';
            const queryParts: string[] = [];

            if (props.initialTab) {
                queryParts.push(`tab=${encodeURIComponent(String(props.initialTab))}`);
            }
            if (props.initialPage && Number(props.initialPage) > 1) {
                queryParts.push(`page=${encodeURIComponent(String(props.initialPage))}`);
            }

            if (queryParts.length > 0) {
                url += '?' + queryParts.join('&');
            }
            return url;
        },
        getTitle: () => 'Shelf',
    },

    {
        pattern: 'guestbook',
        componentType: 'Guestbook',
        extractProps: () => ({}),
        generateUrl: () => '/guestbook',
        getTitle: () => 'Guestbook',
    },

    {
        pattern: 'ai',
        componentType: 'AI Talk',
        extractProps: () => ({}),
        generateUrl: () => '/ai',
        getTitle: () => 'Ask AI',
    },

    // Media Player. `src` enqueues and plays a URL, `arena` imports a channel or
    // block's audio and video; `nowPlaying` is the shareable state.
    {
        pattern: 'media',
        componentType: 'MediaPlayer',
        extractProps: (_, query) => {
            const src = query.get('src');
            const arena = query.get('arena');
            if (!src && !arena) return {};
            return {
                request: {
                    id: `route-${Date.now()}`,
                    play: true,
                    items: src ? [{ src, title: query.get('title') || undefined }] : [],
                    ...(arena ? { arena } : {}),
                },
            };
        },
        generateUrl: (props) => {
            const nowPlaying = props.nowPlaying as { src?: string; title?: string } | undefined;
            if (!nowPlaying?.src) return '/media';
            const params = new URLSearchParams({ src: nowPlaying.src });
            if (nowPlaying.title) params.set('title', nowPlaying.title);
            return `/media?${params.toString()}`;
        },
        getTitle: () => 'Media',
    },

    {
        pattern: 'weather',
        componentType: 'Weather',
        extractProps: () => ({}),
        generateUrl: () => '/weather',
        getTitle: () => 'Weather',
    },

    {
        pattern: 'bsky',
        componentType: 'Bsky',
        extractProps: () => ({}),
        generateUrl: () => '/bsky',
        getTitle: () => 'Bsky',
    },

    {
        pattern: 'fedi',
        componentType: 'Fedi',
        extractProps: () => ({}),
        generateUrl: () => '/fedi',
        getTitle: () => 'Fedi',
    },

    {
        pattern: 'links',
        componentType: 'Links',
        extractProps: () => ({}),
        generateUrl: () => '/links',
        getTitle: () => 'Links',
    },

    {
        pattern: 'console',
        componentType: 'Console',
        extractProps: () => ({}),
        generateUrl: () => '/console',
        getTitle: () => 'Console',
    },

    {
        pattern: 'web',
        componentType: 'Web',
        extractProps: (_, query) => ({
            initialUrl: query.get('url') || undefined,
        }),
        generateUrl: (props) => {
            if (props.initialUrl) return `/web?url=${encodeURIComponent(String(props.initialUrl))}`;
            return '/web';
        },
        getTitle: () => 'Web',
    },
];

/**
 * Match a URL path against route patterns
 * Returns the matched route config and extracted params
 */
export function matchRoute(path: string): { route: RouteConfig; params: Record<string, string> } | null {
    // Remove leading slash and normalize
    const normalizedPath = path.replace(/^\/+/, '').replace(/\/+$/, '');

    if (!normalizedPath) return null;

    for (const route of ROUTES) {
        const patternParts = route.pattern.split('/');
        const pathParts = normalizedPath.split('/');

        // Must have same number of parts
        if (patternParts.length !== pathParts.length) continue;

        const params: Record<string, string> = {};
        let matches = true;

        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];

            if (patternPart.startsWith(':')) {
                // Dynamic param - extract value
                params[patternPart.slice(1)] = decodeURIComponent(pathPart);
            } else if (patternPart !== pathPart) {
                // Static part must match exactly
                matches = false;
                break;
            }
        }

        if (matches) {
            return { route, params };
        }
    }

    return null;
}

/**
 * Parse a window spec from multi-window URL format
 * e.g., "explorer/channel-slug" or "about?tab=me"
 */
export function parseWindowSpec(spec: string): { path: string; query: URLSearchParams } {
    const [path, queryString] = spec.split('?');
    return {
        path: path || '',
        query: new URLSearchParams(queryString || ''),
    };
}

/**
 * Generate a shareable URL from a window's componentType and props
 * Returns null if the componentType is not found or doesn't have a generateUrl function
 * 
 * @param componentType - The component type key (e.g., 'About', 'ChannelExplorer')
 * @param props - Optional props to include in the URL
 * @returns Full shareable URL or null if generation fails
 */
export function generateShareUrl(
    componentType: string,
    props?: Record<string, unknown>
): string | null {
    const route = ROUTES.find(r => r.componentType === componentType);

    if (!route || !route.generateUrl) {
        return null;
    }

    const path = route.generateUrl(props || {});
    if (!path) {
        return null;
    }

    return `https://lok.computer${path}`;
}
