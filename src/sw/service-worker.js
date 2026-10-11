/*
 * lok.computer service worker. Built into /sw.js by vite.config.ts, which
 * fills in the version, the shell to precache (the page, the entry script
 * and stylesheet, the manifest and icons) and the list of every hashed asset
 * of this build.
 *
 * - Navigations go to the network first and fall back to the cached shell,
 *   so the desktop opens with no connection at all.
 * - /assets/* files are hashed and immutable: cache first, kept across
 *   versions until a new worker prunes the ones its build no longer ships.
 *   The boot screen warms every app chunk and local asset, so after one
 *   visit the whole desktop is in the cache.
 * - /api/*, /system-version.json and /sw.js are never cached: the update
 *   monitor must see the real version, and Reboot clears every cache anyway.
 */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const ASSETS = new Set(__ASSETS__);
const SHELL_CACHE = `lok-shell-${VERSION}`;
const ASSET_CACHE = "lok-assets";
const SHELL_KEY = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith("lok-shell-") && name !== SHELL_CACHE)
      .map((name) => caches.delete(name)));
    // Hashed files the new build no longer ships are dead weight.
    const assets = await caches.open(ASSET_CACHE);
    for (const request of await assets.keys()) {
      if (!ASSETS.has(new URL(request.url).pathname)) await assets.delete(request);
    }
    await self.clients.claim();
  })());
});

const networkFirstShell = async (request) => {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(SHELL_KEY, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(SHELL_KEY);
    if (cached) return cached;
    throw error;
  }
};

const cacheFirst = async (request, cacheName) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const { pathname } = url;
  if (pathname.startsWith("/api/") || pathname === "/system-version.json" || pathname === "/sw.js") return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirstShell(request));
    return;
  }
  if (pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }
  if (PRECACHE.includes(pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});
