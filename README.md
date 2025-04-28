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
*   [x] Refine taskbar functionality (e.g., show icons for open apps, minimize/restore windows).
*   [x] Implement desktop icons that launch their respective applications.
*   [x] Improve overall window management logic within `WindowManager`.
*   [x] Change window minimize maximize icon.
*   [x] Remove right-side top bar buttons (Search, Settings, Theme); add dedicated Config app for theme settings.
*   [x] Add status bar and date time.
*   [x] Remove toast related stuff. (it's shadcn-ui)

### Phase 2.1: Enhancements

*   **Objective:** Improve current functionality.
*   [x] Search bar input support slug browsing.
*   [ ] Change the not found text (channel browser).
*   [ ] windows resize don't strech icon size when icon count doesn't fill one row.
*   [ ] Refactor: double click to trigger icon action.
*   [ ] Blocks count in channel fix.
*   [ ] Lightbox browsing for are.na explorer.
*   [ ] Support mobile devices. Add special logic for mobile display.
*   [x] Add system color mode support.
*   [ ] Stylize theme switch buttons.
*   [ ] Add wallpaper change.
*   [ ] Browser window resize to move and shrink metaphor window.
*   [ ] Allow user to move past border-b.

### Phase 3: New App Development

*   **Objective:** Expand the available applications.
*   [ ] Develop `Weather` app module (fetching data from an API).
*   [ ] Develop `Blueksy` app module (getting latest posts from blueksy).
*   [ ] Develop `Status` app module (showing latest status log from status.lol).
*   [ ] Develop `Guestbook` app module (allow users to leave messages).
*   [ ] Develop `Mailto` app module (iframe of mailbird.co).
*   [ ] Develop `Shelf` app module (showing my movies, series, books, music, etc from neodb.social).
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

### Session: Desktop Icons Implementation (Approx. 2025-04-28)

**Objective:** Add clickable desktop icons to launch applications and prevent the initial window from opening automatically.

**Key Changes:**

1.  **Disable Auto-Open:** Removed the `useEffect` in `src/core/Desktop.tsx` that previously opened the `@lok's Channels` window on startup.
2.  **Icon Configuration:**
    *   Added icon image imports (`arena.png`, `lok-computer.png`) and mappings (`arena`, `about`) to `src/components/window/CustomIcon.tsx`.
    *   Defined an array `desktopIcons` in `src/core/Desktop.tsx` specifying the name, icon, and action for each desktop shortcut (Are.na Browser, About, Config).
3.  **Icon Rendering:** Rendered the `desktopIcons` array as clickable buttons within the main desktop area in `src/core/Desktop.tsx`.
4.  **Action Linking:** Linked icon clicks to appropriate actions:
    *   `Are.na Browser` icon opens the `ChannelBrowser` window.
    *   `About` icon opens the `About` window (using the `lok-computer.png` icon).
    *   `Config` icon triggers the existing `handleOpenSettingsWindow` function (currently shows a toast).
5.  **Updated README:** Marked the 'Implement desktop icons' task as complete and added this development log entry.

### Session: Desktop Icons Refactor & Positioning (Approx. 2025-04-28)

**Objective:** Refactor desktop icon rendering into a separate component and position icons in the top-right corner, ensuring windows can move freely underneath.

**Key Changes:**

1.  **`DesktopIcons` Component:**
    *   Created `src/components/desktop/DesktopIcons.tsx`.
    *   Moved the icon definition array and rendering logic from `Desktop.tsx` to `DesktopIcons.tsx`.
    *   The component accepts `addWindow`, `handleOpenAbout`, and `handleOpenSettingsWindow` as props.
2.  **`Desktop.tsx` Refactor:**
    *   Removed the old icon logic.
    *   Imported and rendered the `<DesktopIcons />` component within the main desktop area.
    *   Passed the necessary action handlers as props to `<DesktopIcons />`.
3.  **Layout & Styling:**
    *   Positioned the `DesktopIcons` container absolutely in the top-right corner using Tailwind CSS (`absolute top-4 right-4 ... z-10`) within `DesktopIcons.tsx`.
    *   Removed padding from the main desktop area div in `Desktop.tsx`.
    *   Ensured `WindowContainer` fills the relative parent (`flex-1 relative overflow-hidden`) so windows can be dragged anywhere within that area, underneath the absolutely positioned icons.
4.  **Updated README:** Added this development log entry.

### Session: Attempted Fix for Window Content Remounting (2025-04-28)

**Objective:** Prevent window content from reloading (remounting) when minimizing/restoring windows.

**Implementation:**
- Instead of unmounting minimized windows (returning `null`), the code now keeps minimized windows in the DOM and hides them using inline styles: `visibility: hidden`, `opacity: 0`, and `pointerEvents: 'none'` on the `<Rnd>` window container.
- This was implemented in `DraggableWindow.tsx` by conditionally applying these styles when `windowProps.minimized` is true.
- The intention is to keep the React component tree (and thus internal state and effects) alive while making the window invisible and non-interactive.

**Caveat:**
- This approach may not be fully correct or robust. Some libraries (like `react-rnd`) or browser behaviors may not work well with `visibility: hidden` or `pointerEvents: none` for interactive containers. If you notice issues with minimizing/restoring or window stacking, further investigation is needed.
- A more robust solution might involve rendering minimized windows offscreen or using a dedicated minimized state container.

### Session: Restyle Window Control Buttons (2025-04-28)

**Objective:** Restyle the window minimize, maximize/restore, and close buttons to match the top bar button style.

**Implementation:**
- Updated `DraggableWindow.tsx`.
- Replaced the `window-control-button hover:bg-...` classes with `retro-button p-1` for the minimize, maximize/restore, and close buttons in the window title bar.
- This provides a consistent visual style across different button elements.

### Session: Refactor Top Bar (2025-04-28)

**Objective:** Separate the top bar UI into its own component.

**Implementation:**
- Created `src/core/TopBar.tsx`.
- Moved the JSX for the top bar (including Home, About, Featured Channels dropdown, Search, Settings, Theme Toggle buttons) from `Desktop.tsx` to `TopBar.tsx`.
- The `TopBar` component receives necessary handlers (`handleOpen...`, `toggleTheme`) and the current `theme` state as props from `Desktop.tsx`.
- Updated `Desktop.tsx` to import and render the new `<TopBar />` component.

### Session: Refactor Taskbar (2025-04-28)

**Objective:** Separate the Taskbar UI into its own component in the core directory.

**Implementation:**
- Created `src/core/Taskbar.tsx`.
- Moved the `Taskbar` component logic from `src/components/window/Taskbar.tsx` to the new file (the original file was deleted).
- Adjusted the import path for `CustomIcon` within the new `Taskbar.tsx`.
- Updated the index file `src/components/WindowManager.tsx` to re-export `Taskbar` from its new location (`@/core/Taskbar`).
- Verified that `Desktop.tsx` continues to import `Taskbar` correctly via the index file.

### Session: Remove Top Bar Buttons & Add Config App (2025-04-28)

**Objective:** Remove the Search, Settings, and Theme buttons from the TopBar and create a dedicated application for configuration, starting with theme switching.

**Implementation:**
- Removed the right-hand side buttons (Search, Settings, Theme Toggle) and their corresponding props/handlers from `TopBar.tsx`.
- Removed the unnecessary props passed to `<TopBar />` in `Desktop.tsx`.
- Created `src/apps/config/ConfigApp.tsx`.
- Added `RadioGroup` from `shadcn/ui` within `ConfigApp` to allow selecting 'Light', 'Dark', or 'System' themes.
- Used the `useTheme` hook from `next-themes` within `ConfigApp` to get and set the theme.
- Modified `handleOpenSettingsWindow` in `Desktop.tsx` to launch the `ConfigApp` component using `addWindow`.
- Corrected property names (`width`, `height`, `x`, `y`) used in the `addWindow` call.
- Ensured the 'Config' desktop icon in `DesktopIcons.tsx` correctly triggers `handleOpenSettingsWindow`.

**Fixes (Follow-up):**
- Corrected the `iconType` passed to `addWindow` for the Config App in `Desktop.tsx` from `'Settings'` to `'config'` to match the key used in `CustomIcon.tsx`, resolving missing icons in the title bar and taskbar.
- Added the missing `ThemeProvider` from `next-themes` wrapper in `App.tsx` to enable dynamic theme switching, resolving the issue where selecting a theme in the Config App didn't visually update the UI.

### Session: Arena Channel Browser Input Enhancement (Approx. 2025-04-29)

**Objective:** Enhance the Arena channel browser input to allow direct navigation to channel slugs via the Enter key or 'Go' button.

**Key Changes:**

1.  **Input Bar Navigation:**
    *   **Issue:** The input bar only filtered channel titles.
    *   **Solution:** Modified the input bar in `ChannelBrowser.tsx` to allow direct navigation to channel slugs by pressing the Enter key or clicking the 'Go' button.
    *   **Implementation:** Added a `handleGo` function that checks if the input value matches a channel slug and navigates to it if found.

2.  **Slug Browsing:**
    *   **Issue:** The input bar did not support slug browsing.
    *   **Solution:** Updated the input bar to support slug browsing by checking if the input value starts with a '/' and navigating to the corresponding channel if found.

**Updated README:** Added this development log entry.

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
