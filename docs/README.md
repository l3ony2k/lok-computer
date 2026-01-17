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

### 1. Apps
Self-contained components that run in windows. Each app is registered in `config/apps.tsx`.

### 2. Windows
Managed by `useWindowManager` hook. Windows can be dragged, resized, minimized, maximized. State persists across sessions via IndexedDB.

### 3. Component Registry
Maps component type names to actual React components. Used for session restoration and URL deep linking.

### 4. Storage Layer
IndexedDB-based storage for:
- Window sessions (`windowSession`)
- App state (`app:*`)
- API cache with TTL

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
