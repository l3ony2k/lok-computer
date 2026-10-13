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
| [Glossary](./glossary.md) | Domain terms: Application, launch, window session, cached request |
| [Development log](./development-log.md) | Detailed notes for every release |

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
│   ├── pages/          # Index (the desktop shell)
│   └── types/          # TypeScript type definitions
├── public/             # Static assets
├── worker/             # Cloudflare Worker (worker.js, jev.js, tests)
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
| `AI_BASE_URL` | OpenAI-compatible API base URL for the Ask AI planner |
| `AI_API_KEY` | API key for that endpoint |
| `JEV_PLANNER_MODEL` | Planner model name (required; `gpt-6-luna`) |
| `TYPESAFE_API_KEY` | TypeSafe Jev API key |
| `JEV_MODEL` | Jev model or alias (`jev-latest`) |
| `FEDI_INSTANCE` | Mastodon/GtS instance URL |
| `FEDI_ACCESS_TOKEN` | Fedi access token |
| `NEODB_USERNAME` | NeoDB user whose shelf is shown |
| `NEODB_ACCESS_TOKEN` | NeoDB access token |

Two rate-limit bindings in `wrangler.toml` budget each client IP: `JEV_RATE_LIMITER` for Ask AI (20 calls per minute) and `PROXY_RATE_LIMITER` for the Fedi and NeoDB proxies (60 requests per minute).
