# lok.computer

A web application aiming to create a mini desktop-like environment within the browser, featuring modular apps like an Are.na browser, weather app, etc. Built with React, Vite, TypeScript, and shadcn-ui.

## Tech Stack

*   **Framework:** React
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **UI Components:** shadcn-ui
*   **Styling:** Tailwind CSS

## Roadmap

This project aims to evolve from a simple Are.na browser into a functional, multi-app desktop environment.

### Phase 1: Core Refactoring (Completed)

*   **Objective:** Establish a scalable, modular architecture.
*   [x] Define `core` (desktop shell) and `apps` structure.
*   [x] Move `Desktop` component logic to `src/core/Desktop.tsx`.
*   [x] Move Are.na related components (`ChannelBrowser`, `ChannelExplorer`, `BlockViewer`) from `src/components/` into `src/apps/arena/`.
*   [x] Move `About` component from `src/components/` into `src/apps/about/`.
*   [x] Update all imports in `src/core/Desktop.tsx` to reflect new component locations.
*   [x] Verify the basic desktop shell loads and can launch the refactored Are.na and About apps.

### Phase 2: Desktop Enhancements (In Progress)

*   **Objective:** Build out the core desktop interface features.
*   [x] Implement draggable and resizable windows (potentially using libraries like `react-draggable`, `react-rnd`).
*   [ ] Implement desktop icons that launch their respective applications.
*   [x] Refine taskbar functionality (e.g., show icons for open apps, minimize/restore windows).
*   [ ] Improve overall window management logic within `WindowManager`.

### Phase 3: New App Development

*   **Objective:** Expand the available applications.
*   [ ] Develop `Weather` app module (fetching data from an API).
*   [ ] Develop `Blueksy` app module (getting latest posts from blueksy).
*   [ ] Develop `Status` app module (showing latest status log from status.lol).
*   [ ] Develop `Guestbook` app module (allow users to leave messages).
*   [ ] Develop `Mailto` app module (iframe of mailbird.co).
*   [ ] Develop `Shelf` app module (showing my movies, series, books, music, etc from neodb.social).
*   [ ] Develop `Settings` app module (e.g., theme switching, background selection).
*   [ ] Develop `Link Web` app module (visualizing links/connections).
*   [ ] Develop `Browser` app module (basic iframe-based browser).

### Phase 4: Persistence & Polish

*   **Objective:** Improve usability and robustness.
*   [ ] Persist window states (position, size, open/closed) using `localStorage`.
*   [ ] Add unit and integration tests.
*   [ ] Refine UI/UX across the shell and apps.
*   [ ] Optimize performance.
*   [ ] Configure deployment (e.g., using Netlify, Vercel).

## Development Log

### Session: Window Behavior and Arena App Refactoring (Approx. 2025-04-27)

**Objective:** Fix window resizing bugs, implement dark mode scrollbars, and refactor Arena app components for better code structure.

**Key Changes & Fixes:**

1.  **Window Resizing Fix:**
    *   **Issue:** Resizing windows from the top edge caused them to snap back to their original position.
    *   **Solution:** Updated `handleResizeStop` in `src/components/window/DraggableWindow.tsx` to correctly update both dimensions and `x`/`y` position, resolving the snapping behavior.

2.  **Scrollbar Styling (Dark Mode & Cross-Browser):**
    *   **Issue:** Window scrollbars remained white in dark mode.
    *   **Solution:**
        *   Introduced `.window-content-area` class for scrollable divs.
        *   Added CSS in `src/index.css`:
            *   `color-scheme: dark;` for native dark scrollbars in Chromium.
            *   `scrollbar-color` and `scrollbar-width` for themed scrollbars in Firefox (light & dark modes).

3.  **Consistent Scrollbar Application:**
    *   **Issue:** Scrollbar styles only worked in simple windows, not in Arena apps (`ChannelBrowser`, `ChannelExplorer`).
    *   **Root Cause:** `.window-content-area` was applied incorrectly to a parent div including the toolbar.
    *   **Solution:** Moved `.window-content-area` to the correct `overflow-auto flex-1` div in both `ChannelBrowser.tsx` and `ChannelExplorer.tsx`.

4.  **Arena App Window Refactoring:**
    *   **Issue:** Duplicated window structure (toolbar + scrollable content) in `ChannelBrowser.tsx` and `ChannelExplorer.tsx`.
    *   **Solution:**
        *   Created `src/apps/arena/components/ArenaWindowLayout.tsx` to encapsulate the common layout.
        *   Refactored `ChannelBrowser.tsx` and `ChannelExplorer.tsx` to use `ArenaWindowLayout`, passing their unique toolbars and content as props.
        *   This centralized the layout logic and reduced code duplication.

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (comes with Node.js) or Bun

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd are-na-browser-lok
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or if using bun
    # bun install
    ```

### Running Locally

Start the development server:

```bash
npm run dev
# or
# bun dev
```

This will start the Vite development server, usually available at `http://localhost:5173`.

## Available Scripts

*   `npm run dev` or `bun dev`: Starts the development server.
*   `npm run build` or `bun build`: Creates a production build in the `dist` folder.
*   `npm run lint` or `bun lint`: Lints the codebase using ESLint.
*   `npm run preview` or `bun preview`: Serves the production build locally for preview.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.
