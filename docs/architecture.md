# Architecture

lok.computer is a single-page React desktop. React Router interprets a deep link, launches Applications, then returns the browser URL to `/`.

## Deep modules

```text
Route / Desktop / Top bar / Console / nested Application
                         │
                         ▼
               Application launch module
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       Application catalog      Window manager
       identity + loader        live state + session
       defaults + props         geometry + stacking
```

### Application catalog

`src/config/apps.tsx` is authoritative for every restorable Application:

- stable `componentType`
- lazy module loader
- lazy React view
- title and icon defaults
- window dimensions
- default props
- single-instance behavior
- desktop visibility

`APP_LIST` is derived from the catalog. Session restoration reads the catalog directly. Startup warming derives its loader set from the same definitions, so launch and preload metadata cannot drift.

`src/config/lazyApps.tsx` remains the only place that imports app chunks. App modules stay code-split and retain the Suspense fallback in window chrome.

### Application launch

`src/hooks/useApplicationLauncher.tsx` is the interface used by app code. Callers provide Application identity plus domain props and optional contextual chrome. The implementation creates the lazy view, applies catalog defaults, records restoration identity, and enforces single-instance behavior.

Low-level window construction lives behind a provider-internal launch context. `useWindowActions` contains only commands for existing windows.

### Window manager

`src/hooks/useWindowManager.ts` owns live window state, stable commands, z-index allocation, and Window session persistence. `WindowManagerProvider` supplies separate state, command, and internal launch contexts.

Session restoration reconstructs Application views from the catalog and injects `onPropsChange`, allowing current view state to update serializable window props.

### Cached requests

`src/lib/cachedRequest.ts` owns the persistent request lifecycle:

1. read IndexedDB TTL cache
2. emit optional cache debug output
3. count a remote request on miss
4. call the source loader
5. persist the result

Are.na, Bsky, Fedi, Shelf, and Weather retain only source-specific URL, status, and decoding knowledge.

### Persisted view state

`usePersistedState` owns initial-load suppression, dynamic keys, optional disabling, normalization/migration, debounced writes, and optional synchronization. Storage remains internal to the implementation.

### Social feed

`src/apps/social/SocialFeedApp.tsx` is shared by two real adapters:

- `BskyPostsApp.tsx`
- `FediApp.tsx`

The shared module owns profile/feed query coordination, infinite paging, loading/error/terminal states, profile and post chrome, and media launch. Each adapter maps its remote source into the Social feed domain.

The shared layout uses project-specific `lok-reader-*` CSS hooks. Keep these hooks neutral: generic names such as `social-feed`, `social-post`, and `social-media` can be mistaken for cosmetic-filter targets by Brave Shields in aggressive mode. In that failure mode, requests complete and posts briefly render before injected filter CSS hides them. This is a presentation-layer concern; API routes, query keys, and cache keys should retain their domain names.

### Are.na channel browsing

`useArenaChannelBrowsing` owns ordering, pagination, cancellation, dedupe, loading state, and selection restoration. It supports two adapters: remote Are.na pages and supplied in-memory items. `ChannelExplorer` coordinates rendering, persisted view state, deep-link synchronization, and Are.na navigation.

## Folder map

| Area | Responsibility |
|---|---|
| `src/apps/` | Application implementations and domain adapters |
| `src/config/apps.tsx` | authoritative Application catalog |
| `src/config/lazyApps.tsx` | lazy chunk loaders and views |
| `src/config/routes.ts` | route-specific parsing and URL generation |
| `src/hooks/useApplicationLauncher.tsx` | Application launch interface |
| `src/hooks/useWindowManager.ts` | live windows and Window session |
| `src/hooks/useStorage.ts` | persisted view state |
| `src/lib/cachedRequest.ts` | persistent remote-read lifecycle |
| `src/lib/storage.ts` | IndexedDB stores and primitives |

Domain terms are defined in [`CONTEXT.md`](../CONTEXT.md).
