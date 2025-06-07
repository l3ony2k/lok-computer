# lok.computer Manual

## 1. Project Overview

**lok.computer** is a web-based operating system designed to emulate a retro-style desktop environment. It provides a familiar, window-based interface for interacting with a variety of integrated applications, from browsing the web and Are.na to interacting with AI.

**Core Concepts:**

*   **Desktop Metaphor:** A classic desktop UI with a top bar, application menu, and draggable windows.
*   **Integrated Applications:** A suite of applications, including a web browser, Are.na channel explorer, and an AI chat client, all running within the same environment.
*   **Modular Architecture:** The system is built around a `core` desktop shell and a collection of distinct `apps`. This design makes it easy to develop and add new applications.
*   **Custom Window Management:** A custom window manager allows for opening, closing, focusing, dragging, and resizing application windows.
*   **Retro Aesthetics:** The visual style is inspired by classic operating systems, achieved with a custom design system built on top of Tailwind CSS.

**Technology Stack:**

*   **Framework:** React
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **UI Components:** A custom set of components, with some elements from shadcn/ui.
*   **Windowing:** A custom implementation for draggable and resizable windows.
*   **Styling:** Tailwind CSS and PostCSS.
*   **State Management:** React Context API for the Window Manager.
*   **API Interaction:** Fetch API for Are.na and other services.

## 2. Directory Structure

```
./lok-computer/
├── public/                  # Static assets
└── src/                     # Main source code
    ├── apps/                # Standalone applications
    │   ├── about/           # About this computer
    │   ├── arena/           # Are.na-related apps & components
    │   ├── bsky/            # Bluesky client
    │   ├── config/          # Settings/configuration app
    │   ├── console/         # In-OS console/terminal
    │   ├── imageviewer/     # Simple image viewer
    │   ├── talk-to-ai/      # AI chat application
    │   ├── weather/         # Weather app
    │   └── web/             # Web browser application
    ├── assets/              # Icons and other assets
    ├── components/          # Reusable UI components
    │   ├── calendar/
    │   ├── desktop/
    │   ├── icons/
    │   ├── menu/            # Application menu
    │   ├── ui/              # Base UI elements (buttons, inputs, etc.)
    │   └── window/          # Windowing system components
    ├── config/              # Global application configuration
    ├── core/                # Core desktop shell (Desktop, TopBar)
    ├── hooks/               # Custom React hooks
    ├── lib/                 # Utility functions (API clients)
    └── types/               # TypeScript type definitions
```

## 3. The Desktop Environment

The desktop is the primary interface, providing access to all applications and system functions.

### 3.1. Top Bar (`src/core/TopBar.tsx`)

The top bar is the main navigation and status area.

*   **App Menu:** Located at the top-left, triggered by the "lok.computer" button. It lists all available applications.
    *   **Nested Menus:** Applications like "Are.na Browser" and "Links" have nested sub-menus that provide direct access to channels or URLs.
    *   **Marquee Effect:** Long item names in the menu will scroll on hover to reveal the full title.
*   **Open Windows:** The top bar does not display a list of open windows.
*   **System Tray:** The right side of the top bar contains a clock and a calendar.

### 3.2. Window Management (`src/hooks/useWindowManager.ts`, `src/components/window/`)

The windowing system is the foundation of the multi-tasking environment.

*   **`useWindowManager.ts`**: The core hook that manages the state of all open windows, including their position, size, and focus.
*   **`DraggableWindow.tsx`**: A component that represents a single window, making it draggable and resizable.
*   **Window Controls:** Each window has standard controls for closing.

### 3.3. Icons (`src/components/window/CustomIcon.tsx`)

The system uses a centralized `CustomIcon` component to manage all application and file-type icons.

*   **Icon Mapping:** `CustomIcon.tsx` contains a map that links an icon type (e.g., "folder", "webpage") to a specific image file in `src/assets/icons/`.
*   **Changing Icons:** To change an icon, simply update the corresponding entry in the `iconMap` and the import statement in `CustomIcon.tsx`.

## 4. Applications

Applications are the primary tools for interacting with the system. They are defined in `src/config/apps.tsx`.

### 4.1. Are.na Browser (`src/apps/arena/channels/ChannelBrowser.tsx`)

*   Provides an interface for exploring Are.na channels.
*   Displays a list of channels, which can be opened to view their contents.
*   Defaults to a list view for a compact display.

### 4.2. Channel Explorer (`src/apps/arena/channels/ChannelExplorer.tsx`)

*   Displays the contents of a single Are.na channel, including blocks (text, images, links) and other channels.
*   Uses virtualization (`react-window`) for efficient rendering of long lists.
*   Double-clicking a block opens it in the `BlockViewer`.

### 4.3. Block Viewer (`src/apps/arena/blocks/BlockViewer.tsx`)

*   Displays the content of a single Are.na block.
*   **Link Previews:** For link blocks that have an associated image, it displays the image preview above the link.

### 4.4. Web Browser (`src/apps/web/WebBrowser.tsx`)

*   A simple, functional web browser for navigating websites within the OS.
*   Launched when opening URLs from the "Links" folder.

### 4.5. Links Folder (`src/apps/arena/components/LinkFolder.tsx`)

*   A special folder that contains a pre-defined list of links.
*   Acts as a quick launcher for frequently visited sites.
*   Uses the same UI as the `ChannelExplorer` for a consistent look and feel.
*   Opens links in the `WebBrowser` application.

### 4.6. Other Applications

*   **Talk to AI:** An application for chatting with an AI model.
*   **Bsky Posts:** A client for viewing posts from the Bluesky social network.
*   **Weather:** A simple app to check the weather.
*   **Console:** An in-OS console for viewing system logs and running commands.
*   **Config:** An application for viewing and changing system settings.
*   **About:** A simple window with information about the project.

## 5. How to Add a New Application

1.  **Create the Component:** Build your application's main component inside the `src/apps/` directory.
2.  **Add to `APP_LIST`:** Open `src/config/apps.tsx` and add a new entry to the `APP_LIST` array.
    ```typescript
    {
      name: "My New App",
      iconType: "my-icon", // Corresponds to an entry in CustomIcon.tsx
      component: MyNewAppComponent,
      defaultWidth: 400,
      defaultHeight: 300,
    }
    ```
3.  **Add an Icon:**
    1.  Add your new icon image to `src/assets/icons/`.
    2.  Open `src/components/window/CustomIcon.tsx`, import your new icon, and add it to the `iconMap` with the `iconType` you defined in `APP_LIST`.

## Theme Management

The application uses `next-themes`