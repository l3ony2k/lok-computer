/**
 * Route Configuration for URL Deep Linking
 * 
 * Maps URL paths to component types and extracts props from URL params.
 * Used by RouteInterpreter to open windows from URLs.
 */

import { WINDOW_DEFAULTS } from './window';
import { ARENA_WINDOW_DEFAULTS } from './arenaWindows';

export interface RouteConfig {
    /** URL path pattern, e.g., 'explorer/:channelSlug' */
    pattern: string;
    /** Component type key from componentRegistry */
    componentType: string;
    /** Extract props from URL params and query string */
    extractProps: (params: Record<string, string>, query: URLSearchParams) => Record<string, unknown>;
    /** Generate URL path from props (reverse of extractProps) */
    generateUrl?: (props: Record<string, unknown>) => string | null;
    /** Generate window title from props */
    getTitle: (props: Record<string, unknown>) => string;
    /** Window icon type */
    iconType: string;
    /** If true, focuses existing window instead of creating duplicate */
    singleInstance?: boolean;
    /** Default window dimensions */
    defaultWidth?: number;
    defaultHeight?: number;
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
        iconType: 'folder',
        defaultWidth: ARENA_WINDOW_DEFAULTS.channelExplorer.width,
        defaultHeight: ARENA_WINDOW_DEFAULTS.channelExplorer.height,
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
        iconType: 'block',
        defaultWidth: ARENA_WINDOW_DEFAULTS.blockViewer.width,
        defaultHeight: ARENA_WINDOW_DEFAULTS.blockViewer.height,
    },

    // Image Viewer (URL encoded in query param)
    {
        pattern: 'image',
        componentType: 'ImageViewer',
        extractProps: (_, query) => ({
            imageUrl: query.get('url') || '',
        }),
        generateUrl: (props) => {
            if (!props.imageUrl) return '/image';
            return `/image?url=${encodeURIComponent(String(props.imageUrl))}`;
        },
        getTitle: () => 'Image',
        iconType: 'image',
        defaultWidth: 600,
        defaultHeight: 500,
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
        iconType: 'about',
        singleInstance: true,
        defaultWidth: 500,
        defaultHeight: 600,
    },

    {
        pattern: 'config',
        componentType: 'Config',
        extractProps: () => ({}),
        generateUrl: () => '/config',
        getTitle: () => 'Config',
        iconType: 'config',
        singleInstance: true,
        defaultWidth: 650,
        defaultHeight: 600,
    },

    {
        pattern: 'arena',
        componentType: 'Are.na',
        extractProps: () => ({ username: 'lok' }),
        generateUrl: () => '/arena',
        getTitle: () => 'Are.na',
        iconType: 'arena',
        defaultWidth: ARENA_WINDOW_DEFAULTS.channelBrowser.width,
        defaultHeight: ARENA_WINDOW_DEFAULTS.channelBrowser.height,
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
        iconType: 'shelf',
        singleInstance: true,
        defaultWidth: 500,
        defaultHeight: 700,
    },

    {
        pattern: 'guestbook',
        componentType: 'Guestbook',
        extractProps: () => ({}),
        generateUrl: () => '/guestbook',
        getTitle: () => 'Guestbook',
        iconType: 'mail',
        singleInstance: true,
        defaultWidth: 500,
        defaultHeight: 600,
    },

    {
        pattern: 'ai',
        componentType: 'AI Talk',
        extractProps: () => ({}),
        generateUrl: () => '/ai',
        getTitle: () => 'AI Talk',
        iconType: 'mailbox',
        singleInstance: true,
        defaultWidth: 400,
        defaultHeight: 600,
    },

    {
        pattern: 'weather',
        componentType: 'Weather',
        extractProps: () => ({}),
        generateUrl: () => '/weather',
        getTitle: () => 'Weather',
        iconType: 'weather',
        defaultWidth: 860,
        defaultHeight: 525,
    },

    {
        pattern: 'bsky',
        componentType: 'Bsky',
        extractProps: () => ({}),
        generateUrl: () => '/bsky',
        getTitle: () => 'Bsky',
        iconType: 'bsky',
        defaultWidth: 450,
        defaultHeight: 700,
    },

    {
        pattern: 'fedi',
        componentType: 'Fedi',
        extractProps: () => ({}),
        generateUrl: () => '/fedi',
        getTitle: () => 'Fedi',
        iconType: 'fedi',
        defaultWidth: 450,
        defaultHeight: 700,
    },

    {
        pattern: 'links',
        componentType: 'Links',
        extractProps: () => ({}),
        generateUrl: () => '/links',
        getTitle: () => 'Links',
        iconType: 'webpage',
        singleInstance: true,
        defaultWidth: 500,
        defaultHeight: 600,
    },

    {
        pattern: 'console',
        componentType: 'Console',
        extractProps: () => ({}),
        generateUrl: () => '/console',
        getTitle: () => 'Console',
        iconType: 'console',
        defaultWidth: 700,
        defaultHeight: 400,
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
        iconType: 'globe',
        defaultWidth: 800,
        defaultHeight: 600,
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
