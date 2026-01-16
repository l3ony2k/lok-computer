/**
 * Route Configuration for URL Deep Linking
 * 
 * Maps URL paths to component types and extracts props from URL params.
 * Used by RouteInterpreter to open windows from URLs.
 */

import { WINDOW_DEFAULTS } from './window';

export interface RouteConfig {
    /** URL path pattern, e.g., 'explorer/:channelSlug' */
    pattern: string;
    /** Component type key from componentRegistry */
    componentType: string;
    /** Extract props from URL params and query string */
    extractProps: (params: Record<string, string>, query: URLSearchParams) => Record<string, unknown>;
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
        }),
        getTitle: (props) => String(props.channelSlug || 'Channel'),
        iconType: 'folder',
        defaultWidth: 600,
        defaultHeight: 500,
    },

    // Are.na Block Viewer
    {
        pattern: 'block/:blockId',
        componentType: 'BlockViewer',
        extractProps: (params) => ({
            blockId: parseInt(params.blockId, 10),
        }),
        getTitle: (props) => `Block #${props.blockId}`,
        iconType: 'block',
        defaultWidth: 500,
        defaultHeight: 600,
    },

    // Image Viewer (URL encoded in query param)
    {
        pattern: 'image',
        componentType: 'ImageViewer',
        extractProps: (_, query) => ({
            imageUrl: query.get('url') || '',
        }),
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
        getTitle: () => 'Config',
        iconType: 'config',
        singleInstance: true,
        defaultWidth: 400,
        defaultHeight: 500,
    },

    {
        pattern: 'arena',
        componentType: 'Are.na',
        extractProps: () => ({ username: 'lok' }),
        getTitle: () => 'Are.na',
        iconType: 'arena',
        defaultWidth: 400,
        defaultHeight: 500,
    },

    {
        pattern: 'shelf',
        componentType: 'Shelf',
        extractProps: (_, query) => ({
            initialTab: query.get('tab') || undefined,
        }),
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
        getTitle: () => 'Weather',
        iconType: 'weather',
        defaultWidth: 860,
        defaultHeight: 525,
    },

    {
        pattern: 'bsky',
        componentType: 'Bsky',
        extractProps: () => ({}),
        getTitle: () => 'Bsky',
        iconType: 'bsky',
        defaultWidth: 450,
        defaultHeight: 700,
    },

    {
        pattern: 'fedi',
        componentType: 'Fedi',
        extractProps: () => ({}),
        getTitle: () => 'Fedi',
        iconType: 'fedi',
        defaultWidth: 450,
        defaultHeight: 700,
    },

    {
        pattern: 'links',
        componentType: 'Links',
        extractProps: () => ({}),
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
