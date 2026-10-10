/**
 * Umami analytics (self-hosted; the tracker tag lives in index.html).
 *
 * The desktop has no pages, so automatic pageviews are switched off in the
 * tag (`data-auto-pageview="false"`): the URL resets to `/` right after a
 * deep link opens, which would count every visit twice. Instead the route
 * interpreter reports the URL the visitor arrived with, once, and the
 * launcher reports which apps get opened. Nothing here identifies a person.
 */

type EventData = Record<string, string | number | boolean>;

interface Umami {
  track: (payload: string | ((props: Record<string, unknown>) => Record<string, unknown>), data?: EventData) => Promise<unknown> | void;
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

const whenReady = (callback: (umami: Umami) => void) => {
  if (window.umami) {
    callback(window.umami);
    return;
  }
  // The tag is deferred; a slow network can bring it in after React mounts.
  window.addEventListener('load', () => {
    if (window.umami) callback(window.umami);
  }, { once: true });
};

const send = (callback: (umami: Umami) => void) => {
  try {
    whenReady((umami) => {
      void Promise.resolve(callback(umami)).catch(() => undefined);
    });
  } catch {
    // A blocked or broken tracker must never affect the desktop.
  }
};

/** Record the URL a visit started on (path and query, before the reset to `/`). */
export const trackPageview = (url: string) => {
  send((umami) => umami.track((props) => ({ ...props, url })));
};

/** Record a named event, such as an app launch or a theme switch. */
export const trackEvent = (name: string, data?: EventData) => {
  send((umami) => umami.track(name, data));
};
