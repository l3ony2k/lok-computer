/**
 * RouteInterpreter
 *
 * Reads the URL the visitor arrived with, opens the matching window(s), and
 * resets the address bar to `/`. It runs once, after the saved session has
 * been restored so deep-linked windows land on top of it. The desktop has no
 * client-side navigation beyond this, so it reads `window.location` directly
 * instead of carrying a router.
 */

import { useEffect, useRef } from 'react';
import { useWindowState } from '@/hooks/useWindowManager';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { matchRoute, parseWindowSpec, type RouteConfig } from '@/config/routes';
import { THEME_QUERY_PARAM } from '@/lib/theme';
import { trackPageview } from '@/lib/analytics';

const resetUrl = () => {
  if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
    window.history.replaceState(null, '', '/');
  }
};

export const RouteInterpreter = () => {
  const { isSessionRestored } = useWindowState();
  const openApplication = useApplicationLauncher();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Only process once, and only after session is restored. The guard is set
    // first: opening windows changes the context value, which re-runs this effect.
    if (!isSessionRestored || hasProcessed.current) return;
    hasProcessed.current = true;

    const openWindow = (route: RouteConfig, params: Record<string, string>, query: URLSearchParams) => {
      const props = route.extractProps(params, query);
      const title = route.getTitle(props);
      if (openApplication(route.componentType, { title, props })) {
        console.info(`[RouteInterpreter] Opened window: ${title} (${route.componentType})`);
      }
    };

    /** Multi-window format: `/open?w=app1,app2/param,app3?query=value` */
    const openWindows = (specs: string) => {
      const windowSpecs = specs.split(',').map((spec) => spec.trim()).filter(Boolean);
      for (const spec of windowSpecs) {
        const { path, query } = parseWindowSpec(spec);
        const match = matchRoute('/' + path);
        if (match) openWindow(match.route, match.params, query);
        else console.warn(`[RouteInterpreter] Unknown window spec: ${spec}`);
      }
      console.info(`[RouteInterpreter] Opened ${windowSpecs.length} windows from URL`);
    };

    const { pathname, search } = window.location;
    const searchParams = new URLSearchParams(search);
    // The arrival URL is the only pageview a visit gets; it resets to `/` below.
    trackPageview(pathname + search);

    if (pathname === '/open' || pathname === '/open/') {
      const specs = searchParams.get('w');
      if (specs) openWindows(specs);
      resetUrl();
      return;
    }

    const match = matchRoute(pathname);
    if (match) {
      openWindow(match.route, match.params, searchParams);
      resetUrl();
      return;
    }

    if (pathname !== '/') console.warn(`[RouteInterpreter] No matching route for path: ${pathname}`);
    // A shared `/?theme=` link has already been applied by the theme engine.
    if (searchParams.has(THEME_QUERY_PARAM)) resetUrl();
  }, [isSessionRestored, openApplication]);

  return null;
};
