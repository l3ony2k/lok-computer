/**
 * RouteInterpreter Component
 *
 * Interprets URL paths and opens corresponding windows.
 * Waits for session restore before processing to ensure windows append on top.
 */

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWindowState } from '@/hooks/useWindowManager';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { matchRoute, parseWindowSpec, ROUTES } from '@/config/routes';
import { THEME_QUERY_PARAM } from '@/lib/theme';

interface RouteInterpreterProps {
    /** Called when route interpretation is complete */
    onComplete?: () => void;
}

export const RouteInterpreter = ({ onComplete }: RouteInterpreterProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isSessionRestored } = useWindowState();
    const openApplication = useApplicationLauncher();
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
            const props = route.extractProps(params, query);
            const title = route.getTitle(props);

            const windowId = openApplication(route.componentType, {
                title,
                props,
            });

            if (!windowId) return;

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
            // A shared `/?theme=` link has already been applied by the theme engine.
            if (searchParams.has(THEME_QUERY_PARAM)) {
                navigate('/', { replace: true });
            }
            onComplete?.();
        };

        processRoute();
    }, [isSessionRestored, location.pathname, location.search, navigate, onComplete, openApplication]);

    // This component doesn't render anything
    return null;
};

export default RouteInterpreter;
