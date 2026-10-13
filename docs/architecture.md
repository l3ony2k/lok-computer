# Architecture

lok.computer is a single-page React desktop. `RouteInterpreter` reads the arrival URL once, launches Applications, then returns the browser URL to `/` (no routing library is involved).

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

Session restoration and the launcher both inject `onPropsChange`, allowing current view state to update serializable window props (used by Share Window).

Launching a single-instance Application with explicit `props` delivers them to the running window: its content is re-rendered in place with the merged props, so app state survives and the app reacts to the new props. Use a one-shot request object with an id (see `MediaRequest`) when the delivery must be applied exactly once.

### Cached requests

`src/lib/cachedRequest.ts` owns the persistent request lifecycle:

1. read IndexedDB TTL cache
2. emit optional cache debug output
3. offline: serve an expired entry if one exists, else throw `OfflineError` (no network call)
4. count a remote request on miss
5. call the source loader
6. on failure: serve an expired entry if one exists, else rethrow
7. persist the result

Expired entries are kept for seven days past their TTL so there is something to show offline. Are.na, Bsky, Fedi, Shelf, and Weather retain only source-specific URL, status, and decoding knowledge.

### Offline

- React Query (`src/App.tsx`) runs loaders `offlineFirst` and does not retry while offline or on an `OfflineError`; it refetches on reconnect.
- `LoadFailure` (`src/components/ui/LoadFailure.tsx`) renders a failed load: a calm "Offline" note when the browser is offline or nothing is saved, a red message with Retry otherwise.
- `ConnectivityMonitor` sets `html[data-offline]` (skeleton animations rest under it) and toasts each transition; `OfflineReadout` shows OFFLINE beside the clock; `useOnlineStatus` is the hook behind both.
- `lazyApps.tsx` wraps `React.lazy`: a chunk that fails to download resolves to `ChunkRetry`, which fetches the module again on demand, because a rejected lazy stays rejected for the session.
- `WindowErrorBoundary` keeps a crash inside its window instead of unmounting the desktop.

### Persisted view state

`usePersistedState` owns initial-load suppression, dynamic keys, optional disabling, normalization/migration, debounced writes, and optional synchronization. Storage remains internal to the implementation.

### Social feed

`src/apps/social/SocialFeedApp.tsx` is shared by two real adapters:

- `BskyPostsApp.tsx`
- `FediApp.tsx`

The shared module owns profile/feed query coordination, infinite paging, loading/error/terminal states, profile and post chrome, and media launch. Each adapter maps its remote source into the Social feed domain.

The shared layout uses project-specific `lok-reader-*` CSS hooks. Keep these hooks neutral: generic names such as `social-feed`, `social-post`, and `social-media` can be mistaken for cosmetic-filter targets by Brave Shields in aggressive mode. In that failure mode, requests complete and posts briefly render before injected filter CSS hides them. This is a presentation-layer concern; API routes, query keys, and cache keys should retain their domain names.

### Themes

`src/lib/theme.ts` is the theme registry and engine. A theme is a complete visual system (tokens, chrome geometry, type, desktop layout), not a color swap.

- `lok` ships in the entry stylesheet and supports light and dark.
- `98`, `xp`, and `7` are lazily loaded stylesheets in `src/themes/`, each layered on the shared `src/themes/classic.css` structure. They load during boot when active, and on hover in the theme picker.
- The preference lives in localStorage (`lok.theme`) so the inline script in `index.html` can apply `data-theme`, `data-layout`, `.dark`, and `color-scheme` before first paint. `?theme=<id>` on any URL applies and persists a theme.
- `ThemeProvider`/`useTheme` (`src/hooks/useTheme.tsx`) apply attributes in a layout effect, suspend transitions for the swap, sync across tabs, and follow the OS color scheme.
- `data-layout="classic"` moves the system menu and clock into the taskbar (start button, task list, tray).

### Media hand-off

`src/apps/media/mediaLibrary.ts` is a dependency-free module other apps import to hand audio or video to the Media Player: `openApplication(MEDIA_PLAYER_TYPE, { props: { request: createMediaRequest([createMediaItem(url)]) } })`. The player applies each request id once, even across window restores. A request may instead carry `arena`, an Are.na channel or block link; the player then reads that channel's audio and video blocks itself (`src/apps/arena/utils/arenaImport.ts`) and queues them. The Image Viewer reads the same links into a gallery.

### Ask AI (Jev)

`worker/jev.js` beside the Worker plans and answers typed questions: a fast LLM compiles a request into Jev questions (noul, choice, score), Jev answers them, and the Worker forms `result`, a JSON object keyed by the requested properties. The Ask AI app calls `/api/jev/plan` then `/api/jev` so the plan appears before the answers.

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

Domain terms are defined in the [glossary](glossary.md).
