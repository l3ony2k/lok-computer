# Development log

Session-by-session engineering notes, newest first. The short, user-facing release notes live in `src/apps/about/changelog.ts` (shown in About › Changelog); this file keeps the detail: what changed, where, and why.

Add an entry here for every version bump.

### Session: 3.1.8 — Palm on a desk, BeOS type, attention blink (2026-10-12)

*   **Attention blink** (`useWindowManager`, `DraggableWindow`): a single-instance launch that lands on a shaded window stamps `attention` on it (not persisted); the window drops `data-active` for three off phases under `data-attention`, so every theme's inactive title bar is the flash and the lok theme inverts its bar.
*   **Overlay root** (`src/lib/overlayRoot.ts`): menus, the calendar flyout, the launcher and context menus portal into `[data-overlay-root="contained"]` when the desktop sets it (the palm layout) and into the body otherwise; the Palm stylesheet gives `.desktop-root` `contain: layout paint` and `container-type: size`, so on a large screen the overlays open inside the phone frame and their `cq` units measure it. Context menus convert pointer coordinates into the root's space and clamp to its bounds.
*   **Submenus positioned fixed** (`MenuItems.tsx`): a nested list is placed against the overlay root from its item's rectangle (beside it, flipped to the left when there is no room, flush with the far edge over its parent when there is none on either side, bottom-aligned in a menu that rises from the taskbar). Inside the scrolling Applications list the absolute submenu used to be clipped, and the list scrolled sideways to show it. The Windows 7 start menu's `backdrop-filter` moved onto a `::before` layer: a filter makes its element the containing block for fixed descendants.
*   **Handheld confirmation** (`ThemePicker`): on a screen that frames Palm (`PALM_FRAME_QUERY` in `theme.ts`, the same query as the stylesheet) picking it opens a small `.system-dialog` (Escape or "Keep <theme>" cancels, "Switch to Palm" applies); on a phone it switches at once.
*   **Palm polish**: solid black scrollbar thumbs flush with the track's divider line, pixel arrow buttons, a vertical divider on vertical tracks and a horizontal one on horizontal tracks (one line used to serve both), placeholder text in the muted grey, `.config-segmented` buttons that keep 84px while there is room and shrink equally before the row overflows (Large was clipped), and the tab bar scrolls with the wheel through the new `useWheelScroll` hook that the taskbar now shares.
*   **BeOS fonts** (`src/themes/beos/fonts/`): "Swis721 BT Coverage" (regular, bold, italic, bold italic) and "ProFont Coverage", the variable fonts beos-css traced from the BeOS R5 screen fonts ((C) Be Inc., optical size 9–12). Each glyph is a COLRv0 stack whose full pixels follow the text colour and whose edge pixels are palette entries at falling opacity; `--be-light` recolours the edges for the Deskbar leaf and the desktop labels. Font smoothing off, like the 98 theme.
*   **Calendar flyout**: the analog clock is a button that opens the Clock app and closes the flyout.

### Session: 3.1.7 — shade in place (2026-10-12)

*   **Shade animation on the real frame** (`WindowTransitionProvider`): the ghost stood in for the window with its own simplified title bar (icon and title, generic height, no controls) while the real frame was hidden, which is fine for a box flying to the taskbar but visible as a swap when the box sits exactly on the window. Shade and unshade now tween the real surface's height with the Web Animations API, the content area pinned to its height and clipped so the app does not reflow, and on BeOS the tab width (with its `max-width` lifted for the duration, since the cap clamped the tween short of the full width). The state flips in the same task as the measurements, through `flushSync`: at the end of a shade, at the start of an unshade (the shaded geometry is measured by trialling the `is-shaded` class before committing). Minimize and restore keep the ghost.

### Session: 3.1.6 — shade animation, themed list headings, pips (2026-10-12)

*   **Shade animation** (`useWindowTransitions`, `WindowTransitionProvider`, `WindowContainer`): shading and unshading animate like minimize and restore (first through the ghost; 3.1.7 moves it onto the real frame). Reduced motion skips it like the others.
*   **BeOS shaded tab**: a shaded window's tab spans the full frame (`[data-shaded]` on the surface), so the tab can be dragged to either edge instead of stopping where the hidden body would.
*   **Stacking audit** (`useWindowManager`): `focusWindow` read stack membership from a snapshot taken before the pending update, so a focus queued right after `stackWindow` raised the old stack and could leave a third window between the two tabs; membership is now read inside the updater. Stacks dissolve whenever the active theme has no `tabStacking`, on theme change and on session restore. Minimized members keep membership and share group moves and resizes, so they come back aligned.
*   **List headings** (`classic.css`, each skin): the heading cell carries the theme's header tokens and a per-theme header height, and the sort button is a transparent full-bleed hit area, so the heading no longer looks like a small button inside a taller cell. Hover, active-sort and pressed states move to the cell. 7: white gradient with column separators; XP: flat with the 3px base; 98: raised bevel edge to edge; System: thin white band; TUI: blue bar, white text; Palm: bordered cells; BeOS: raised gray strip.
*   **Dice and cards** (`src/apps/chance/`): six-sided dice draw pips on a 3×3 grid, ivory with black spots and a red one and four; other dice keep their number. A Jokers checkbox adds a red and a black joker (toggling deals a fresh deck). The history wraps into rows that fill the empty space under the hand and scrolls vertically inside the window; readouts share the buttons' border colour.
*   **Typed answers** (`AskAiApp`): the planner's `answer` card runs the typing hook over its paragraphs (faster than the summary), cursor on the paragraph being typed, note and meta once the last character lands; restored runs show at once, and screen readers get the full text once.
*   **Submenus on phones** (`MenuItems`): a flyout flips from its item's edge and, when neither side fits, slides back over its parent until it does. A touch-opened submenu ignores the mouse-leave Android fires after a tap (iPhones keep the hover state, which hid the bug there).
*   **Taskbars** (`useScrollFade`, `Taskbar`, `PalmBar`): a scrolling task strip fades the edge its content runs past (left, right or both) in every theme and on the Palm tab bar; the start button keeps its size however many tasks crowd the strip (7's orb stays a 40×38 circle on a phone). Palm's buttons, tabs, tasks and close box are square.
*   **7 glass**: the sheen gradient used percentage stops, which put a hard highlight edge at 41% of the frame's height; invisible behind content on a tall window, it cut across the title bar of a 38px shaded frame. Pixel stops keep the gloss on the title bar at any height. The context-menu icon gutter line no longer applies to the launcher list.

### Session: 3.1.5 — BeOS tab stacking, planner answers, phone polish (2026-10-12)

Fixes from the first day on phones with 3.1.4.

*   **BeOS tab stacking** (`src/lib/windowStacks.ts`, `useWindowManager`, `DraggableWindow`): after Haiku's Stack & Tile. A window carries an optional `stack` id and a `stackedAt` join time; `stackWindow(id, target)` copies the target's bounds and joins, `unstackWindow` leaves (a stack of one dissolves), `updateStackBounds` moves or resizes every member, and `focusWindow` raises the whole stack with the focused window on top. `DraggableWindow`, only under a theme with `tabStacking` (BeOS), hit-tests the pointer against the other windows' tabs while dragging (`elementsFromPoint`; the target lights up), stacks on drop, drags the stack along through inline transforms on the siblings until the drop commits, and detaches on Shift-drag or the window menu's "Detach from stack". Each stacked tab reports its width through a tiny external store and sits after the widths of the tabs before it (`useStackTabOffset`); tabs cap at `(100% - 24px) / N`. The BeOS stylesheet makes the frame and surface `pointer-events: none` with the tab, body and resize handles `auto`, so presses beside a tab reach the tabs of the windows under it; the setup dialog reuses the surface classes, so the rule is scoped to `.draggable-window`. Membership persists with the session.
*   **Planner answers** (`jev.js`, `worker.js`, `src/apps/ask-ai/`): a fourth planner outcome, `answer`, with `text` (plain prose, blank-line paragraphs, up to 4000 characters) and a `note` on why Jev did not judge it; the prompt asks for it wherever it used to refuse (writing, explaining, interpreting, arithmetic), and `refuse` is kept for empty or disallowed questions. `normalizePlannerReply` tells it from a plan by `text` being a string (a plan's `answer` is its primary question). The app renders it as an "Answer · Planner" card with the planner meta; the OpenAPI document gains `JevDirectAnswer`.
*   **Focus rings** (`src/lib/inputModality.ts`): browsers match `:focus-visible` on text fields even after a click, so every theme drew its ring over a field the person had just tapped. The root now carries `data-input="keyboard" | "pointer"` (Tab and the arrow keys set keyboard, any pointer press sets pointer), and a base rule with two `:not(#_)` hides field rings outside keyboard mode in every skin.
*   **Field heights**: in classic skins a field beside buttons (toolbar and footer rows, joined controls) takes `--c-control-height` instead of the shorter field height (98 and XP fields were 2px short of their buttons), and the Ask AI composer is exactly one control tall on one line (`line-height: control − 2px`, no vertical padding, outranking the skin padding) and grows from there.
*   **Phones**: `viewport-fit=cover` with `--safe-top`/`--safe-bottom` tokens; the lok top bar, the classic menu bar (`border-top` in the inset, so the bar's background paints under the status bar), the classic taskbar (`border-bottom`), the Palm bar and tab bar, and the popups anchored to them all account for the insets; the classic layout pads the desktop root instead. `themeColor` is now the colour at the top of the page (Palm black, BeOS the Deskbar gray) so the status bar blends into the bar. Palm's fixed 84×72 icon cell is gone; the size tokens apply, so large icons keep their labels.
*   **Chance cards**: ivory face, black or red ink (`#c8102e`) in every theme instead of the error token (black on Palm); draws accumulate, the latest large and earlier ones in a horizontal strip of small cards, with Clear (keeps the deck) and Shuffle (fresh deck).
*   **Cold boot**: a fresh install (an installed app has its own storage) downloaded all 2 MB of chunks and images before the desktop showed. The boot now waits at most 6 s for modules and 4 s for assets, marks them "loading in the background", and the warm-up finishes behind the desktop, where the service worker still keeps it.

### Session: 3.1.4 — service worker, Palm layout (2026-10-11)

Last of the four 3.1 releases.

*   **Service worker** (`src/sw/service-worker.js`, built into `/sw.js` by the `lok-service-worker` plugin in `vite.config.ts`): the plugin fills in the version, the shell to precache (`/`, the entry chunk and its stylesheet, the manifest and icons) and the list of every hashed asset of the build. Navigations are network-first with the cached shell as the offline fallback; `/assets/*` is cache-first (hashed and immutable; a new worker prunes files its build no longer ships); `/api/*`, `/system-version.json` and `/sw.js` are never cached, so the update monitor sees the real version and `rebootSystem` (which already unregistered workers and cleared caches) always starts clean. The boot screen's warm-up of every app chunk and local asset now fills the cache, so one visit makes the whole desktop available offline; `src/lib/serviceWorker.ts` registers it in production only. The Pages function lists `/sw.js` as a static path and `_headers` marks it `no-store`. Checked in headless Chromium against `vite preview`: registered, shell and assets cached, the desktop booted offline and Calculator opened from the cache.
*   **PWA**: the manifest gains `id`, `start_url`, `scope`, a description, `any` and `maskable` icons; `index.html` gets the `apple-mobile-web-app-capable` and status-bar metas so iOS opens the home-screen app full-screen.
*   **Palm theme and layout** (`src/themes/palm/theme.css`, `src/core/PalmBar.tsx`): `DesktopLayout` gains `palm`. One window at a time: `DraggableWindow` sizes every window to the screen and disables dragging and resizing when the layout is palm (the same path as maximize), inactive windows are hidden by CSS, only Close stays on the title strip. `PalmBar` (top) carries the system menu, the window on screen, search and the clock; `PalmTabBar` (bottom) has Home (every window steps aside, revealing the app grid) and one tab per open window, with the taskbar ids so minimize animations still land. The desktop icons flow as a grid and ignore free placement. On a screen at least 600×600 the `.desktop-root` sits in a 392×760 frame with a bezel on a dark page. One-bit Palm OS chrome on the grey-green LCD, black title strips, rounded buttons, the 98 theme's pixel sans. The theme swatch, `index.html`'s pre-paint maps, `THEME_IDS`, and the kernel panic map (the Fatal Exception dialog) include it; a skin without an upstream project needs no credit.

### Session: 3.1.3 — BeOS, themed kernel panics, real POST, BIOS setup (2026-10-11)

Third of the four 3.1 releases.

*   **BeOS theme** (`src/themes/beos/theme.css`, lok layout + classic chrome): palette and geometry from beos-css (beta.mtechnic.me, "BeOS R5, rebuilt in CSS" by mtechnic; credited in Config and About, which now cope with a credit that states no license). The signature window tab is real: the title bar is `align-self: flex-start` with its own frame and bevel, the surface is transparent, and the content area carries the #606060 frame, so the tab alone is the drag handle, as on BeOS; the close box sits left and the zoom boxes right as yellow bevelled squares (the lucide glyphs show inside them). The lok top bar becomes the Deskbar with the blue "lok" leaf as the system menu. The theme swatch draws the tab; `index.html`'s pre-paint maps and `THEME_IDS` list it.
*   **Kernel panics per theme** (`src/components/system/KernelPanic.tsx`): `rm -rf /` still boots into `kernel-panic` mode, but the screen now follows the theme: the Linux panic for lok, the 98 fatal-exception and XP/7 stop-error blue screens (any key), the System bomb dialog, the Amiga Guru Meditation for TUI, DOS's "Abort, Retry, Fail?" for 386, a VGUI Host_Error for CS 1.6, and BeOS's Kernel Debugging Land. Every restart, retry, OK, continue or key press opens the same song; that is the joke, kept in every theme. Own stylesheet, own palettes; the boot tokens are not involved.
*   **Real POST numbers**: the boot log reads the resource timing buffer after warming (`transferSize`, or `encodedBodySize` for cached responses): "N app modules cached (M files, X KB of script)", "N local assets cached, X KB"; the Are.na stage times `getUserChannels` and adds the cache hit rate from the usage counters; a new storage stage reports `navigator.storage.estimate()` and, where the browser offers it, the JS heap; the session stage counts the restored windows.
*   **BIOS setup** (`src/components/system/BiosSetup.tsx`): DEL or F2 during the boot screen (or the DEL button in the prompt, for touch) opens a blue setup utility over the same stores as Config: theme (cycles and loads the stylesheet), color mode, wallpaper presets (`src/config/wallpapers.ts`, shared with Config), CRT and its four intensities, Oneko, icon size, icon visibility, snapping, title-bar double-click, verbose logging. Arrow keys move and change, Enter/Space toggle, F9 loads defaults, F10 saves and exits, Esc restores the snapshot taken when the screen opened. The desktop waits for the screen to close.

### Session: 3.1.2 — Notepad, Clock, Calculator, Chance (2026-10-11)

Second of the four 3.1 releases. Four apps join the desktop, each code-split like the others (`src/apps/<name>/`, lazy loader in `lazyApps.tsx`, catalog entry, route, pixel icon), with their pure logic in tested modules.

*   **Notepad** (`src/apps/notepad/`): entries with a title, a body and a format (plain text, Markdown, rich text), saved in IndexedDB as you type (`app:notepad`, debounced). Sidebar of notes newest first; a title input, a format switch, Markdown preview (side by side above 720 px of window width, stacked below), download as `.txt`/`.md`/`.html`, delete with a confirm press, Ctrl/Cmd+S toast and Ctrl/Cmd+N. `markdown.ts` is a small renderer (headings, soft line breaks, emphasis, strikethrough, code spans and fences, links limited to http/https/mailto, quotes, lists, rules; text is escaped before markup is added; tested). Rich text is a `contentEditable` with `execCommand` buttons; `richText.ts` whitelists tags and strips attributes on every input and paste, and converts between HTML and text when the format changes. The editor is uncontrolled: its HTML is set when a note opens, never on keystrokes, so the caret never jumps.
*   **Clock** (`src/apps/clock/`): Swatch Internet time (`@867.47`, from `src/lib/internetTime.ts`, which the calendar flyout now shares; integer milliseconds so the boundaries are exact), the local zone as the first row, and a world clock defaulting to Hong Kong, Tokyo, Hà Nội, Los Angeles, New York, London and Kyiv (`Europe/Kiev` fallback). Rows show the delta from local and "tomorrow"/"yesterday". Zones are added from `Intl.supportedValuesOf('timeZone')` grouped by area, removed per row (focus moves to the neighbour), and reset; persisted as `app:clock`, max 24. One 500 ms interval drives the app. `time.ts` (offsets through Intl parts, DST-correct, formatting, normalisation) is tested.
*   **Calculator** (`src/apps/calculator/`): a desk calculator. `evaluate.ts` parses `+ − × ÷`, parentheses, unary minus and postfix `%`, rounds to 12 significant digits and reports division by zero and malformed input as errors (tested). Keyboard entry, repeat-equals, a tape of the last 20 calculations that recalls a result (`app:calculator`), copy with a toast.
*   **Chance** (`src/apps/chance/`): Dice (one to twelve dice of d4–d100, a short shake before the result), Coin (with a history and counts), Cards (draw up to twelve from a shuffled 52-card deck, shuffle to start over) and Tarot (one card or a past/present/future spread from the 78-card deck in `tarot.ts`, upright or reversed, with keyword meanings). "Don't know what this means? Ask AI" hands the reading to Ask AI, which gained an `ask` launch prop: a question with an id is asked once, after the saved runs have loaded, and then dropped from the window props so a restored session does not ask it again. `random.ts` (seedable rng, dice, coin, deck, draws, the Ask AI question, state normalisation) is tested. The footer says what the randomness is: the browser's pseudo-random generator, fine for games, never for keys.
*   Three pixel icons (clock, calculator, dice) drawn in `scripts/pixel-icons.mjs`; Notepad reuses the note icon. Routes `/notepad`, `/clock`, `/calculator`, `/chance?tab=`; the Pages function's known UI paths include them so deep links reach the desktop.

### Session: 3.1.1 — desktop: snapping, shade, launcher, menus, icon layout (2026-10-11)

First of four 3.1 releases from the roadmap (desktop → apps → fun → platform).

*   **Window snapping** (`src/lib/windowSnap.ts`, tested): holding Alt (Option) while dragging previews a half or quarter by where the pointer is (outer thirds pick quarters); without the modifier, the pointer reaching the desktop's left or right edge previews a half, and the corners quarters, because KDE and XFCE grab Alt+drag before the browser sees it. `DraggableWindow` draws `.window-snap-preview` in the window layer and applies the rectangle through the new `updateWindowBounds` action (one state update instead of a position and a size).
*   **Window shade**: `DesktopWindow.shaded` (persisted) rolls a window up to its title bar. The Rnd gets `height: 'auto'` and `minHeight: 0`, the content area is `display: none` so the app stays mounted (media keeps playing), and resizing is off. Maximize and Restore clear it. The window menu has a checked "Shade" entry; Config › Desktop › Windows picks what a title-bar double-click does (maximize by default, or shade). The first maximizing double-click shows a one-time toast whose "Config" button opens Config on that setting (`initialCategory` + `focusSetting` launch props; a running Config receives them through `deliverProps`, switches tab, scrolls with `scrollIntoViewWithin` and outlines the section for 1.8 s). The Config tab is in the share link (`/config?tab=desktop`).
*   **Keyboard launcher** (`src/components/launcher/KeyboardLauncher.tsx`): Cmd/Ctrl+K, the magnifier beside the clock (top bar and classic tray), the system menu and the desktop menu open a Spotlight-like panel. It searches applications, lok's Are.na channels (as folders, from the list the boot screen caches) and two system commands with `src/lib/fuzzyMatch.ts` (subsequence match, prefix and word-start bonuses, tested); an empty query shows Recent and Applications. Arrow keys, Enter, Escape; the panel is themed through `menu-surface` and `menu-item-button`.
*   **Recent** (`src/lib/recentApps.ts`, tested): `useApplicationLauncher` records every open (type, title, icon, and only the identifying props: channel slug, block id, URL, gallery), deduplicated per window identity, eight entries, persisted in IndexedDB through a `useSyncExternalStore` store. The system menu's Recent submenu and the launcher's empty state read it.
*   **System menu**: Applications (Are.na channels and Links still nested) ▸, Recent ▸, Search… ⌘K, About lok.computer, Config…, Check for updates, Restart. Same structure in the lok top bar and the classic start menu.
*   **One menu model** (`src/components/menu/menuModel.ts`, rendered by `MenuItems.tsx`): the system menu and every context menu share `MenuEntry` (label, icon, shortcut hint, `checked` for toggles and radio choices, disabled, dividers, submenus). Submenus flip to the left when they would leave the viewport; a tap opens them on touch; the icon slot is reserved whenever a sibling has an icon or a check, so labels line up. `ContextMenu` is portaled so a menu opened inside a window is never clipped by it.
*   **Right-click menus**: the desktop (View ▸ icon size S/M/L, Snap to grid, Show desktop icons; Tidy up; Search…; Change wallpaper…; Desktop settings…; About), desktop icons (Open, Copy link), window title bars (the same menu as the title-bar icon: Minimize, Maximize/Restore, Shade, Share Window, Close; `src/components/window/windowMenu.ts`) and taskbar buttons. Right-clicks inside an app keep the browser's own menu. A touch long-press on an icon already rearranges, so it only suppresses the browser menu.
*   **Desktop icons** (`src/lib/desktopIconLayout.ts`, tested): three sizes through CSS variables on `.desktop-container[data-icon-size]`; large icons render pixelated like the art intends. "Show desktop icons" hides the layer. With "Snap to grid" off, icons sit at per-icon coordinates (`desktop:icon-positions`); icons without one take the slot the CSS column flow would give them (the same geometry in JS), so switching modes moves nothing, and a drop clamps to the desktop. Tidy up (desktop menu, Config) restores the catalog order and clears positions; it replaces "Reset icon layout" in Config › System. The layer now spans the desktop with `pointer-events: none`, only the icons take the pointer.
*   **Config › Desktop** is a new category (Windows, Desktop icons); `ChoiceSetting` draws exclusive choices as joined buttons.
*   **Images**: pressing Next changed the counter while the previous picture stayed on screen until the next one decoded (the `<img>` was reused, and its measured size kept the old value). The picture now leaves the stage as soon as the source changes, "Loading image…" shows until the preload resolves, a cached neighbour measures synchronously so there is no loading frame, and the element is keyed by URL. The Are.na detail panel had the same shape; `DetailImage` keys the picture by address and shows the placeholder until `onload`.
*   **Reduced motion**: the CRT flicker animation is off under `prefers-reduced-motion`; the still effects (scanlines, curvature, RGB offset) stay. Windows, boot, Oneko, the Media Player and Ask AI already respected it.
*   `WindowSettings` and `DesktopSettings` join `useUserSettings` with exported defaults; `maximizeWindow`/`restoreWindow` clear the shade; `WindowContainer` owns the double-click policy and passes a stable handler so memoized windows do not re-render on setting changes.

### Session: 3.0.7 — code review pass: fixes, dead code, bundle (2026-10-10)

*   `bun run typecheck` (tsc over `src`, with `@types/bun` for the colocated tests) joins lint, test, and build. The Vite build never type-checked, so several real errors had accumulated: the catalog's `defineApplications` generic erased `showOnDesktop`/`defaultProps` from the union, the Are.na view-state normaliser rejected its own legacy input, a dead comparison in the detail panel, `replaceAll` under an ES2020 lib. `noUnusedLocals` is on; the unused imports and state it found are gone.
*   The top bar and taskbar clock showed the UTC date (`toISOString`) beside the local time, so the date was wrong for part of every evening outside UTC. It is formatted from local components now.
*   Three apps still called `scrollIntoView` (Console with `smooth`, which is the exact bug the Console titlebar entry below describes; the channel explorer; the Media Player track list) and Console focused its prompt with a bare `focus()` plus `autoFocus`. All go through `scrollIntoViewWithin` and `focus({ preventScroll: true })`. The rule is now in AGENTS.md and the app checklist.
*   `react-router-dom` is gone. It was only read once by `RouteInterpreter`, which now reads `window.location` and resets with `history.replaceState`. `@radix-ui/react-tooltip` (a `TooltipProvider` that wrapped nothing), `class-variance-authority`, `@radix-ui/react-slot`, `tailwindcss-animate`, and `@tailwindcss/typography` were unused and are removed; `tailwind.config.ts` lost the shadcn leftovers (sidebar/card tokens, accordion keyframes, container, retro colours).
*   Dead code removed: `pages/NotFound.tsx` (never routed; the Pages function answers 404s), `ui/PopupDialog.tsx`, `ui/tooltip.tsx`, the `components/WindowManager.tsx` barrel, `ArenaWindowLayout`, `useStorageInit`/`useUsageStats`, `USE_STATIC_CHANNELS`, unused window constants, and CSS for `.arena-detail-header`, `.arena-address-label`, `.oobe-choice`, `.thin-scrollbar`, `.window-content`, `.focus\:ring-accent`.
*   Bundle: raster assets are no longer inlined as base64 (83 KB of the entry chunk was icon and 88×31 button data, re-downloaded with every release); they ship as hashed files that the boot screen warms, which is what the "loading local assets" stage was always meant to do. The Noto Emoji `@import` moved from the entry stylesheet to `shelf.css`, so it no longer blocks first paint for a font only the Shelf uses. Entry JS went from 525 KB (194 KB gzip) to 376 KB (118 KB gzip); entry CSS from 101 KB (19 KB gzip) to 85 KB (17 KB gzip).
*   Window manager: the live window type is `DesktopWindow` (it was `Window`, shadowing the global in every `windows.map((window) => …)`), `lastZIndex` state and the redundant `isInitialLoad` ref are gone (the z-index ref is the single source), `WindowContainer` no longer threads `onResizeStop` through props, and the context menu clamps itself inside the viewport (the code claimed to but copied the position unchanged).
*   Smaller fixes: `useUserSettings` debounces its IndexedDB write (CRT and speed sliders wrote on every pointer move), `useIsMobile` is a `useSyncExternalStore` (no undefined first render), the Calendar flyout reads the ticking date from the clock instead of running a second interval, the app menu's marquee keyframes live in `index.css` instead of an inline `<style>`, Console forwards captured logs at their own level (errors were relayed as `console.log`), Shelf validates its persisted tab/page, Guestbook reads its URLs from `APP_CONFIG`, the Web app dropped a navigation-tracking script that could only ever run same-origin and a wildcard `postMessage` listener, Config reads connectivity reactively, `BlockViewer` deep links get an icon, and the Worker URL-encodes the username, account id, and paging values it forwards.
*   The noscript copy, agent instructions, `llms-full.txt`, developer page, and a `jev.js` comment still described an "AI chat" endpoint removed in 3.0.5; they describe Ask AI only.
*   Window menu: the placeholder "About" item is gone, and "Share Window" confirms with a toast (or says it could not copy). The link is built on the current origin, so a dev link stays on dev, and it carries the window as shown: apps report their view through `onPropsChange`, and the Web app now reports the page it is on (session restore reopens it too). The channel explorer adds `?user=` for channels that are not lok's. `src/config/routes.test.ts` round-trips every route's share path back through `matchRoute`/`extractProps`.
*   `APP_CONFIG.ARENA_USERNAME` is the one place the Are.na account name lives; routes, the catalog default, the channel browser and explorer, block links, and the boot warm-up read it (each carried its own `'lok'`).
*   The Fedi and NeoDB proxies are rate limited per client IP through a second binding, `PROXY_RATE_LIMITER` (60 requests per minute, checked before configuration), answering 429 `{ error }` like Ask AI. OpenAPI and `docs/worker-api.md` list it; `worker.test.ts` covers it.
*   `strict` is on in `tsconfig.app.json` (it was off, with `noImplicitAny: false` on top); two spots needed a guard.
*   Window controls: react-rnd's `cancel` excludes the three controls and the title-bar icon button from the drag handle (`WINDOW_DRAG_CANCEL`). react-draggable calls `preventDefault` on `touchstart` inside the handle, which cancels the tap's click; the 2025 fix answered that with `onTouchEnd` beside `onClick` on the controls, but the icon button never got one, so the window menu could not be opened by touch, and every click on a control ran through `onDragStart`/`onDragStop` (an `is-interacting` flash and a position write). The buttons now get an ordinary click on every input, and `handleMouseDownFocus` focuses the window for presses on them (the title bar itself still focuses through `onDragStart`).
*   Images suggests the channels lok marks with `🜳` in the title, read from the live channel list (`getUserChannels`, cached at boot) instead of a hand-kept slug list; `FEATURED_CHANNELS` seeds the buttons until the list arrives and stands in offline. `IMAGE_CHANNEL_MARK`, `isImageChannel`, and `imageChannelLabel` live in `src/config/channels.ts`, with tests in `channels.test.ts`.
*   Mobile: the setup screen was sized with `100vh`, which on phones is the viewport with the browser toolbar collapsed, so its Back/Continue footer sat behind the toolbar, and with the body `overflow: clip` nothing could scroll it into view: the first run could not be completed on a phone. The dialog now takes its height from the overlay (fixed, `inset: 0`, which ends above the toolbar), its minimum height yields on short screens so the content scrolls instead, and the footer never shrinks. The desktop root is `h-dvh` for the same reason (the classic taskbar sat behind the toolbar), the app submenu caps at `100dvh`, and the Media Player's `:fullscreen` sizing rule is gone (the UA stylesheet forces 100% there with `!important`). `src/lib/viewportUnits.test.ts` fails on any new `100vh`/`h-screen`.
*   Deploy note: Cloudflare Pages installs with `bun install --frozen-lockfile` under bun 1.2.15, and the first 3.0.7 build failed with `Outdated lockfile version: failed to parse lockfile` because `bun.lockb` had been regenerated with bun 1.4.3 (the 3.0.5 entry had already said the lockfile must come from 1.2.15). It is regenerated with the 1.2.15 release again, and CLAUDE.md now carries the rule. The Worker deployed first (`bunx wrangler deploy`), and both rate limiters were checked in production: the binding counts per Cloudflare machine and syncs asynchronously, so scattered connections never trip it, but 90 requests on one kept-alive connection got their first 429 at request 62.

### Session: 3.0.6 — rearrangeable icons, changelog, analytics (2026-10-10)

*   Desktop icons can be dragged into any order (mouse: move 4 px; touch: hold 300 ms). The order is a list of application types in IndexedDB (`desktop:icon-order`), normalised against the catalog so new apps append and removed apps drop out. Config › System has "Reset icon layout".
*   About › About this ends with a collapsed Changelog (`src/apps/about/changelog.ts`, newest first, with dates); the running version is highlighted. The "made with" line now lists the Claude 4.8/5.0/5.5, Fable 5/5.1 and DeepSeek V4/V4.1 Flash models.
*   Self-hosted Umami tag in `index.html` with automatic pageviews off; `src/lib/analytics.ts` reports one pageview per visit (the arrival URL, before it resets to `/`) and `open-app` / `theme` events. Blocked or missing tracker is a no-op.

### Session: 3.0.5 — Worker trimmed to what the desktop uses (2026-10-09)

*   Removed `/api/chat` and `/api/bsky/feed` from the Worker, OpenAPI, and docs. The Bsky app has read the public Bluesky API directly for a while, and Ask AI replaced the chat proxy. `@atproto/api` is no longer a dependency, which shrinks the Worker bundle.
*   The planner no longer falls back to `AI_MODEL`: `JEV_PLANNER_MODEL` is required (503 when unset). `AI_MODEL`, `AI_TEMPERATURE`, `AI_SYSTEM_INSTRUCTION`, `BSKY_HANDLE`, and `BSKY_APP_PASSWORD` can be deleted from the Worker.

### Session: 3.0.4 — grid tracks, System buttons and code size (2026-10-09)

*   Are.na grids use `auto-fill` instead of `auto-fit`, so a single filtered result keeps its S/M/L card size instead of stretching across the row.
*   Classic-skin toolbar buttons centre their labels as flex items; with System's 4px border-image edges the fixed 22px line box used to hang out of the 14px content box, pushing the text to the bottom.
*   System renders the Console, Weather, `pre`, `code`, `kbd`, and `samp` in Monaco at 12px (its classic 9pt) rather than the 16px UI grid.

### Session: 3.0.3 — media holds, wallpaper layer, Ask AI trims, offline mode (2026-10-09)

*   Media: a clip opened from Are.na, a feed, the Console, or a shared link plays once and stops (`once` on the request, `holdId` in player state) instead of running on into the queue; videos of 15 s or less loop like a GIF. The LCD shows ONCE or LOOP.
*   Wallpapers are an `<img decoding="sync">` layer on the desktop rather than a `background-image`, so a window drag never re-rasterises the picture and returning to the tab never flashes the stand-in gradient. Dragged windows composite on their own layer (`will-change: transform`).
*   Ask AI: the intro text is gone; the empty state is just starter questions that fit the site. The toolbar's JEV badge became a `?` button with a short note on how the machine works, and the composer says "Robots make mistakes. Take the answer as a joke."
*   Fixed the desktop shifting when Ask AI submitted a question: `scrollIntoView` scrolled the window layer (an `overflow: hidden` box still scrolls programmatically), moving every window 10 px until the answer scrolled it back. App code now scrolls only the nearest scroller (`scrollIntoViewWithin`) and focuses with `preventScroll`; the body, desktop, and window layer are `overflow: clip`, which cannot scroll at all.
*   Ask AI toolbar reads `? · Robots make mistakes. Take the answer as a joke. · Clear`; the composer placeholder is "Type your question here…".
*   Offline mode: `cachedRequest` serves an expired copy when offline or when the network fails (entries are kept for 7 days past their TTL); React Query runs loaders offline-first and does not retry offline; feeds, Weather, and Shelf show a calm "Offline" state instead of red errors; an OFFLINE readout sits beside the clock; the update check and skeleton animations rest; an app whose chunk did not download shows a retry instead of a blank window, and a crash inside one window no longer unmounts the desktop.

### Session: 3.0.2 — fixes: wallpapers, scrollbars, taskbar, boot type, planner (2026-10-08)

*   XP and 7 now actually paint Bliss and Harmony on the desktop (the stylesheets still used the gradient stand-ins); desktop pictures position through `--desktop-pattern-position` and `--desktop-pattern-repeat`.
*   Fixed the Ask AI double scrollbar: screen-reader-only text anchored to the window body and made it overflow. `WindowLayout` content areas are now positioned, which fixes it for every app.
*   The taskbar scrolls again instead of squeezing buttons into ellipses, and keeps the active window's button in view.
*   Boot, reboot, and kernel panic screens keep one monospace face at fixed sizes in every theme.
*   Ask AI plans with `gpt-6-luna`. The planner writes in the question's language, adds `as_of` for questions about the present (with a server-side backstop), and adds sharper supporting questions. Option names keep their casing, state references render as field chips, and Jev gateway errors are retried.
*   About, Bsky, and Fedi icons were remade from the favicon and the official Bluesky and GoToSocial artwork.

### Session: 3.0.1 — four more themes, pixel icons, question-first Ask AI (2026-10-08)

*   Added the System (system.css), TUI (TuiCss), 386 (BOOTSTRA.386), and CS 1.6 (cs16.css) themes. `data-chrome` now selects the classic component layer independently of `data-layout`, so System, TUI, and 386 keep a top menu bar with classic windows and controls. Bitmap-font skins render UI text at their native 16px, and their caption buttons, checkboxes, and scroll arrows are pixel-exact SVGs (the DOS ones rendered from the VGA font).
*   Authentic default desktops: Bliss for XP (from the 600 dpi scan, cropped to the XP framing), Harmony for 7, the 50% gray pattern for System, `░` cells for TUI, and the CS 1.6 menu art. Wallpapers are decoded before a theme switch so they never pop in.
*   Toasts use each theme's typeface and window frame.
*   Every app icon was redrawn as pixel art from `scripts/pixel-icons.mjs`.
*   Ask AI is question-first: the planner picks the question type, asks for missing material, or refuses, and the answer view shows the best answer with certainty, notes, and Jev's raw request and response. Fixed the double scrollbar after a theme switch.
*   About credits every theme library, font, and wallpaper; Config shows each library's license.

### Session: Themes, Media player, and Ask AI on Jev (2026-10-08)

*   Replaced `next-themes` with an in-house theme engine (`src/lib/theme.ts`, `src/hooks/useTheme.tsx`). The preference is applied before first paint, classic themes load lazily, and `?theme=98` on any URL shares a theme.
*   Added the classic desktop layout: start button, task list, and tray clock in the taskbar for 98, XP, and 7.
*   Added the Media app (`src/apps/media/`) with a public-domain and Creative Commons starter library. The Console's `play <url>` command sends a URL to it.
*   Rebuilt Ask AI (`src/apps/ask-ai/`, `jev.js`, `/api/jev/plan`, `/api/jev`). Both endpoints are rate limited per client IP through the `JEV_RATE_LIMITER` binding.

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

### Session: Single Instance App Management (Current Date)

**Objective:** Implement a clean system to control whether apps can have multiple instances or should focus existing windows when activated.

**Implementation Details:**

1. **App Configuration Updates (`src/config/apps.tsx`):**
   - Added `singleInstance?: boolean` property to `AppConfig` interface
   - Configured specific apps to use single instance mode:
     - **Guestbook**: `singleInstance: true`
     - **Config**: `singleInstance: true` 
     - **AI Talk**: `singleInstance: true`
     - **About**: `singleInstance: true`

2. **Window Manager Enhancement (`src/hooks/useWindowManager.ts`):**
   - Added new `addOrFocusWindow` function to handle single instance logic
   - Function checks if a window with the same title already exists
   - If existing window found: brings it to front and focuses it
   - If no existing window: creates new window normally
   - Updated interface and context to include the new function

3. **Component Integration:**
   - **DesktopIcons**: Updated to use `addOrFocusWindow` for single instance apps
   - **TopBar Menu**: Updated app menu to respect single instance configuration
   - **Desktop Handlers**: Updated special handlers for About and Config
   - **Console App**: Updated `apps open` command to respect single instance settings

4. **User Experience:**
   - **Single Instance Apps**: Clicking icon/menu item focuses existing window instead of creating duplicate
   - **Multi Instance Apps**: Continue to work as before, creating new windows each time
   - **Seamless Transition**: No visual changes, just improved behavior for designated apps

**Affected Apps:**
- ✅ **Guestbook**: Only one instance (makes sense for a single guestbook)
- ✅ **Config**: Only one settings window needed
- ✅ **AI Talk**: Single conversation thread per session
- ✅ **About**: One about window is sufficient
- 🔄 **Other Apps**: Can still open multiple instances (Are.na, Web, Weather, etc.)

**Overall Impact:** Provides a cleaner desktop experience by preventing unnecessary duplicate windows for apps that conceptually should only have one instance, while maintaining flexibility for apps that benefit from multiple instances.
## Appendix: the original roadmap (2025)

The plan the project started from, kept for history. Most of it shipped; the rest was overtaken.



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
*   [x] Rebuild `Talk to AI` as `Ask AI` on TypeSafe's Jev decision model: a fast LLM plans typed questions, Jev answers, and the result is JSON keyed by the requested properties.
*   [x] Develop `Media` app module (audio and video player with playlist, spectrum analyzer, Media Session controls, and hand-off from Are.na and the fediverse reader).
*   [x] Media and Images accept Are.na links: a channel queues its audio and video blocks or opens as an image gallery, audio and video blocks open straight in Media, and Images is on the desktop.
*   [x] Add desktop themes: `lok`, plus `98`, `XP`, and `7` after 98.css, XP.css, and 7.css, with a classic taskbar layout.
*   [x] Develop `Notepad` (plain text, Markdown with preview, basic rich text; saved in the browser), `Clock` (Internet time, local time, world clock), `Calculator` (desk calculator with a tape) and `Chance` (dice, coin, cards, tarot with an Ask AI hand-off).

### Phase 4: Persistence & Polish

*   **Objective:** Improve usability and robustness.
*   [ ] Persist window states (position, size, open/closed) using `localStorage`.
*   [ ] Add unit and integration tests.
*   [ ] Refine UI/UX across the shell and apps.
*   [ ] Optimize performance.
*   [ ] Configure deployment (e.g., using Netlify, Vercel).

