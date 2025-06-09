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
*   [x] Add "Talk to AI" chat interface app with dummy responses.

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
*   [/] Develop `Bsky Posts` app module (getting latest posts from Bluesky with image viewer).
*   [x] Develop `Console` app module (displays console.log, .error, .warn, .info messages from the application).
*   [ ] Develop `Status` app module (showing latest status log from status.lol).
*   [ ] Develop `Guestbook` app module (allow users to leave messages).
*   [ ] Develop `Mailto` app module (iframe of mailbird.co).
*   [ ] Develop `Shelf` app module (showing my movies, series, books, music, etc from neodb.social).
*   [x] Develop `Link Web` app module (visualizing links/connections).
*   [x] Develop `Browser` app module (basic iframe-based browser).
*   [x] Develop `Talk to AI` app module (chat interface with dummy responses).

### Phase 4: Persistence & Polish

*   **Objective:** Improve usability and robustness.
*   [ ] Persist window states (position, size, open/closed) using `localStorage`.
*   [ ] Add unit and integration tests.
*   [ ] Refine UI/UX across the shell and apps.
*   [ ] Optimize performance.
*   [ ] Configure deployment (e.g., using Netlify, Vercel).

## Development Log

### Session: Bsky Posts App - Date Formatting & Image Viewer (Current Date - Please fill in)

**Objective:** Finalize date/time display for posts and implement image viewing functionality for the Bsky Posts app.

**Implementation Details:**

1.  **Date/Time Formatting:**
    *   Verified that the existing helper functions (`formatDateToISO` and `formatTimeTo24H`) in `src/apps/bsky/BskyPostsApp.tsx` correctly format the post creation date as "YYYY-MM-DD HH:MM" (24-hour format), matching the style used in `TopBar.tsx`. No changes were needed.

2.  **Image Viewer Functionality:**
    *   **`ImageViewerApp.tsx` Creation:**
        *   Created a new component `src/apps/imageviewer/ImageViewerApp.tsx`.
        *   This component accepts `imageUrl` and `altText` props.
        *   It displays the provided image, centered within the app window, using a `bg-neutral-900` background.
    *   **`BskyPostsApp.tsx` Integration:**
        *   The `DisplayPost` interface already included an optional `images` array (`PostImage[]`).
        *   The `fetchPostsInternal` function was already correctly extracting image data (thumbnail, fullsize URL, alt text) from the Bluesky API response for posts with embedded images (`AppBskyEmbedImages.isView`).
        *   Image thumbnails are rendered within each post if images are present.
        *   A `handleOpenImageViewer` function was already in place, which uses the `useWindowManager` hook's `addWindow` method.
        *   Clicking an image thumbnail in `BskyPostsApp.tsx` now opens the `ImageViewerApp` in a new window. The window is titled "Image Viewer" and uses the 'image' `iconType`.
    *   **Icon Configuration:**
        *   Verified that `src/components/window/CustomIcon.tsx` already defines an 'image' `iconType` and maps it to an appropriate icon (`image.png`), so no changes were required for the image viewer window icon.

**Overall Impact:** Users can now see the creation date and time for Bluesky posts in a consistent format. If posts contain images, thumbnails are displayed, and clicking a thumbnail opens the full-size image in a dedicated, resizable image viewer window.

### Session: Web Browser App Implementation (Current Date)

**Objective:** Create a new Web Browser application capable of browsing websites within an iframe.

**Implementation Details:**

1.  **`WebBrowser.tsx` Creation:**
    *   Created a new component `src/apps/web/WebBrowser.tsx`.
    *   The component uses `ArenaWindowLayout` for a consistent window structure.
    *   It includes an `iframe` to render web content.
2.  **Toolbar & Controls:**
    *   Implemented a toolbar with:
        *   Backward and Forward navigation buttons (with SVG icons).
        *   Refresh button (with SVG icon).
        *   A URL input field.
        *   A "Go" button to load the URL.
    *   Styling for these elements is similar to `ChannelBrowser.tsx`.
3.  **Functionality:**
    *   **URL Handling:** Input URLs are sanitized (prefixed with `https://` if no protocol is present).
    *   **Navigation:** The "Go" button or pressing Enter in the URL bar loads the sanitized URL into the iframe.
    *   **History:** A simple history stack is maintained for back/forward functionality.
    *   **Refresh:** The refresh button reloads the current iframe content.
    *   **State Management:** Uses React state for `currentUrlInput`, `iframeSrc`, `history`, and `historyIndex`.
    *   **Iframe Sandbox:** Configured with common `sandbox` attributes to allow most functionalities while maintaining some security.
4.  **Initial URL:** Defaults to Google, but can be configured via the `initialUrl` prop.

**Overall Impact:** Users can now open a basic web browser within the application to navigate websites. This adds a versatile tool to the desktop environment.

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
- Corrected the `iconType` passed to `addWindow` for the Config App in `

### Session: ChannelExplorer Performance Optimization (Current Date)

**Objective:** Fix performance issues in the ChannelExplorer component where windows with large content would move slowly during dragging.

**Implementation Details:**

1. **Virtualization Implementation:**
   * Added `react-window` and `react-virtualized-auto-sizer` for efficient rendering
   * Implemented `FixedSizeGrid` for grid view and `FixedSizeList` for list view
   * Only renders items currently visible in the viewport

2. **Component Optimization:**
   * Created memoized versions of content item components using `React.memo`
   * Separated grid and list content into dedicated components
   * Improved grid calculations for better layout management

3. **Type Safety:**
   * Added proper TypeScript interfaces for all components
   * Fixed type issues with grid dimensions and item widths
   * Ensured compatibility with existing ContentItem components

**Impact:**
* Significantly improved window dragging performance with large content
* Reduced memory usage and DOM element count
* Maintained existing functionality while improving efficiency

### Session: Console App Enhancements (Current Date)

**Objective:** Enhance the Console app with collapsible log entries, command input functionality, comprehensive app logging, and fun easter eggs.

**Implementation Details:**

1. **Console App Improvements:**
   - Added collapsible log entries (shows first 10 lines with expand/collapse toggle)
   - Implemented interactive command system with command history (up/down arrow keys)
   - Added functional commands:
     - `help`: Show available commands with usage
     - `clear`: Clear console output
     - `apps list`: List all available applications
     - `apps open <app>`: Open a specific application
     - `apps close <app>`: Close a specific application window
     - `theme get`: Show current theme
     - `theme set <theme>`: Set theme to light/dark/system
     - `theme toggle`: Toggle between light/dark
     - `status`: Show system status (time, theme, open windows, etc.)

2. **Enhanced App Logging:**
   - Added comprehensive logging to Weather app:
     - Weather data fetching status
     - Search queries and results
     - Error handling
   - Added logging to About app:
     - App lifecycle events
     - Tab changes
     - Image loading status

3. **Easter Eggs:**
   - Added simulated system deletion for dangerous commands:
     - Triggers on commands like `rm -rf`, `format`, `deltree`
     - Shows fake deletion progress of critical system paths
     - Includes dramatic screen blackout effect
     - Ends with a friendly reminder about command safety
   - Changed console header to show `guest@lok.computer`

**Overall Impact:** The Console app now provides a fully functional command-line interface for managing the desktop environment, with proper command parsing, error handling, command history support, and fun interactive elements that enhance the user experience while subtly teaching command safety.

### Session: Console App Implementation (Current Date)

**Objective:** Create a new Console application to display internal application logs (console.log, console.error, etc.) within the desktop environment.

**Implementation Details:**

1.  **`ConsoleApp.tsx` Creation (`src/apps/console/ConsoleApp.tsx`):**
    *   Created a new React component for the Console application.
    *   **Log Capture:** Overrides global `console.log`, `console.error`, `console.warn`, and `console.info` functions.
        *   Captured messages are stored in the component's state.
        *   Original console functions are still called to ensure messages also appear in the browser's developer console.
    *   **Display:**
        *   Logs are displayed with a timestamp, log type, and the message content.
        *   Different colors are used for different log types (e.g., red for errors, yellow for warnings).
        *   Object messages are stringified using `JSON.stringify`.
        *   The log area automatically scrolls to the latest message.
    *   **Styling:** Styled to resemble a traditional terminal/console with a dark background and monospace font.
        *   Includes a header "Console Output" and a disabled input field at the bottom for aesthetics.
2.  **App Configuration (`src/config/apps.tsx`):**
    *   Added a new entry to the `APP_LIST` for the "Console" app.
    *   Specified `ConsoleApp` as the component, `console` as the `iconType` (expecting a `console.png`), and default dimensions (700x400).
3.  **Icon Integration:**
    *   The `iconType: "console"` will be mapped to `console.png` by the `CustomIcon` component (assuming `console.png` is added to the appropriate assets/public directory and `CustomIcon.tsx` is updated if necessary to recognize this new type, or if it dynamically loads based on `iconType` string).
4.  **Accessibility:** The Console app is automatically available via Desktop Icons and the App Menu in the TopBar, as these components iterate over `APP_LIST`.

**Overall Impact:** Users can now open a Console window to view internal application logs, aiding in development and debugging. The console captures various log levels and displays them in a user-friendly, styled interface.

### Session: Fixed Console App Titlebar Clipping Issue (Current Date)

**Objective:** Fix an issue where the ConsoleApp's window titlebar appeared visually clipped or shorter than other app windows.

**Issue Analysis:**
- The `ConsoleApp` caused its window titlebar to appear visually clipped after initialization
- This was traced to the `scrollIntoView({ behavior: 'smooth' })` auto-scroll implementation
- The smooth scrolling animation was causing layout shifts affecting the parent window container

**Implementation:**
1. Modified the auto-scroll method in `ConsoleApp.tsx`:
   - Replaced `scrollIntoView({ behavior: 'smooth' })` with direct `scrollContainer.scrollTop = scrollContainer.scrollHeight`
   - This maintains the functionality of auto-scrolling to the latest log entry
   - But avoids the layout shifts that were causing the titlebar to appear clipped

**Broader Implications:**
- Similar issues could occur in other components that use smooth scrolling in windowed contexts
- Animated scrolling behaviors can have unexpected effects on parent container layout
- When implementing auto-scroll in windowed components, prefer direct `scrollTop` manipulation over animated `scrollIntoView`

**Testing:**
- Verified that the ConsoleApp window now maintains proper titlebar height consistent with other app windows
- Confirmed auto-scroll functionality still works correctly

### Session: AI Chat Implementation (Approx. 2025-04-29)

**Objective:** Transform the dummy Talk to AI app into a fully functional AI chatbot with persistent history and OpenAI-compatible API integration.

**Key Changes:**

1. **Worker.js Updates:**
   - Added new `/api/chat` endpoint that forwards requests to OpenAI-compatible API
   - Implemented proper error handling and response formatting
   - Added environment variable support for AI_BASE_URL and AI_API_KEY

2. **TalkToAI Component Enhancements:**
   - Added localStorage integration for persistent chat history
   - Implemented message history limit (10 messages) for API requests
   - Added loading states and error handling with toast notifications
   - Added clear chat history functionality
   - Improved UI with loading states and disabled states during API calls

3. **Features Added:**
   - [x] Persistent chat history using localStorage
   - [x] Integration with OpenAI-compatible API endpoint
   - [x] Clear chat history button
   - [x] Loading states and error handling
   - [x] Message history limit for API requests

4. **Technical Details:**
   - Uses environment variables in Cloudflare Worker for API configuration
   - Implements proper message format conversion for OpenAI API
   - Maintains chat history up to 10 rounds for context
   - Provides user feedback for all operations with toast notifications

### Session: Guestbook App Implementation (Current Date)

**Objective:** Add a new "Guestbook" application that embeds a functional guestbook service while maintaining the project's styling consistency.

**Implementation Details:**

1. **`GuestbookApp.tsx` Creation (`src/apps/guestbook/GuestbookApp.tsx`):**
   - Created a new React component for the Guestbook application
   - **Script Integration:** Dynamically loads the external guestbook JavaScript from `guestbooks.meadow.cafe`
   - **Proper Cleanup:** Removes the script when component unmounts to prevent memory leaks
   - **Form Styling:** Adapts the original guestbook HTML to use project's CSS classes:
     - Uses `search-input` class for input fields and textarea
     - Uses `retro-button` class for the submit button
     - Applies project's color scheme and spacing patterns
   - **Required Elements Preserved:** Maintains all required IDs and name attributes as specified in the documentation

2. **Icon Integration:**
   - Added `mail.png` icon import to `CustomIcon.tsx`
   - Created `mail` iconType mapping for the guestbook app

3. **App Configuration (`src/config/apps.tsx`):**
   - Added new entry to `APP_LIST` for "Guestbook" app
   - Set appropriate default window dimensions (500x600)
   - Configured to use the `mail` icon type

4. **Styling Consistency:**
   - Preserved all original guestbook functionality while adapting visual appearance
   - Used project's form input styling (`search-input`) and button styling (`retro-button`)
   - Applied consistent spacing, colors, and typography
   - Maintained responsive layout with max-width container

**Key Features:**
- Functional guestbook form with name, website, and message fields
- Dynamic loading and cleanup of external guestbook script
- Consistent styling with the rest of the lok.computer interface
- Proper error handling display area
- Messages display section that populates via the external script

**Overall Impact:** Users can now access a fully functional guestbook that allows visitors to leave messages, while the interface seamlessly integrates with the project's retro computer aesthetic.