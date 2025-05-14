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
*   [x] Add drop down app menu to topbar.
*   [x] Add calendar flyout to topbar time display.
*   [x] Add analog clock to calendar flyout.
*   [x] Refactor the app list and icon files. Provide a universal app list.
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

### Session: Arena Channel Explorer Sorting (Current Date)

**Objective:** Ensure blocks in the Arena Channel Explorer are properly sorted by position in descending order (newest first).

**Implementation:**
- Verified that the sorting logic was already implemented in `ChannelExplorer.tsx` but was missing from the documentation.
- The component sorts content by the `position` property in descending order (highest position values first).
- This sorting ensures that newer blocks appear at the beginning of the list, with older blocks (or manually repositioned blocks) appearing later.
- Sorting is applied after all content is fetched from the API, ensuring a consistent display order regardless of pagination.

**Technical Details:**
- The sorting is implemented using JavaScript's native `Array.sort()` method with a comparison function.
- The comparison function handles potential undefined position values by defaulting to 0.
- The sort is performed before setting the content state: `allContents.sort((a, b) => (b.position || 0) - (a.position || 0))`

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
    *   **Implementation:** Added a `

### Session: App Menu Implementation (2025-04-30)

**Objective:** Add a dropdown app menu to the topbar when clicking on "lok.computer" text.

**Key Changes:**

1. **New Components:**
   * Created `src/components/menu/AppMenu.tsx` to handle the dropdown menu UI and logic.
   * Menu has consistent styling with the rest of the UI, using the retro-taskbar background color and accent hover effects.

2. **TopBar Enhancements:**
   * Modified `src/core/TopBar.tsx` to make "lok.computer" text clickable and toggle the app menu.
   * Added state management for the menu's open/closed status.
   * Created app launching functions for each app (Arena Browser, About, Weather, Config).

3. **Integration:**
   * Updated `src/core/Desktop.tsx` to pass the `addWindow` function to `TopBar`.
   * Ensured the menu displays with a high z-index (50) to appear above other elements.
   * Implemented click-outside behavior to dismiss the menu.

4. **Styling:**
   * Used the same styling as the rest of the application (retro-taskbar background, accent color for hover states).
   * Made text color consistent with the dark/light mode themes.
   * Positioned the menu to align properly with the topbar.

**Result:** Users can now click on "lok.computer" in the topbar to access a dropdown menu of available applications, providing an alternative to the desktop icons for launching apps.

### Session: Calendar Flyout Implementation (2025-04-30)

**Objective:** Add a calendar flyout to the topbar when clicking on the date/time text in the top-right corner.

**Key Changes:**

1. **New Components:**
   * Created `src/components/calendar/Calendar.tsx` to display a simple month calendar view.
   * Calendar shows the current month with days of the week, highlighting the current day.

2. **TopBar Enhancements:**
   * Modified `src/core/TopBar.tsx` to make the date and time display clickable.
   * Added state management for the calendar's open/closed status.
   * Created toggle functionality that also closes the app menu if it's open.

3. **Integration:**
   * Added the `<Calendar />` component to `TopBar`, passing the current date.
   * Ensured the calendar displays with a high z-index (10000) to appear above other elements.
   * Implemented click-outside behavior to dismiss the calendar.

4. **Styling:**
   * Used the same styling as the rest of the application (retro-taskbar background, accent color for current day highlight).
   * Made text color consistent with the dark/light mode themes.
   * Positioned the calendar to align with the right side of the topbar.

**Result:** Users can now click on the date/time display in the topbar to view a calendar showing the current month, providing a quick reference for dates without opening a separate calendar application.

### Session: Analog Clock Implementation (2025-04-30)

**Objective:** Add an analog clock to the calendar flyout that displays the current time with hour, minute, and second hands.

**Key Changes:**

1. **Enhanced Calendar Component:**
   * Modified `src/components/calendar/Calendar.tsx` to include an analog clock above the month display.
   * Implemented the clock using SVG for precise rendering and smooth animation.
   * Added minute marks around the clock face with thicker marks at hour positions (every 5 minutes).

2. **Real-time Animation:**
   * Added state to track the current time using `useState`.
   * Implemented `useEffect` with a 1-second interval to update the clock hands in real time.
   * Calculated precise angles for each hand: 
     - Hour hand (takes minutes into account for smooth movement)
     - Minute hand (takes seconds into account for smooth movement)
     - Second hand (moves in 6-degree increments)

3. **Minimal Styling:**
   * Used clean lines with appropriate thickness hierarchy (hour hand thickest, second hand thinnest).
   * Made the second hand accent-colored to distinguish it and add visual interest.
   * Ensured dark/light mode compatibility with appropriate text colors.
   * Created a subtle hour/minute distinction for the clock marks.

**Result:** The calendar flyout now features a visually appealing analog clock that displays the current time with smooth-moving hands, enhancing the overall aesthetic and functionality of the interface.

### Session: Text Selection Fix for UI Elements (2025-05-01)

**Objective:** Fix issues with text selection in UI elements, particularly in the Calendar component where text highlighting was interfering with dragging and clicking interactions.

**Key Changes:**

1. **CSS Selection Prevention:**
   * Added the Tailwind `select-none` class to interactive elements throughout the Calendar component.
   * Applied to calendar day cells, day name headers, month/year display, and the analog clock container.

2. **Implementation Details:**
   * Modified `src/components/calendar/Calendar.tsx` to include `select-none` class on:
     - The main calendar container div
     - The clock container div
     - The month/year display text
     - Day name header cells
     - Calendar day cells

3. **Benefits:**
   * Prevents accidental text selection when users interact with the calendar
   * Makes the UI feel more like a native application rather than a webpage
   * Maintains all clickable functionality while improving the user experience

**Result:** The calendar and other UI elements now have a more polished, app-like feel with no unwanted text selection when users click or drag interface elements.

### Session: Comprehensive Text Selection Control (2025-05-01)

**Objective:** Apply a consistent text selection strategy across the entire application, making UI elements non-selectable while keeping content areas selectable.

**Key Changes:**

1. **Global UI Components:**
   * Applied `select-none` to all interaction elements in `src/index.css`, including:
     - Taskbar and taskbar buttons
     - Window title bars
     - Folder items, icons, and names
     - All retro-style buttons

2. **Desktop Environment:**
   * Added `select-none` to:
     - Desktop icons and their container
     - TopBar elements including menu buttons and date/time display
     - App menu items
     - Arena content item grids and lists

3. **Smart Selection in Content Areas:**
   * Added `select-text` to content areas where text selection is desirable:
     - Block content in `BlockViewer.tsx` (while keeping metadata non-selectable)
     - Text content in `About.tsx` (while keeping version information non-selectable)
     - Other content-focused areas

4. **Component-Specific Updates:**
   * Updated `ArenaWindowLayout.tsx` to make the toolbar non-selectable
   * Made icon images non-selectable while keeping their associated text selectable when appropriate

**Result:** The application now has a more native app-like feel with no accidental text selection when users interact with UI elements, while still allowing selection in content areas where it's expected and useful.

### Session: Enhanced Text Selection Styling (2025-05-02)

**Objective:** Implement a universal, visually consistent text selection style across the application for better readability and UI consistency.

**Key Changes:**

1. **Universal Selection Styling:**
   * Added custom `::selection` and `::-moz-selection` CSS rules in `src/index.css`
   * Used the application's accent color as the selection background
   * Used accent-foreground color for selected text, creating a clean contrast

2. **Implementation Details:**
   * Added the following CSS rules:
     ```css
     ::selection {
       background-color: hsl(var(--accent));
       color: hsl(var(--accent-foreground));
     }
     
     ::-moz-selection {
       background-color: hsl(var(--accent));
       color: hsl(var(--accent-foreground));
     }
     ```
   * This leverages the application's existing design tokens for visual consistency

3. **Benefits:**
   * Creates a consistent, branded look for text selection across the entire application
   * Improves readability of selected text with appropriate contrast
   * Maintains the application's visual language and design system

**Result:** Text selection now has a polished, consistent appearance that aligns with the application's design aesthetic while maintaining good readability and visual hierarchy.