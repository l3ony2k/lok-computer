# lok.computer Developer Documentation

Welcome to the developer documentation for **lok.computer** - a retro-inspired web desktop environment.

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System overview, folder structure, data flow |
| [Creating Apps](./creating-apps.md) | Step-by-step guide to adding new apps |
| [Window System](./window-system.md) | Window manager, session persistence, state |
| [Worker & API](./worker-api.md) | Cloudflare Worker setup, API proxies |
| [URL Routing](./url-routing.md) | Deep linking, URL schema |
| [Styling](./styling.md) | CSS, themes, design patterns |

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| Tailwind CSS | Utility-first styling |
| react-rnd | Draggable/resizable windows |
| IndexedDB | Client-side persistence |
| Cloudflare Workers | API proxy (auth, rate limiting) |
| Bun | Package manager & runtime |

## Getting Started

```bash
# Install dependencies
bun install

# Start development server (port 8080)
bun dev

# Build for production
bun run build

# Run architecture invariants
bun test

# Preview production build
bun preview
```

## Project Structure

```
lok-computer/
├── src/
│   ├── apps/           # Individual applications
│   ├── components/     # Shared UI components
│   ├── config/         # Configuration files
│   ├── core/           # Desktop, TopBar, Taskbar
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities, API, storage
│   ├── pages/          # Route pages (Index, NotFound)
│   └── types/          # TypeScript type definitions
├── public/             # Static assets
├── worker.js           # Cloudflare Worker
├── wrangler.toml       # Worker configuration
└── docs/               # This documentation
```

## Key Concepts

### 1. Applications
Restorable programs that run in windows. The authoritative catalog in `config/apps.tsx` owns identity, lazy loader, defaults, and single-instance behavior.

### 2. Application launch
`useApplicationLauncher` turns Application identity and domain props into a live, restorable window.

### 3. Windows
`useWindowState` reads window state and `useWindowActions` commands existing windows. The Window session persists through IndexedDB.

### 4. Storage
IndexedDB-based storage for:
- Window sessions (`windowSession`)
- App state (`app:*`)
- API cache with TTL

`usePersistedState` owns view-state persistence and `cachedRequest` owns the persistent remote-read lifecycle.

### 5. Cloudflare Worker
API proxy that handles:
- Authentication (Bluesky, Fediverse)
- Rate limiting
- CORS headers
- Secret management

## Environment Variables

Development variables go in `wrangler.toml` under `[vars]`.
Production secrets are set via Cloudflare dashboard.

| Variable | Description |
|----------|-------------|
| `AI_BASE_URL` | OpenAI-compatible API base URL |
| `AI_API_KEY` | API key for AI service |
| `AI_MODEL` | Model name (e.g., `gemini-2.5-flash-lite`) |
| `BSKY_HANDLE` | Bluesky handle |
| `BSKY_APP_PASSWORD` | Bluesky app password |
| `FEDI_INSTANCE` | Mastodon/GtS instance URL |
| `FEDI_ACCESS_TOKEN` | Fedi access token |
| `NEODB_ACCESS_TOKEN` | NeoDB access token |
