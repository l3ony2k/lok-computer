/**
 * RouteInterpreter Component
 *
 * Interprets URL paths and opens corresponding windows.
 * Waits for session restore before processing to ensure windows append on top.
 */

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWindowActions, useWindowState } from '@/hooks/useWindowManager';
import { matchRoute, parseWindowSpec, ROUTES } from '@/config/routes';
import { WINDOW_DEFAULTS } from '@/config/window';

interface RouteInterpreterProps {
    /** Called when route interpretation is complete */
    onComplete?: () => void;
}

export const RouteInterpreter = ({ onComplete }: RouteInterpreterProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isSessionRestored } = useWindowState();
    const { addWindow, addOrFocusWindow } = useWindowActions();
    const hasProcessed = useRef(false);

    useEffect(() => {
        // Only process once, and only after session is restored.
        // The guard is set before any async work: opening windows changes the
        // context value mid-processing, which re-runs this effect.
        if (!isSessionRestored || hasProcessed.current) return;
        hasProcessed.current = true;

        /**
         * Open a single window from route match
         */
        const openSingleWindow = async (
            route: typeof ROUTES[0],
            params: Record<string, string>,
            query: URLSearchParams
        ) => {
            const { getComponentConfigAsync, createComponentElementAsync } = await import('@/config/componentRegistry');
            const props = route.extractProps(params, query);
            const title = route.getTitle(props);

            // Get component config for defaults
            const config = await getComponentConfigAsync(route.componentType);
            if (!config) {
                console.error(`[RouteInterpreter] Unknown component type: ${route.componentType}`);
                return;
            }

            // Create the component element
            const content = await createComponentElementAsync(route.componentType, props);
            if (!content) {
                console.error(`[RouteInterpreter] Failed to create component: ${route.componentType}`);
                return;
            }

            const windowConfig = {
                title,
                content,
                iconType: route.iconType,
                width: route.defaultWidth ?? config.defaultWidth ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
                height: route.defaultHeight ?? config.defaultHeight ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
                minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
                minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
                componentType: route.componentType,
                props,
                singleInstance: route.singleInstance,
            };

            if (route.singleInstance) {
                addOrFocusWindow(windowConfig);
            } else {
                addWindow(windowConfig);
            }

            console.info(`[RouteInterpreter] Opened window: ${title} (${route.componentType})`);
        };

        /**
         * Open multiple windows from comma-separated specs
         * Format: "app1,app2/param,app3?query=value"
         */
        const openMultipleWindows = async (specs: string) => {
            const windowSpecs = specs.split(',').map(s => s.trim()).filter(Boolean);

            for (const spec of windowSpecs) {
                const { path, query } = parseWindowSpec(spec);
                const match = matchRoute('/' + path);

                if (match) {
                    // Merge query params from spec
                    const fullQuery = new URLSearchParams(query);
                    await openSingleWindow(match.route, match.params, fullQuery);
                } else {
                    console.warn(`[RouteInterpreter] Unknown window spec: ${spec}`);
                }
            }

            console.info(`[RouteInterpreter] Opened ${windowSpecs.length} windows from URL`);
        };

        const processRoute = async () => {
            const path = location.pathname;
            const searchParams = new URLSearchParams(location.search);

            // Check for multi-window URL format: /open?w=app1,app2/param,app3
            if (path === '/open' || path === '/open/') {
                const windowSpecs = searchParams.get('w');
                if (windowSpecs) {
                    await openMultipleWindows(windowSpecs);
                }
                navigate('/', { replace: true });
                onComplete?.();
                return;
            }

            // Check for single window route
            const match = matchRoute(path);
            if (match) {
                await openSingleWindow(match.route, match.params, searchParams);
                navigate('/', { replace: true });
                onComplete?.();
                return;
            }

            // No matching route, just mark as processed
            if (path !== '/' && path !== '') {
                console.warn(`[RouteInterpreter] No matching route for path: ${path}`);
            }
            onComplete?.();
        };

        processRoute();
    }, [isSessionRestored, location.pathname, location.search, navigate, onComplete, addWindow, addOrFocusWindow]);

    // This component doesn't render anything
    return null;
};

export default RouteInterpreter;
