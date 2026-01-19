/**
 * Dynamic Component Registry
 * 
 * This registry allows windows with dynamic content (like ChannelExplorer, BlockViewer, etc.)
 * to be serialized and restored across page reloads.
 * 
 * Static apps are auto-generated from APP_LIST to avoid duplication.
 * Dynamic components (opened with various props) are defined manually.
 */

import React, { ComponentType } from 'react';

// Dynamic components only - not in APP_LIST because they're opened with custom props
import { ChannelExplorer } from '@/apps/arena/channels/ChannelExplorer';
import { BlockViewer } from '@/apps/arena/blocks/BlockViewer';
import { ImageViewerApp } from '@/apps/imageviewer/ImageViewerApp';

/**
 * Config for each restorable component
 */
export interface ComponentRestoreConfig {
    component: ComponentType<any>;
    defaultIcon: string;
    defaultWidth?: number;
    defaultHeight?: number;
}

/**
 * Dynamic components that can be opened with various props
 * These are NOT in APP_LIST because they're created dynamically (e.g., opening a specific channel)
 */
const DYNAMIC_COMPONENTS: Record<string, ComponentRestoreConfig> = {
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

// Cache for the full registry (lazy-initialized to avoid circular dependency)
let _registryCache: Record<string, ComponentRestoreConfig> | null = null;

/**
 * Build the full component registry by combining APP_LIST entries with dynamic components.
 * Uses lazy initialization to avoid circular dependency issues.
 */
async function buildRegistry(): Promise<Record<string, ComponentRestoreConfig>> {
    if (_registryCache) {
        return _registryCache;
    }

    // Dynamic import to avoid circular dependency
    // (apps.tsx imports components → components might import useWindowManager → useWindowManager imports this)
    const { APP_LIST } = await import('@/config/apps');

    // Generate entries from APP_LIST
    const staticApps: Record<string, ComponentRestoreConfig> = {};
    for (const app of APP_LIST) {
        staticApps[app.name] = {
            component: app.component,
            defaultIcon: app.iconType,
            defaultWidth: app.defaultWidth,
            defaultHeight: app.defaultHeight,
        };
    }

    // Merge with dynamic components
    _registryCache = {
        ...staticApps,
        ...DYNAMIC_COMPONENTS,
    };

    return _registryCache;
}

/**
 * Get component config from registry (sync version for compatibility)
 * Falls back to dynamic components if registry not yet built
 */
export function getComponentConfig(componentType: string): ComponentRestoreConfig | undefined {
    // If cache is built, use it
    if (_registryCache) {
        return _registryCache[componentType];
    }

    // Otherwise, check if it's a known dynamic component
    return DYNAMIC_COMPONENTS[componentType];
}

/**
 * Get component config from registry (async version - preferred)
 */
export async function getComponentConfigAsync(componentType: string): Promise<ComponentRestoreConfig | undefined> {
    const registry = await buildRegistry();
    return registry[componentType];
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
        console.warn(`[Registry] Unknown component type: ${componentType}`);
        return null;
    }

    return React.createElement(config.component, props || {});
}

/**
 * Create a React element from component type and props (async version - preferred)
 * @param componentType - The type of component to create
 * @param props - Props to pass to the component
 * @param onPropsChange - Optional callback for components to report state changes
 */
export async function createComponentElementAsync(
    componentType: string,
    props?: Record<string, unknown>,
    onPropsChange?: (props: Record<string, unknown>) => void
): Promise<React.ReactElement | null> {
    const config = await getComponentConfigAsync(componentType);
    if (!config) {
        console.warn(`[Registry] Unknown component type: ${componentType}`);
        return null;
    }

    // Inject onPropsChange callback if provided
    const elementProps = { ...props };
    if (onPropsChange) {
        elementProps.onPropsChange = onPropsChange;
    }

    return React.createElement(config.component, elementProps);
}

/**
 * Check if a component type is registered
 */
export function isComponentRegistered(componentType: string): boolean {
    if (_registryCache) {
        return componentType in _registryCache;
    }
    return componentType in DYNAMIC_COMPONENTS;
}

/**
 * Initialize the registry (call early in app lifecycle)
 */
export async function initializeRegistry(): Promise<void> {
    await buildRegistry();
    console.log('[Registry] Initialized with', Object.keys(_registryCache!).length, 'components');
}
