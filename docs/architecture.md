# Architecture

## System Overview

lok.computer is a single-page application (SPA) that simulates a desktop environment in the browser.

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │                    React App                       │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              WindowManager                   │  │  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │  │  │
│  │  │  │ Window  │ │ Window  │ │ Window  │       │  │  │
│  │  │  │ (App)   │ │ (App)   │ │ (App)   │       │  │  │
│  │  │  └─────────┘ └─────────┘ └─────────┘       │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              IndexedDB (Storage)             │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │   Cloudflare Worker      │
            │   (API Proxy)            │
            └──────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      ┌─────────┐    ┌─────────┐    ┌─────────┐
      │ Are.na  │    │ Bluesky │    │  Fedi   │
      │   API   │    │   API   │    │   API   │
      └─────────┘    └─────────┘    └─────────┘
```

## Folder Structure

### `/src/apps/`
Each app has its own folder containing the main component and any related files.

```
apps/
├── about/           # About page with tabs
├── arena/           # Are.na integration
│   ├── blocks/      # Block viewer
│   ├── channels/    # Channel explorer, browser
│   ├── components/  # Shared Arena components
│   └── utils/       # Content item utilities
├── bsky/            # Bluesky posts
├── config/          # Settings/configuration
├── console/         # Developer console
├── fedi/            # Fediverse posts
├── guestbook/       # Guestbook app
├── imageviewer/     # Image viewer
├── links/           # Links page
├── shelf/           # NeoDB shelf (media tracking)
├── talk-to-ai/      # AI chat
├── weather/         # Weather app
└── web/             # Web browser iframe
```

### `/src/components/`
Shared components used across apps.

```
components/
├── RouteInterpreter.tsx  # URL deep linking
├── WindowManager.tsx     # Re-exports
├── calendar/             # Calendar widget
├── desktop/              # Desktop icons
├── effects/              # CRT filter
├── menu/                 # Start menu
├── oneko/                # Cat companion
├── ui/                   # Buttons, dialogs, etc.
└── window/               # Window components
    ├── CustomIcon.tsx
    ├── DraggableWindow.tsx
    ├── WindowContainer.tsx
    ├── WindowLayout.tsx
    └── WindowManagerProvider.tsx
```

### `/src/config/`
Configuration and registries.

| File | Purpose |
|------|---------|
| `apps.tsx` | App list with metadata |
| `channels.ts` | Featured Are.na channels |
| `componentRegistry.tsx` | Component type → React component mapping |
| `routes.ts` | URL → component mappings for deep links |
| `window.ts` | Window defaults (size, constraints) |
| `constants.ts` | Global constants |

### `/src/hooks/`
Custom React hooks.

| Hook | Purpose |
|------|---------|
| `useWindowManager.ts` | Window state management |
| `useUserSettings.ts` | User preferences |
| `useStorage.ts` | IndexedDB persistence |
| `useDoubleClick.ts` | Double-click detection |
| `use-mobile.tsx` | Mobile device detection |

### `/src/lib/`
Utility libraries.

| File | Purpose |
|------|---------|
| `api.ts` | Are.na API calls with caching |
| `storage.ts` | IndexedDB operations |
| `utils.ts` | Window adjustment utilities |

### `/src/core/`
Core desktop components.

| File | Purpose |
|------|---------|
| `Desktop.tsx` | Main desktop layout, effects |
| `TopBar.tsx` | Menu bar at top |
| `Taskbar.tsx` | Window list at bottom |

## Data Flow

### Window Creation
```
User clicks icon
       │
       ▼
DesktopIcons.tsx
       │
       ▼
addWindow() / addOrFocusWindow()
       │
       ▼
useWindowManager (state update)
       │
       ▼
WindowContainer renders DraggableWindow
       │
       ▼
Session saved to IndexedDB (debounced)
```

### Session Restoration
```
Page load
       │
       ▼
useWindowManager effect runs
       │
       ▼
Load from IndexedDB (windowSession)
       │
       ▼
For each saved window:
  - getComponentConfigAsync()
  - createComponentElementAsync()
       │
       ▼
setWindows() with restored windows
       │
       ▼
RouteInterpreter runs (after isSessionRestored)
       │
       ▼
If URL has deep link → open additional window
```

### API Request Flow
```
App needs data
       │
       ▼
Check IndexedDB cache
       │
       ├── Cache hit → Return data
       │
       └── Cache miss
              │
              ▼
       Fetch from API
              │
              ├── Are.na → Direct (public API)
              │
              └── Bsky/Fedi/NeoDB → Via Cloudflare Worker
                     │
                     ▼
              Worker adds auth headers
                     │
                     ▼
              Response cached in IndexedDB
```
