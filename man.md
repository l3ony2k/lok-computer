# lok.computer Project Explanation & Walkthrough

## 1. Project Overview

**lok.computer** is a web application designed to emulate a retro-style desktop operating system environment within the browser. The primary initial functionality focuses on providing an interface to browse content from the Are.na platform, specifically the channels and blocks associated with the user "@lok".

**Core Concepts:**

*   **Desktop Metaphor:** The UI mimics a traditional desktop with windows, a taskbar, and a top menu bar.
*   **Are.na as a Filesystem:** Are.na channels are represented as folders, and blocks (images, text, links, etc.) are represented as files within those folders.
*   **Modularity:** The application is structured with a `core` desktop shell and distinct `apps` (like the Are.na browser and an About page).
*   **Window Management:** A custom window manager allows users to open, close, minimize, maximize, drag, and resize application windows.
*   **Retro Aesthetics:** Styling aims for a nostalgic, retro computer feel, utilizing Tailwind CSS and custom styles.

**Technology Stack:**

*   **Framework:** React
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **UI Components:** shadcn/ui (heavily customized)
*   **Windowing:** `react-rnd` for draggable/resizable windows
*   **Styling:** Tailwind CSS, PostCSS
*   **State Management:** React Context API (for Window Manager and Theme)
*   **API Interaction:** Fetch API (for Are.na)
*   **Linting/Formatting:** ESLint, Prettier (implied via config)
*   **Notifications:** `sonner` and shadcn/ui's `Toast`

## 2. Directory Structure Breakdown

```
./lok-computer/
├── src/                     # Main source code directory
│   ├── apps/                # Contains individual applications within the desktop
│   │   ├── about/           # 'About' application
│   │   │   └── about/
│   │   │       └── About.tsx # Component for the About window content
│   │   └── arena/           # 'Are.na Browser' application
│   │       ├── blocks/        # Components related to displaying Are.na blocks
│   │       │   └── BlockViewer.tsx # Component to view individual block details
│   │       ├── channels/      # Components related to browsing Are.na channels
│   │       │   ├── ChannelBrowser.tsx # Displays the root list of user channels
│   │       │   └── ChannelExplorer.tsx# Displays the contents (blocks/sub-channels) of a channel
│   │       └── components/    # Shared components specific to the Arena app
│   │           └── ArenaWindowLayout.tsx # Layout structure for Arena app windows
│   ├── components/          # Reusable UI components across the project
│   │   ├── ui/              # shadcn/ui components (Accordion, Button, Card, etc.)
│   │   │   ├── ... (many shadcn component files)
│   │   │   └── use-toast.ts   # Re-export of the toast hook
│   │   ├── window/          # Custom components for the windowing system
│   │   │   ├── CustomIcon.tsx # Component to render specific PNG icons
│   │   │   ├── DraggableWindow.tsx # The core draggable/resizable window component (uses react-rnd)
│   │   │   ├── Taskbar.tsx    # The taskbar at the bottom of the screen
│   │   │   ├── WindowContainer.tsx # Container holding all open windows
│   │   │   └── WindowManagerProvider.tsx # Context provider for window state
│   │   ├── ThemeProvider.tsx  # Context provider for managing light/dark themes
│   │   └── WindowManager.tsx  # Exports window-related components/hooks
│   ├── config/              # Application configuration files
│   │   └── channels.ts    # Configuration for featured Are.na channels and API usage
│   ├── core/                # Core desktop shell components
│   │   └── Desktop.tsx      # Main component rendering the desktop environment (menu, container, taskbar)
│   ├── hooks/               # Custom React hooks
│   │   ├── use-mobile.tsx   # Hook to detect mobile viewports
│   │   ├── use-toast.ts     # Custom hook for shadcn/ui toasts
│   │   └── useWindowManager.ts # Core hook and context logic for managing windows
│   ├── lib/                 # Utility functions and libraries
│   │   ├── api.ts           # Functions for interacting with the Are.na API
│   │   └── utils.ts         # Utility functions (like cn for class merging)
│   ├── pages/               # Top-level page components for routing
│   │   ├── Index.tsx        # Main index page rendering the Desktop
│   │   └── NotFound.tsx     # 404 Not Found page
│   ├── types/               # TypeScript type definitions
│   │   └── arena.ts         # Types related to the Are.na API data structures
│   ├── assets/              # (Implicit) Contains static assets like icons (e.g., folder.png)
│   ├── App.css              # Base CSS (mostly unused template)
│   ├── App.tsx              # Root application component setting up providers and routing
│   ├── index.css            # Global styles, Tailwind directives, custom retro styles
│   ├── main.tsx             # Application entry point (renders App into the DOM)
│   └── vite-env.d.ts        # Vite environment type definitions
├── eslint.config.js       # ESLint configuration
├── index.html             # Main HTML entry point for the browser
├── postcss.config.js      # PostCSS configuration (used by Tailwind)
├── README.md              # Project README file
├── tailwind.config.ts     # Tailwind CSS configuration
└── vite.config.ts         # Vite build tool configuration
```

## 3. Key Components & Walkthrough

### 3.1. Window Management (`src/hooks/useWindowManager.ts`, `src/components/window/`)

*   **`useWindowManager.ts`**: This is the heart of the windowing system.
    *   It defines the `Window` interface (id, title, content, position, size, state, zIndex, iconType).
    *   It creates a `WindowManagerContext` using `React.createContext`.
    *   The `createWindowManagerContext` function initializes the state (`windows`, `lastZIndex`, `activeWindow`, `savedPositions`).
    *   It provides functions (`addWindow`, `closeWindow`, `minimizeWindow`, `maximizeWindow`, `restoreWindow`, `focusWindow`, `updateWindowPosition`, `updateWindowDimensions`) to manipulate the window state.
    *   `focusWindow` brings a window to the front by incrementing `lastZIndex` and assigning it to the focused window. It also manages the `activeWindow` state.
    *   It handles basic persistence of window position and dimensions using `localStorage` via the `savedPositions` state.
*   **`WindowManagerProvider.tsx`**: Wraps the application (or relevant part) to provide the `WindowManagerContext` value created by `createWindowManagerContext`.
*   **`WindowContainer.tsx`**: Renders all the `DraggableWindow` components based on the `windows` array from the context. It acts as the bounding area for the windows.
*   **`DraggableWindow.tsx`**:
    *   Represents a single application window.
    *   Uses `react-rnd` to handle dragging and resizing.
    *   Takes a `window` object (from the context) as a prop.
    *   Renders the title bar with controls (minimize, maximize/restore, close) and the window content.
    *   Calls context functions (`closeWindow`, `minimizeWindow`, etc.) when controls are clicked.
    *   Calls `updateWindowPosition` and `updateWindowDimensions` on drag/resize stop events.
    *   Handles focusing the window on interaction (`onMouseDown`, `onDragStart`, `onResizeStart`) by calling `focusWindow`.
    *   Includes logic to disable dragging/resizing when maximized.
    *   Uses `CustomIcon` to display the window's icon in the title bar.
*   **`Taskbar.tsx`**:
    *   Displays a list of buttons representing currently open (non-minimized) windows.
    *   Uses `useWindowManager` to get the `windows` array and `activeWindow` state.
    *   Clicking a taskbar button focuses the window if it's not active, or minimizes it if it *is* active.
    *   Uses `CustomIcon` for icons in the taskbar buttons.
    *   Includes horizontal scrolling logic (`useEffect` with wheel event listener) if tasks overflow.
*   **`CustomIcon.tsx`**: A simple component that maps an `iconType` string (e.g., 'folder', 'image') to an imported PNG image and renders it.

### 3.2. Desktop Shell (`src/core/Desktop.tsx`)

*   This component orchestrates the main desktop view.
*   It sets up the overall layout (Top Menu Bar, Main Area, Taskbar).
*   **Top Menu Bar:** Provides global actions like opening the "Home" (`ChannelBrowser`), "About", "Featured Channels" dropdown, Theme Toggle, and placeholder Search/Settings buttons.
*   **Initialization:** Uses `useEffect` and a `hasInitialized` flag to open the initial `@lok's Channels` window (`ChannelBrowser`) only once on load.
*   **Window Creation:** Uses the `addWindow` function from `useWindowManager` to open new windows when menu items or desktop icons (future feature) are clicked.
*   **Theme Toggle:** Manages light/dark mode switching using `useState` and `localStorage`, applying the 'dark' class to the root HTML element.
*   **Integration:** Renders the `WindowContainer` (where windows live) and the `Taskbar`.

### 3.3. Are.na Application (`src/apps/arena/`)

*   **`ChannelBrowser.tsx`**:
    *   Acts as the "Home" or root folder view for Are.na channels.
    *   Fetches the user's channels using `getUserChannels` from `lib/api.ts`.
    *   Displays channels as folder icons (grid view) or a list.
    *   Provides controls for switching between grid/list view and adjusting icon size (`S`, `M`, `L`).
    *   Includes a search input to filter channels by title.
    *   Clicking a channel opens a new window using `addWindow` with the `ChannelExplorer` component as its content.
    *   Uses `ArenaWindowLayout` for its structure.
*   **`ChannelExplorer.tsx`**:
    *   Displays the contents (blocks and sub-channels) of a specific Are.na channel, identified by its `channelSlug`.
    *   Fetches content using `getChannelContents` from `lib/api.ts`.
    *   Represents blocks with appropriate icons (image, text, video, link) and sub-channels with a distinct 'other-channel' icon. Shows image thumbnails in grid view if available.
    *   Also provides grid/list view and icon size controls.
    *   Clicking a block opens a `BlockViewer` window.
    *   Clicking a sub-channel opens another `ChannelExplorer` window for that channel.
    *   Uses `ArenaWindowLayout` for its structure.
*   **`BlockViewer.tsx`**:
    *   Displays the details of a single Are.na block, identified by `blockId`.
    *   Fetches block data using `getBlock` from `lib/api.ts`.
    *   Renders content differently based on the block's `class` (Image, Text, Link, Media, Attachment).
    *   Handles loading and error states.
    *   Displays metadata like ID, creation date, and source link.
*   **`ArenaWindowLayout.tsx`**: A simple wrapper component providing a consistent layout (toolbar area + scrollable content area) for the `ChannelBrowser` and `ChannelExplorer`. This reduces code duplication.
*   **`lib/api.ts`**: Contains functions (`getUserChannels`, `getChannelContents`, `getBlock`) to fetch data from the Are.na v2 API. Includes error handling (using `sonner` toasts) and a fallback mechanism (`USE_STATIC_CHANNELS` in `config/channels.ts`) to use a predefined list if the API fails or is disabled.
*   **`types/arena.ts`**: Defines TypeScript interfaces (`ArenaChannel`, `ArenaBlock`, `ArenaChannelContents`) matching the structure of data returned by the Are.na API.

### 3.4. About Application (`src/apps/about/`)

*   **`About.tsx`**: A very simple component providing static informational content about the project. It's displayed within a standard draggable window when the "About" menu item is clicked.

### 3.5. UI Components & Styling

*   **`src/components/ui/`**: Contains the standard shadcn-ui components (Button, Card, Dialog, etc.). These are used throughout the application, particularly in the `Desktop` menu and potentially within app windows.
*   **`src/components/ThemeProvider.tsx`**: Provides context for managing the light/dark theme state, persisting it to `localStorage`.
*   **`src/index.css`**:
    *   Imports Tailwind base, components, and utilities.
    *   Defines CSS variables for light and dark themes, including base colors and specific `--retro-*` variables for the custom look.
    *   Applies base styles (like the monospace font and dotted background).
    *   Contains custom component styles (`.retro-button`, `.window-titlebar`, `.folder-grid`, `.taskbar-button`, etc.) to achieve the retro aesthetic.
    *   Includes custom scrollbar styling for `.window-content-area` to match the theme, using `color-scheme` for Chromium and `scrollbar-color`/`scrollbar-width` for Firefox.
*   **`tailwind.config.ts`**: Configures Tailwind, extending the theme with custom colors (referencing the CSS variables), shadows (`boxShadow`), and animations (`keyframes`, `animation`). It defines the `retro` color palette and `sidebar` colors (though the sidebar component itself isn't heavily used in the core desktop layout shown).

### 3.6. Configuration (`src/config/channels.ts`)

*   Defines a list of `FEATURED_CHANNELS` for the dropdown menu.
*   Sets the `DEFAULT_USERNAME` ('lok').
*   Provides a `USE_STATIC_CHANNELS` flag to control whether the `ChannelBrowser` uses the live Are.na API or the static `FEATURED_CHANNELS` list (useful for development or API rate limiting).

### 3.7. Application Setup & Routing (`src/main.tsx`, `src/App.tsx`, `src/pages/`)

*   **`main.tsx`**: The entry point, imports global CSS and renders the `App` component into the `div#root` in `index.html`.
*   **`App.tsx`**:
    *   Sets up necessary global providers:
        *   `QueryClientProvider` (for potential future data fetching enhancements, though not heavily used in the current components).
        *   `TooltipProvider` (for shadcn tooltips).
        *   `Toaster` and `Sonner` (for displaying notifications).
        *   `BrowserRouter` (for handling client-side routing).
    *   Defines the application routes using `react-router-dom`: `/` maps to the `Index` page, and `*` maps to the `NotFound` page.
*   **`pages/Index.tsx`**: The main page component. It wraps the core `Desktop` component with the `ThemeProvider` and `WindowManagerProvider` to make theme and window state available.
*   **`pages/NotFound.tsx`**: A standard 404 page.

## 4. Data Flow

1.  **Initialization:** `App.tsx` sets up providers. `Index.tsx` renders `Desktop.tsx` within the `WindowManagerProvider` and `ThemeProvider`. `Desktop.tsx` opens the initial `ChannelBrowser` window via `addWindow`.
2.  **Channel Browsing:**
    *   `ChannelBrowser` fetches channel list via `getUserChannels` (`lib/api.ts`).
    *   User clicks a channel -> `addWindow` is called with `ChannelExplorer` content and the `channelSlug`.
3.  **Channel Exploring:**
    *   `ChannelExplorer` fetches channel content via `getChannelContents` (`lib/api.ts`) using the provided `channelSlug`.
    *   User clicks a block -> `addWindow` is called with `BlockViewer` content and the `blockId`.
    *   User clicks a sub-channel -> `addWindow` is called with another `ChannelExplorer` instance and the sub-channel's `slug`.
4.  **Block Viewing:**
    *   `BlockViewer` fetches block details via `getBlock` (`lib/api.ts`) using the provided `blockId`.
    *   Content is rendered based on the block type.
5.  **Window State:** All window operations (open, close, move, resize, focus, minimize, maximize) are managed through the `useWindowManager` hook, which updates the state held within `WindowManagerProvider`. Window positions/dimensions are persisted to `localStorage`.
6.  **Theme State:** Theme changes are handled by `ThemeProvider` and persisted to `localStorage`.

## 5. Getting Started (from README.md)

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (comes with Node.js) or Bun

### Installation

1.  Clone the repository.
2.  Navigate to the `lok-computer` directory.
3.  Install dependencies: `npm install` or `bun install`.

### Running Locally

Start the development server: `npm run dev` or `bun dev`. Access the application, usually at `http://localhost:8080` (as per `vite.config.ts`).

## 6. Roadmap/Next Steps (from README.md)

The project has completed the initial refactoring (Phase 1) and is working on desktop enhancements (Phase 2). Future phases involve:

*   **Desktop Enhancements:** Adding desktop icons, refining taskbar/window management.
*   **New Apps:** Developing Weather, Bluesky, Status.lol, Guestbook, Mailto, Shelf, Settings, Link Web, and Browser apps.
*   **Persistence & Polish:** Persisting full window states, adding tests, UI/UX refinement, performance optimization, and deployment configuration.