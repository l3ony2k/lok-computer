# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start dev server at localhost:8080
bun build        # Production build
bun lint         # Run ESLint
```

Path alias `@/` maps to `./src/`.

## Style Rules

- **Never use Tailwind `gray-*` colors** — use `neutral-*` instead
- **No rounded corners** — avoid `rounded-*` classes

## Architecture

lok.computer is a browser-based retro desktop environment. The entire UI is a single React app with no actual routing — `react-router-dom` is only used for deep-linking (URLs open specific windows on load, then the URL resets to `/`).

### Window System

The core primitive is a floating, draggable/resizable window powered by `react-rnd`. Every app runs inside one.

- **`useWindowManager`** (`src/hooks/useWindowManager.ts`) — the central state store. Manages the `windows[]` array, z-index stacking, minimize/maximize, and persists window sessions to IndexedDB.
- **`WindowManagerProvider`** / **`WindowContainer`** (`src/components/window/`) — the React provider and the component that renders all open windows.
- **`APP_LIST`** (`src/config/apps.tsx`) — defines every launchable app: name, icon, component, default dimensions, and whether it's `singleInstance`.

### Adding a New App

1. Create the app component in `src/apps/<name>/`.
2. Add an entry to `APP_LIST` in `src/config/apps.tsx`.
3. If the app needs deep-linking, add a route to `ROUTES` in `src/config/routes.ts`.
4. If the app can be opened with dynamic props (e.g., a specific channel slug), also add it to `DYNAMIC_COMPONENTS` in `src/config/componentRegistry.tsx`.

### Session Persistence

Window state (open windows, positions, sizes) survives page reloads via IndexedDB. The registry pattern (`componentRegistry.tsx`) allows windows to be serialized by `componentType` string and reconstructed on restore. A dynamic import in `componentRegistry.tsx` breaks a circular dependency: `apps.tsx → components → useWindowManager → componentRegistry → apps.tsx`.

### Storage Layer (`src/lib/storage.ts`)

All persistence goes through a single IndexedDB wrapper with three stores:
- `appState` — window sessions, user settings
- `apiCache` — TTL-based response cache (Weather: 10m, Are.na: 30m–1h, social feeds: 5m)
- `usageStats` — request/cache hit counters

### Cloudflare Worker (`worker.js`)

A single Cloudflare Worker acts as an API proxy for everything that requires credentials:
- `/api/chat` — forwards to an OpenAI-compatible endpoint (env: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`)
- `/api/bsky/feed` — fetches Bluesky posts (env: `BSKY_HANDLE`, `BSKY_APP_PASSWORD`)
- `/api/fedi/account` and `/api/fedi/statuses` — Mastodon/GoToSocial proxy (env: `FEDI_INSTANCE`, `FEDI_ACCESS_TOKEN`)
- `/api/neodb/shelf` — NeoDB reading shelf proxy (env: `NEODB_ACCESS_TOKEN`)

Deploy/configure via `wrangler.toml`. Secrets are set in the Cloudflare dashboard, not in the toml.

### Deep Linking

`RouteInterpreter` (`src/components/RouteInterpreter.tsx`) runs once on mount, reads the URL, opens the corresponding window(s), then replaces the URL with `/`. Supports single windows (`/explorer/channel-slug`) and multi-window specs (`/open?w=about,weather,explorer/my-channel`).

### User Settings

`useUserSettings` (`src/hooks/useUserSettings.ts`) — manages wallpaper, CRT effect settings, and Oneko (cursor cat). Persisted to IndexedDB. CRT intensity (scanlines, flicker, RGB offset, curvature) is applied as CSS variables and classes on `document.documentElement`.

### Are.na Integration

The Are.na app (`src/apps/arena/`) fetches channel/block data from the Are.na v3 API directly (no proxy needed — public API). Block types include images, links, text, attachments, and media.
