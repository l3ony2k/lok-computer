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

**Objective:** Improve current functionality.

#### Completed Enhancements:

*   [x] Search bar input support slug browsing.
*   [x] Change the not found text (channel browser).
*   [x] Windows resize don't strech icon size when icon count doesn't fill one row.
*   [x] Refactor: double click to trigger icon action.
*   [x] Blocks count in channel fix.
*   [x] Add system color mode support.
*   [x] Stylize theme switch buttons.

#### Pending Enhancements:

*   [ ] Lightbox browsing for are.na explorer.
*   [ ] Support mobile devices. Add special logic for mobile display.
    *  [x] first of all, allow user to use touchscreen to double click, click on minimize, maximize, restore, close and other actions. (Changed to single click for icons/items on mobile, window controls are single tap)
    *  on mobile, the window should take up exact width of the screen.
    *  the first window would start at x=0, y=0.
    *  the windows would stack vertically on each other, exposing the title bar of each window, (second windows start at x=0, y=height of windows title bar, third windows start at x=0, y=height of windows title bar + height of windows title bar, etc) with the topmost window being the active one, staying on the biggest y-position. so that all the windows title bars are visible.
    * when click on a not topmost window title bar, that window would be moved to the top of the stack. and would be sent to the biggest y-position.
*   [x] Add wallpaper change.
*   [ ] `localStorage` for Window positions and dimensions. remember user's open windows, windows positions and dimensions across sessions (refresh, close, reopen). 
*   [ ] Save window states (position, size, open/closed) after refresh (using `localStorage` maybe).
*   [x] Text shadow for desktop icons.
*   [ ] CommitMono font overall.
*   [x] Browser window resize to move and shrink metaphor window.
*   [ ] Allow user to move past border-b.
*   [ ] Add drop down app menu to topbar.
*   [ ] Refactor the app list and icon files. Provide a universal app list.
*   [ ] Multiple instances of the same app?
*   [ ] Make certain are.na channels open in list view.

### Phase 3: New App Development

*   **Objective:** Expand the available applications.
*   [x] Develop `Weather` app module (fetching data from an API).
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

### Session: Viewport-Aware Window Behavior (Current Date - Please fill in)

**Objective:** Ensure windows are always contained within the browser viewport, shrinking and moving as necessary when the browser resizes or when windows are interacted with.

**Key Changes & Fixes:**

1.  **Window Interface Update (`src/hooks/useWindowManager.ts`):**
    *   Added `minWidth` and `minHeight` properties to the `Window` interface.
    *   Updated `addWindow` function to initialize these properties for new windows, using default minimum dimensions.

2.  **Viewport Adjustment Logic (`src/lib/utils.ts`):**
    *   Created a new utility function `adjustWindowToViewport`.
    *   This function takes a window's current dimensions/position and minimums, along with viewport dimensions.
    *   It calculates the necessary adjustments (new position and/or size) to ensure the window fits within the viewport, respecting its minimum dimensions. It prioritizes shrinking before moving.

3.  **Integration with Window Interactions (`src/components/window/DraggableWindow.tsx`):**
    *   Modified `handleDragStop` and `handleResizeStop` (event handlers for `react-rnd`).
    *   These handlers now use `adjustWindowToViewport` to correct the window's position and size based on the dimensions of the `WindowContainer` (the parent bounds for `react-rnd`).
    *   This ensures that user-initiated drags and resizes respect the viewport constraints.

4.  **Global Browser Resize Handling (`src/core/Desktop.tsx`):**
    *   Added a global event listener for the browser's `resize` event.
    *   On resize, this handler gets the current dimensions of the `desktop-container` (the main area for windows).
    *   It then iterates through all non-maximized windows, applying `adjustWindowToViewport` using the `desktop-container`'s dimensions.
    *   If adjustments are needed, it updates the window's state using `updateWindowPosition` and/or `updateWindowDimensions`.
    *   An initial call to this handler ensures windows are correctly placed on load.

5.  **Minimum Size Propagation:**
    *   Updated calls to `addWindow` in `Desktop.tsx` to pass default `minWidth` and `minHeight` values, ensuring these are available to the windowing system from creation.

**Overall Impact:** These changes make the windowing system more robust by preventing windows from going off-screen or becoming unusably sized due to browser viewport changes. Windows now intelligently adapt to the available space.

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

### Session: Desktop Wallpaper Implementation (2025-04-29)

**Objective:** Add the ability to customize the desktop background with wallpaper images.

**Key Changes:**

1. **Centralized Settings Management:**
   * Created `src/hooks/useUserSettings.ts` with a `UserSettings` interface to store user preferences.
   * Implemented localStorage persistence to save settings between sessions.
   * Designed the hook to be extensible for future settings (like window states).

2. **CSS Structure for Wallpapers:**
   * Updated `index.css` to add a `.desktop-container` class with wallpaper support.
   * Added conditional styling with `.has-wallpaper` class to show custom backgrounds.
   * Created a fallback pattern for when no wallpaper is set.
   * Used CSS variables to dynamically set the wallpaper URL.

3. **Desktop Component Update:**
   * Modified `Desktop.tsx` to use the `useUserSettings` hook.
   * Added an effect to set the CSS variable based on the selected wallpaper.
   * Applied conditional CSS classes to the desktop container.
   * Updated the Config window dimensions to accommodate the new wallpaper settings UI.

4. **Config App Enhancement:**
   * Extended `ConfigApp.tsx` to add a wallpaper selection section.
   * Added a set of predefined wallpaper options with thumbnails.
   * Implemented a custom URL input for user-provided wallpapers.
   * Created a preview of the currently selected wallpaper.
   * Added a reset button to return to the default pattern background.

### Session: Touch Interaction Improvements (Current Date - Please fill in)

**Objective:** Enhance touch screen support for desktop icons, window control buttons, and Are.na browser items, making interactions more intuitive on mobile.

**Key Changes & Fixes:**

1.  **Desktop Icon Double-Tap/Single-Tap (`src/hooks/useDoubleClick.ts`, `src/components/desktop/DesktopIcons.tsx`):**
    *   Logic within the `useDoubleClick` hook was reviewed and confirmed to handle both `MouseEvent` and `TouchEvent` types, with correct differentiation between single and double clicks/taps.
    *   In `DesktopIcons.tsx`, integrated `useIsMobile` hook. On mobile devices, desktop icons now trigger their action on a **single tap**. On desktop, they retain the double-click behavior.
    *   **Fix:** Corrected a conditional hook call (`useDoubleClick`) within the mapping logic to comply with the Rules of Hooks, preventing a "Rendered fewer hooks" error. The hook is now called unconditionally, and its result is used conditionally.

2.  **Window Control Buttons (`src/components/window/DraggableWindow.tsx`):**
    *   Added `onTouchEnd` handlers to the minimize, maximize/restore, and close buttons, mirroring `onClick` logic. This was done in a previous step to improve reliability on touch for these controls (actions on single tap).

3.  **Are.na Channel Browser & Explorer Items (`src/apps/arena/channels/ChannelBrowser.tsx`, `src/apps/arena/channels/ChannelExplorer.tsx`):**
    *   Integrated the `useIsMobile` hook in both `ChannelBrowser` and `ChannelExplorer` components.
    *   Modified the item components (`ChannelItem`, `ChannelItemListView`, `ContentItemGrid`, `ContentItemListView`) within these browsers.
    *   On mobile devices, clicking/tapping an item (channel, block, or sub-channel) now triggers its action on a **single tap**.
    *   On desktop, these items retain their double-click behavior to perform actions.
    *   **Fix:** Corrected conditional hook calls (`useDoubleClick`) within the item components in both files to comply with the Rules of Hooks. The hook is now called unconditionally per item, and its result is used conditionally based on whether the view is mobile or desktop.

**Overall Impact:** These changes aim to provide a more conventional and responsive touch experience on mobile devices by switching from double-tap to single-tap for primary actions on icons and list items, while preserving the existing desktop interaction model. The hook-related fixes ensure stability and adherence to React best practices.

**Testing Notes:**
*   **Mobile:** Verify desktop icons, channels in Are.na browser, and items (blocks/sub-channels) in Are.na explorer open/activate with a single tap.
*   **Mobile:** Confirm window control buttons (minimize, maximize, close) work with a single tap.
*   **Desktop:** Verify desktop icons and Are.na browser/explorer items still require a double-click to activate.
*   **Desktop:** Confirm window control buttons work as expected with a single click.
*   Ensure that normal window dragging via the title bar is unaffected on both platforms.
*   Confirm the "Rendered fewer hooks than expected" error no longer occurs when resizing the browser window across the mobile breakpoint or on initial load.

### Session: Weather App Implementation (2025-04-30)

**Objective:** Implement a basic Weather app using the wttr.in API, following the existing design patterns of the application.

**Key Changes:**

1. **Weather API Integration:**
   * Created `src/apps/weather/WeatherApp.tsx` to display weather information using the wttr.in API.
   * Implemented a search bar to allow users to check weather for different locations.
   * Added automatic user geolocation detection for the initial weather display.
   * Used format=4 for the wttr.in API to get a clean ASCII art weather representation.

2. **UI Components:**
   * Created a toolbar with a search input field and search button using the existing style patterns.
   * Added a weather content display area with location information and formatted weather data.
   * Implemented loading and error states with appropriate user feedback.
   * Used `window-content-area` class for consistent scrollbar styling and content display.

3. **Desktop Integration:**
   * Added weather.png icon to `CustomIcon.tsx` component for consistent iconography.
   * Added a Weather app icon to the desktop in `DesktopIcons.tsx`.
   * Configured the Weather app to open in an appropriately sized window.

**Overall Impact:** This addition completes one of the goals from the Phase 3 roadmap, providing users with quick access to weather information through the desktop environment. The implementation maintains consistency with the existing UI patterns and interaction models.

### Session: Arena App DRY Refactoring (2025-05-02)

**Objective:** Refactor the Arena app components to improve DRY principles and code organization without changing user-facing functionality.

**Key Changes:**

1. **Shared Component Extraction:**
   * Created `src/apps/arena/utils/contentItems.tsx` to house shared component logic.
   * Moved duplicated components like `ContentItemGrid` and `ContentItemListView` to this shared file.
   * Added helper functions like `getItemTitle` and `getGridConfiguration` for consistent behavior.

2. **ChannelBrowser Refactoring:**
   * Updated to use the shared components from `contentItems.tsx`.
   * Removed redundant styling calculations in favor of the shared `getGridConfiguration` function.
   * Improved type safety by using consistent component interfaces.

3. **ChannelExplorer Refactoring:**
   * Converted to use the shared components and utilities.
   * Made error and loading states more consistent.
   * Removed duplicated rendering logic.

4. **BlockViewer Improvements:**
   * Refactored the block rendering logic using a type-based dictionary approach.
   * Extracted helper functions like `getImageSource` for better organization.
   * Created a dedicated shared renderer for Media and Attachment types.
   * Improved typings for image objects.

These changes have significantly reduced code duplication across the Arena app while maintaining all existing functionality. The new structure is more maintainable and consistent, with clearer separation of concerns between components.

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

## Acknowledgments

*   CommitMono: https://commitmono.com/
*   Websites That Look Like Desktops: https://www.are.na/lucy-pham/websites-that-look-like-desktops-xr4dhvkxeym
*   Are.na: https://are.na/
*   Windsurf: https://windsurf.com/
