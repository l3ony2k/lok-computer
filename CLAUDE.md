# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start dev server at localhost:8080
bun run build    # Production build
bun run lint     # Run ESLint
bun test         # Run architecture and behavior tests
```

Path alias `@/` maps to `./src/`.

## Style Rules

- **Never use Tailwind `gray-*` colors** — use `neutral-*` instead
- **No rounded corners** — avoid `rounded-*` classes

## Architecture

lok.computer is a browser-based retro desktop environment. The entire UI is a single React app with no actual routing — `react-router-dom` is only used for deep-linking (URLs open specific windows on load, then the URL resets to `/`).

### Window System

The core primitive is a floating, draggable/resizable window powered by `react-rnd`. Every app runs inside one.

- **Window manager hooks** (`src/hooks/useWindowManager.ts`) — `useWindowState` exposes window state and `useWindowActions` exposes stable commands. The internal controller manages z-index stacking, minimize/maximize, and IndexedDB session persistence.
- **`WindowManagerProvider`** / **`WindowContainer`** (`src/components/window/`) — the React provider and the component that renders all open windows.
- **Application catalog** (`src/config/apps.tsx`) — authoritative identity, lazy loader, lazy view, defaults, and single-instance behavior for every restorable Application.
- **Application launch** (`src/hooks/useApplicationLauncher.tsx`) — turns Application identity and domain props into a live, restorable window.

### Adding a New App

1. Create the app component in `src/apps/<name>/`.
2. Add its loader and `React.lazy` export in `src/config/lazyApps.tsx` (never statically import app modules outside `src/apps/`).
3. Add a complete definition to `APPLICATIONS` in `src/config/apps.tsx`, including the same loader.
4. If the app needs deep-linking, add a route to `ROUTES` in `src/config/routes.ts`.

Use `useApplicationLauncher` for desktop, menu, console, route, and nested launches. Dynamic prop-driven Applications use the same catalog; there is no separate restoration registry.

App chunks remain code-split but are warmed during the boot screen. Window content retains a Suspense fallback.

### Session Persistence

Window state (open windows, positions, sizes) survives page reloads via IndexedDB. Windows serialize a catalog `componentType` and domain props; restoration resolves the Application directly through the catalog and recreates its lazy view.

### Storage Layer (`src/lib/storage.ts`)

All persistence goes through a single IndexedDB wrapper with three stores:
- `appState` — window sessions, user settings
- `apiCache` — TTL-based response cache (Weather: 10m, Are.na: 30m–1h, social feeds: 5m)
- `usageStats` — request/cache hit counters

Use `usePersistedState` for view-state lifecycle and `cachedRequest` for remote reads. App modules should retain only source-specific URL, status, and decoding knowledge.

### Cloudflare Worker (`worker.js`)

A single Cloudflare Worker acts as an API proxy for everything that requires credentials:
- `/api/chat` — forwards to an OpenAI-compatible endpoint (env: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`)
- `/api/jev/plan`, `/api/jev` — Ask AI: a fast planner LLM (same endpoint, optional `JEV_PLANNER_MODEL`) compiles typed questions, TypeSafe Jev answers them (env: `TYPESAFE_API_KEY`, `JEV_MODEL`); logic in `jev.js`
- `/api/bsky/feed` — fetches Bluesky posts (env: `BSKY_HANDLE`, `BSKY_APP_PASSWORD`)
- `/api/fedi/account` and `/api/fedi/statuses` — Mastodon/GoToSocial proxy (env: `FEDI_INSTANCE`, `FEDI_ACCESS_TOKEN`)
- `/api/neodb/shelf` — NeoDB reading shelf proxy (env: `NEODB_ACCESS_TOKEN`)

Deploy/configure via `wrangler.toml`. Secrets are set in the Cloudflare dashboard, not in the toml.

### Deep Linking

`RouteInterpreter` (`src/components/RouteInterpreter.tsx`) runs once on mount, reads the URL, opens the corresponding window(s), then replaces the URL with `/`. Supports single windows (`/explorer/channel-slug`) and multi-window specs (`/open?w=about,weather,explorer/my-channel`).

### Themes

`src/lib/theme.ts` registers four themes: `lok` (default, light/dark) and lazily loaded classic skins `98`, `xp`, `7` in `src/themes/` built on the shared `src/themes/classic.css`. The preference is stored in localStorage (`lok.theme`) and applied before first paint by the inline script in `index.html`; keep the two in sync (`src/lib/theme.test.ts` checks). Use `useTheme()` from `src/hooks/useTheme.tsx` (never `next-themes`). Style new surfaces with shared tokens so every theme recolors them, and verify UI changes in all four themes. Classic layouts move the system menu and clock into the taskbar.

### Media Player and Ask AI

- `src/apps/media/` is the Media Player. Other apps hand it audio or video with `createMediaRequest`/`createMediaItem` from `mediaLibrary.ts` and `openApplication(MEDIA_PLAYER_TYPE, { props: { request } })`.
- `src/apps/ask-ai/` is Ask AI (catalog identity `AI Talk`). It calls `/api/jev/plan` then `/api/jev`; the pipeline lives in `jev.js` (planner prompt, plan validation, Jev call, result forming).

### User Settings

`useUserSettings` (`src/hooks/useUserSettings.ts`) manages wallpaper, CRT effects, Oneko, and debug logging preferences. Settings are persisted to IndexedDB. Theme and color mode live in the theme engine, not in user settings.

### Are.na Integration

The Are.na app (`src/apps/arena/`) fetches channel/block data from the Are.na v3 API directly (no proxy needed — public API). Block types include images, links, text, attachments, and media.

Use `ARENA_WINDOW_DEFAULTS` in the Application catalog. `useArenaChannelBrowsing` owns remote/in-memory pagination, ordering, cancellation, dedupe, and selection restoration.

### Versioning

`package.json` is the only version source. Vite injects it into boot HTML and generates `/system-version.json`; do not duplicate version strings elsewhere.
