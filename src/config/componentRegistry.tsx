/**
 * Dynamic Component Registry
 * 
 * This registry allows windows with dynamic content (like ChannelExplorer, BlockViewer, etc.)
 * to be serialized and restored across page reloads.
 * 
 * Unlike APP_LIST (which is for desktop icons with fixed configs), this registry
 * maps component type names to their constructors for session restoration.
 */

import React, { ComponentType } from 'react';

// Import all restorable components
import { ChannelBrowser } from '@/apps/arena/channels/ChannelBrowser';
import { ChannelExplorer } from '@/apps/arena/channels/ChannelExplorer';
import { BlockViewer } from '@/apps/arena/blocks/BlockViewer';
import { ImageViewerApp } from '@/apps/imageviewer/ImageViewerApp';
import { WebBrowser } from '@/apps/web/WebBrowser';
import BskyPostsApp from '@/apps/bsky/BskyPostsApp';
import FediApp from '@/apps/fedi/FediApp';
import { WeatherApp } from '@/apps/weather/WeatherApp';
import { About } from '@/apps/about/About';
import { ConfigApp } from '@/apps/config/ConfigApp';
import { ConsoleApp } from '@/apps/console/ConsoleApp';
import { TalkToAI } from '@/apps/talk-to-ai/TalkToAI';
import { GuestbookApp } from '@/apps/guestbook/GuestbookApp';
import { ShelfApp } from '@/apps/shelf/ShelfApp';

/**
 * Props that should be persisted for each component type
 * This defines what props are serializable and should be saved/restored
 */
export interface ComponentRestoreConfig {
    component: ComponentType<any>;
    defaultIcon: string;
    // Optional: default dimensions if not provided
    defaultWidth?: number;
    defaultHeight?: number;
}

/**
 * The component registry maps component type identifiers to their configs
 */
export const COMPONENT_REGISTRY: Record<string, ComponentRestoreConfig> = {
    // Static apps (from APP_LIST, for fallback compatibility)
    'Are.na': {
        component: ChannelBrowser,
        defaultIcon: 'arena',
        defaultWidth: 400,
        defaultHeight: 500,
    },
    'Web': {
        component: WebBrowser,
        defaultIcon: 'webpage',
        defaultWidth: 800,
        defaultHeight: 600,
    },
    'Bsky': {
        component: BskyPostsApp,
        defaultIcon: 'bsky',
        defaultWidth: 450,
        defaultHeight: 700,
    },
    'Fedi': {
        component: FediApp,
        defaultIcon: 'fedi',
        defaultWidth: 450,
        defaultHeight: 700,
    },
    'AI Talk': {
        component: TalkToAI,
        defaultIcon: 'mailbox',
        defaultWidth: 400,
        defaultHeight: 600,
    },
    'Weather': {
        component: WeatherApp,
        defaultIcon: 'weather',
        defaultWidth: 860,
        defaultHeight: 525,
    },
    'Console': {
        component: ConsoleApp,
        defaultIcon: 'console',
        defaultWidth: 700,
        defaultHeight: 400,
    },
    'About': {
        component: About,
        defaultIcon: 'about',
        defaultWidth: 500,
        defaultHeight: 600,
    },
    'Config': {
        component: ConfigApp,
        defaultIcon: 'config',
        defaultWidth: 400,
        defaultHeight: 500,
    },
    'Guestbook': {
        component: GuestbookApp,
        defaultIcon: 'mail',
        defaultWidth: 500,
        defaultHeight: 600,
    },
    'Shelf': {
        component: ShelfApp,
        defaultIcon: 'shelf',
        defaultWidth: 500,
        defaultHeight: 700,
    },

    // Dynamic components (can be opened with various props)
    'ChannelBrowser': {
        component: ChannelBrowser,
        defaultIcon: 'arena',
        defaultWidth: 400,
        defaultHeight: 500,
    },
    'ChannelExplorer': {
        component: ChannelExplorer,
        defaultIcon: 'folder',
        defaultWidth: 600,
        defaultHeight: 500,
    },
    'BlockViewer': {
        component: BlockViewer,
        defaultIcon: 'block',
        defaultWidth: 500,
        defaultHeight: 600,
    },
    'ImageViewer': {
        component: ImageViewerApp,
        defaultIcon: 'image',
        defaultWidth: 600,
        defaultHeight: 500,
    },
};

/**
 * Get component config from registry
 */
export function getComponentConfig(componentType: string): ComponentRestoreConfig | undefined {
    return COMPONENT_REGISTRY[componentType];
}

/**
 * Create a React element from component type and props
 */
export function createComponentElement(
    componentType: string,
    props?: Record<string, unknown>
): React.ReactElement | null {
    const config = getComponentConfig(componentType);
    if (!config) {
        console.warn(`[ComponentRegistry] Unknown component type: ${componentType}`);
        return null;
    }

    return React.createElement(config.component, props || {});
}

/**
 * Check if a component type is registered
 */
export function isComponentRegistered(componentType: string): boolean {
    return componentType in COMPONENT_REGISTRY;
}
