# AGENTS.md

Working rules for anyone, human or coding agent, changing this repository. `CLAUDE.md` imports this file.

## Commands

```bash
bun dev          # Start dev server at localhost:8080 (do not start a second one if 8080 is already serving the project)
bun run build    # Production build
bun run lint     # Run ESLint
bun run typecheck # tsc over src, then the Worker and Pages function with their tests (tsconfig.server.json), then vite.config.ts; the Vite build never type-checks
bun test         # Run architecture and behavior tests
```

Run all four before finishing a change. GitHub Actions (`.github/workflows/ci.yml`) runs the same four under the pinned bun on every push to `main` and every pull request; keep it in step when the checks change.

**One bun version everywhere.** `package.json`'s `packageManager` (`bun@1.4.3`) pins it: CI reads it, and Cloudflare Pages builds every push with `bun install --frozen-lockfile` under the `BUN_VERSION` variable set on the Pages project (Production and Preview). Install with that release (`bunx bun@<version> install`), and commit only a `bun.lock` it wrote: an older bun cannot read a newer lockfile and the Pages build fails. To upgrade, set the new `BUN_VERSION` in both Pages environments first, then change `packageManager`, regenerate `bun.lock`, and run the four checks in one commit. The Worker (`worker/`) is deployed by hand with `bunx wrangler deploy`, before the push when anything in `worker/` or `wrangler.toml` changed.

Path alias `@/` maps to `./src/`.

## Repository Layout

- `src/` the React desktop; `public/` static files served as is (`llms.txt`, `openapi.json`, buttons); `functions/` the Pages function (agent-facing Markdown, the 404 rule) and its tests.
- `worker/` the Cloudflare Worker (`worker.js`, the Ask AI pipeline `jev.js`) and its tests; `wrangler.toml` deploys it.
- `scripts/pixel-icons.mjs` generates the app icons; `docs/` holds the developer docs, the glossary of domain terms, and the development log.
- `promo/` is a separate, untracked video project (ignored by git and ESLint).

## Style Rules

- **Preserve unrelated worktree changes.**
- **Reuse the shared CSS variables** and the `RetroButton`/window chrome patterns in `src/index.css` before adding new styles.
- **Never use Tailwind `gray-*` colors** — use `neutral-*` instead
- **No rounded corners** — avoid `rounded-*` classes (theme skins may round what the original system rounded)
- **Never size a layer with `100vh` or `h-screen`** — on phones that is the height with the browser toolbar collapsed, and the body is `overflow: clip`, so anything in that strip is unreachable. Use `h-dvh`/`100dvh`, or a percentage of a fixed `inset: 0` parent (`src/lib/viewportUnits.test.ts` checks)
- **Phone insets**: `viewport-fit=cover`, so `--safe-top`/`--safe-bottom` (in `src/index.css`) carry the status bar and home indicator. Any bar at the top or bottom edge, and anything anchored to one, must add them (the classic bars use transparent `border-top`/`border-bottom` so their background paints under the inset). A theme's `themeColor` is the colour at the very top of the page.
- **Focus rings on text fields** show only in keyboard mode: `src/lib/inputModality.ts` sets `html[data-input]`, and a base rule in `index.css` hides field rings otherwise. Do not add `:focus`/`:focus-visible` outlines to fields in theme files.

## Architecture

lok.computer is a browser-based retro desktop environment. The entire UI is a single React app with no routing library: `RouteInterpreter` reads the arrival URL once, opens the matching windows, and resets the address bar to `/` with `history.replaceState`.

### Window System

The core primitive is a floating, draggable/resizable window powered by `react-rnd`. Every app runs inside one.

- **Window manager hooks** (`src/hooks/useWindowManager.ts`) — `useWindowState` exposes window state and `useWindowActions` exposes stable commands. The internal controller manages z-index stacking, minimize/maximize, and IndexedDB session persistence. A live window is a `DesktopWindow` (never `Window`, which would shadow the global).
- **`WindowManagerProvider`** / **`WindowContainer`** (`src/components/window/`) — the React provider and the component that renders all open windows.
- **Application catalog** (`src/config/apps.tsx`) — authoritative identity, lazy loader, lazy view, defaults, and single-instance behavior for every restorable Application.
- **Application launch** (`src/hooks/useApplicationLauncher.tsx`) — turns Application identity and domain props into a live, restorable window.
- **Stable actions** — `useWindowManagerController` is provider-internal; app code uses the two hooks. When adding a window action, keep its callback stable: read current state through functional updates or synchronized refs rather than adding `windows` to its dependencies.
- **Scrolling inside windows** — never call `element.scrollIntoView()` or bare `focus()` from app code: both walk every ancestor and scrolled the window layer (shifting every window). Use `scrollIntoViewWithin` from `src/lib/utils.ts` and `focus({ preventScroll: true })`. The body, desktop, and window layer are `overflow: clip` as a backstop.
- **Buttons in the title bar** — the title bar is the drag handle, and react-draggable calls `preventDefault` on `touchstart` inside it, which cancels the tap's click. The controls and the icon menu button are excluded through react-rnd's `cancel` (`WINDOW_DRAG_CANCEL` in `DraggableWindow.tsx`), so they get an ordinary `onClick` on touch and mouse alike. Add any new title-bar button to that selector; never pair `onTouchEnd` with `onClick`.

### Adding a New App

1. Create the app component in `src/apps/<name>/`.
2. Add its loader and `React.lazy` export in `src/config/lazyApps.tsx` (never statically import app modules outside `src/apps/`).
3. Add a complete definition to `APPLICATIONS` in `src/config/apps.tsx`, including the same loader.
4. If the app needs deep-linking, add a route to `ROUTES` in `src/config/routes.ts`.

Use `useApplicationLauncher` for desktop, menu, console, route, and nested launches; never construct window content or restoration metadata at call sites. Dynamic prop-driven Applications use the same catalog; there is no separate restoration registry. Launching a single-instance app with explicit props delivers them to the running window.

App chunks remain code-split but are warmed during the boot screen (bounded: the desktop shows after at most 6 s for modules and 4 s for assets, and the warm-up finishes behind it). Window content retains a Suspense fallback.

### Session Persistence

Window state (open windows, positions, sizes) survives page reloads via IndexedDB. Windows serialize a catalog `componentType` and domain props; restoration resolves the Application directly through the catalog and recreates its lazy view.

### Storage Layer (`src/lib/storage.ts`)

All persistence goes through a single IndexedDB wrapper with three stores:
- `appState` — window sessions, user settings
- `apiCache` — TTL-based response cache (Weather: 10m, Are.na: 30m–1h, social feeds: 5m)
- `usageStats` — request/cache hit counters

Use `usePersistedState` for view-state lifecycle and `cachedRequest` for remote reads; do not reproduce cache lookup, request accounting, fetch and cache write in app modules. App modules should retain only source-specific URL, status, and decoding knowledge. Verbose cache logging is off by default and toggled in Config › Debug.

### Offline

`src/sw/service-worker.js` is built into `/sw.js` by the `lok-service-worker` plugin in `vite.config.ts` (version, shell precache list and asset list injected) and registered by `src/lib/serviceWorker.ts` in production only. Navigations are network-first with the cached shell as fallback, `/assets/*` cache-first (pruned per build), `/api/*`, `/system-version.json` and `/sw.js` never cached; `rebootSystem` unregisters it and clears caches. The Pages function must list any new root file (like `/sw.js`) in `STATIC_PATHS`. `cachedRequest` serves an expired entry when the browser is offline or the load fails (entries live 7 days past their TTL) and throws `OfflineError` only when nothing is saved. React Query runs loaders offline-first and does not retry offline. Render failed loads with `LoadFailure` (calm offline text, red error otherwise). `ConnectivityMonitor` sets `html[data-offline]` and toasts the transitions; `OfflineReadout` sits beside the clock. `lazyApps.tsx` wraps `React.lazy` so a chunk that fails to download shows `ChunkRetry` instead of poisoning the session, and `WindowErrorBoundary` keeps a crash inside its window.

### Cloudflare Worker (`worker/worker.js`)

A single Cloudflare Worker acts as an API proxy for everything that requires credentials (the Bsky app reads the public Bluesky API directly, so there is no Bluesky route):
- `/api/jev/plan`, `/api/jev` — Ask AI: a fast planner LLM on an OpenAI-compatible endpoint (env: `AI_BASE_URL`, `AI_API_KEY`, required `JEV_PLANNER_MODEL`, `gpt-6-luna` in wrangler.toml; optional `JEV_PLANNER_REASONING_EFFORT`) compiles typed questions, TypeSafe Jev answers them (env: `TYPESAFE_API_KEY`, `JEV_MODEL`; per-IP `JEV_RATE_LIMITER`); logic in `worker/jev.js`. When Jev has nothing to judge (writing, explaining, arithmetic) the planner replies `answer` with its own prose instead of refusing
- `/api/fedi/account` and `/api/fedi/statuses` — Mastodon/GoToSocial proxy (env: `FEDI_INSTANCE`, `FEDI_ACCESS_TOKEN`; per-IP `PROXY_RATE_LIMITER`, shared with NeoDB)
- `/api/neodb/shelf` — NeoDB reading shelf proxy (env: `NEODB_ACCESS_TOKEN`; per-IP `PROXY_RATE_LIMITER`)

Deploy/configure via `wrangler.toml`. Secrets are set in the Cloudflare dashboard, not in the toml.

### Deep Linking

`RouteInterpreter` (`src/components/RouteInterpreter.tsx`) runs once on mount, reads the URL, opens the corresponding window(s), then replaces the URL with `/`. Supports single windows (`/explorer/channel-slug`) and multi-window specs (`/open?w=about,weather,explorer/my-channel`). The title-bar icon menu's "Share Window" copies `generateShareUrl` (the route's path on the current origin); apps keep their window props current through `onPropsChange`, so the link reopens the window as shown. `src/config/routes.test.ts` round-trips every route.

### Themes

`src/lib/theme.ts` registers ten themes: `lok` (default, light/dark) and lazily loaded skins `98`, `xp`, `7`, `system`, `tui`, `386`, `cs16`, `beos`, `palm` in `src/themes/<id>/`, built on the shared `src/themes/classic.css`. `data-layout` is the desktop arrangement (`lok` top bar, `classic` taskbar, `palm` one window at a time with `PalmBar`/`PalmTabBar` from `src/core/PalmBar.tsx`, framed phone-size on large screens); `data-chrome` selects the component layer, so System, TUI, 386, BeOS and Palm pair classic controls with a menu bar. Adding a theme: registry entry, `THEME_IDS`, the pre-paint maps in `index.html`, a `theme-swatch` block, a `KernelPanic` screen. The preference is stored in localStorage (`lok.theme`) and applied before first paint by the inline script in `index.html`; keep the two in sync (`src/lib/theme.test.ts` checks). Use `useTheme()` from `src/hooks/useTheme.tsx` (never `next-themes`). Style new surfaces with shared tokens so every theme recolors them, and verify UI changes in all ten themes. Text follows three tiers in `classic.css` (`--c-text-small`, `--c-text-body`, `--c-text-heading`, plus `--c-font-small`/`--c-font-heading`) that map lok's 10–24px ramp; add new lok text classes to the matching tier list. Bitmap skins set tiers on their pixel grid only (native size, 2× headings, a native-size companion face for small text), never off-grid sizes. The TTY boot and reboot screens are theme-independent: one monospace face at fixed sizes (`--boot-*` tokens in `src/index.css`). The kernel panic after `rm -rf /` is the exception: `src/components/system/KernelPanic.tsx` picks a screen per theme (blue screens, the bomb, Guru Meditation, DOS, VGUI, Kernel Debugging Land) with its own palettes in `kernel-panic.css`; every way out opens the rick roll, and a new theme needs an entry in its `SCREENS` map. `BiosSetup.tsx` (DEL during boot) edits the same stores as Config through the blue setup screen. Theme credits live in the registry and feed Config and About; the license is optional when the project states none. BeOS bundles beos-css's traced BeOS R5 screen fonts (`src/themes/beos/fonts/`, COLRv0 "coverage" fonts: full pixels follow `color`, edge pixels are palette entries, `font-palette: --be-light` for light text on dark). Palm on a large screen (`PALM_FRAME_QUERY` in `theme.ts`, mirrored in its stylesheet) is confirmed by `ThemePicker` through `.system-dialog` before it shrinks the desktop; `useWheelScroll` gives horizontal strips wheel scrolling.

### Icons

App icons are pixel art generated by `node scripts/pixel-icons.mjs` (ASCII grids on a 32×32 canvas, shared palette, 8× PNGs in `src/assets/icons`); edit the art there and regenerate rather than replacing PNGs by hand. Brand marks (Bluesky, GoToSocial, the lok.computer favicon) use colours sampled from the official artwork; detail too fine for the grid, like the L3 logo on About's screen, goes in an icon's `vector` layer (SVG path data rasterised at output resolution).

### Media Player and Ask AI

- `src/apps/media/` is the Media Player. Other apps hand it audio or video with `createMediaRequest`/`createMediaItem` from `mediaLibrary.ts` and `openApplication(MEDIA_PLAYER_TYPE, { props: { request } })`. A one-item request plays `once` (the player holds on `holdId` and stops at the end instead of advancing); videos of `SHORT_LOOP_SECONDS` or less loop like GIFs.
- Are.na links go through `src/apps/arena/utils/arenaLinks.ts` (parse channel/block links, pick playable media and images) and `arenaImport.ts` (read a channel page by page); the Media Player and Images (`ImageViewer`, on the desktop) accept them, and `createMediaRequest([], true, { arena })` queues a whole channel.
- `src/apps/ask-ai/` is Ask AI (catalog identity `AI Talk`). The person asks one question; `/api/jev/plan` replies `plan`, `needs_input` (ask for fields, re-plan with `inputs`), `answer` (the planner's own prose, shown as the Answer · Planner card) or `refuse`; `/api/jev` returns `best` plus analytics. Logic in `worker/jev.js`, tests in `worker/jev.test.ts`. Another app hands over a question with `openApplication('AI Talk', { props: { ask: { id, question } } })` (Chance's tarot does); each id is asked once and then cleared from the window props.
- Notepad, Clock, Calculator and Chance (`src/apps/notepad|clock|calculator|chance/`) keep their logic in tested pure modules (`markdown.ts`, `richText.ts`, `time.ts`, `evaluate.ts`, `random.ts`); `src/lib/internetTime.ts` is shared with the calendar flyout. New deep links must also be added to `UI_PATHS` in `functions/[[path]].ts` (the readiness test checks).

### User Settings

`useUserSettings` (`src/hooks/useUserSettings.ts`) manages wallpaper, CRT effects, Oneko, and debug logging preferences. Settings are persisted to IndexedDB. Theme and color mode live in the theme engine, not in user settings. The desktop paints the chosen wallpaper (or the theme's, from the registry) as an `<img class="desktop-wallpaper" decoding="sync">` layer, never as a `background-image`: it stays on one compositor layer under window drags and cannot checkerboard after a tab switch. Theme `--desktop-pattern` tokens hold only the cheap stand-in under it.

### Are.na Integration

The Are.na app (`src/apps/arena/`) fetches channel/block data from the Are.na v3 API directly (no proxy needed — public API). Block types include images, links, text, attachments, and media.

Use `ARENA_WINDOW_DEFAULTS` in the Application catalog. `useArenaChannelBrowsing` owns remote/in-memory pagination, ordering, cancellation, dedupe, and selection restoration. Shared file rendering lives in `src/apps/arena/components/ArenaFileView.tsx`, preview/detail rendering in `ArenaDetailPanel.tsx`.

lok marks image-heavy channels with `🜳` in the title (`IMAGE_CHANNEL_MARK` in `src/config/channels.ts`). The Images app suggests those from the live channel list (`getUserChannels`, cached at boot); `FEATURED_CHANNELS` is a snapshot that seeds the buttons and stands in when Are.na cannot be reached. The account name is `APP_CONFIG.ARENA_USERNAME`.

### Desktop Icons

`src/components/desktop/DesktopIcons.tsx` renders `APP_LIST` in a persisted order (`desktop:icon-order`, helpers and tests in `src/lib/desktopIconOrder.ts`). Icons rearrange with pointer events (mouse after 4 px, touch after a 300 ms hold), so `.desktop-icon-button` has `touch-action: none`. `DesktopSettings` (`useUserSettings`) holds the icon size (`s`/`m`/`l`, CSS variables on `.desktop-container[data-icon-size]`), visibility, and snapping; with snapping off each icon keeps coordinates (`desktop:icon-positions`) and icons without one take the slot the column flow would give them (`src/lib/desktopIconLayout.ts` mirrors the CSS geometry, tested). "Tidy up" (desktop menu, Config › Desktop) dispatches `DESKTOP_ICON_ORDER_RESET_EVENT`, which restores the catalog order and clears positions.

### Menus, Launcher, Snapping, Shade

- **Overlays**: menus, the calendar flyout, the launcher and context menus portal into `getOverlayRoot()` (`src/lib/overlayRoot.ts`): the body, or `.desktop-root` when the palm layout marks it `data-overlay-root="contained"` (its stylesheet adds `contain: layout paint` and `container-type: size`, so on a large screen they open inside the phone frame). Position fixed overlays against `getOverlayBounds()`, never `window.innerWidth`; size them with `cqw`/`cqh`, not `vw`/`dvh`. Never put `filter`, `backdrop-filter` or `transform` on a menu panel: it would become the containing block for the fixed submenus (the 7 start menu keeps its glass on a `::before`).
- **One menu model**: `src/components/menu/menuModel.ts` (`MenuEntry`: label, icon, shortcut hint, `checked`, disabled, dividers, submenus) rendered by `MenuItems.tsx`; `AppMenu` (system menu) and `ContextMenu` (portaled, at a point) both use it. Never build a menu with another component. Window menus come from `buildWindowMenu` in `src/components/window/windowMenu.ts` (title-bar icon, title-bar right-click, taskbar right-click). The desktop's own right-click menu lives in `Desktop.tsx`, the icon menu in `DesktopIcons.tsx`.
- **Submenus** are positioned fixed by `MenuItems.tsx` from their item's rectangle (beside it, flipped left, or flush with the far edge; bottom-aligned under `[data-placement="bottom"]`), so a scrolling parent list cannot clip them.
- **Keyboard launcher**: `src/components/launcher/KeyboardLauncher.tsx` (Cmd/Ctrl+K, the `SearchButton` beside the clock, `openLauncher()` from `src/lib/launcher.ts`). Searches `APP_LIST`, lok's channels (`getUserChannels`) and system commands with `src/lib/fuzzyMatch.ts`. Recent items come from `src/lib/recentApps.ts`; `useApplicationLauncher` records every open there.
- **Snapping**: `src/lib/windowSnap.ts` (pure, tested) resolves the zone from the pointer position in the window layer (Alt: halves and quarters by position; no modifier: the layer's left/right edges and corners). `DraggableWindow` previews it and applies `updateWindowBounds` on drop.
- **Tab stacking** (themes with `tabStacking`, i.e. BeOS): `src/lib/windowStacks.ts` (pure helpers, tested; tab-width store). A window's `stack` id and `stackedAt` make it a member; `stackWindow`/`unstackWindow`/`updateStackBounds` on the manager, and `focusWindow` raises the whole stack. `DraggableWindow` hit-tests other tabs while dragging, stacks on drop, drags the stack along (inline transforms on the siblings until the drop commits), detaches on Shift-drag or "Detach from stack"; each tab's `margin-left` is the measured widths of the tabs before it. The BeOS stylesheet passes pointer events through the empty title row (scoped to `.draggable-window`; the setup dialog reuses the surface classes). Maximize and shade leave the stack; minimize keeps membership.
- **Attention**: `addOrFocusWindow` stamps `attention` on a shaded single-instance window it lands on; `DraggableWindow` blinks the title bar by dropping `data-active` under `data-attention` (themes' inactive look; lok inverts the bar). Not persisted.
- **Shade**: `DesktopWindow.shaded`; the Rnd gets `height: 'auto'`, the content area is hidden with CSS and stays mounted. `WindowContainer` decides what a title-bar double-click does from `WindowSettings.titleDoubleClick` and shows the one-time hint toast, whose button opens Config with `initialCategory`/`focusSetting` props (Config scrolls to `data-setting` and outlines it).

### Analytics

Self-hosted Umami. `index.html` has an `%ANALYTICS_TAG%` placeholder that `vite.config.ts` fills from the deployment settings, with `data-auto-pageview="false"` and `data-domains` set to `VITE_SITE_URL`'s host (so local development, previews and forks never report). `src/lib/analytics.ts` sends one pageview per visit (the arrival URL from `RouteInterpreter`, before it resets to `/`) and `open-app` / `theme` events; it is a no-op when the tracker is blocked. Do not add pageviews elsewhere, and never send anything that identifies a person.

### Deployment Settings and Personal Content

Values that differ between lok.computer and a fork are build settings in `src/config/deployment.ts` (`VITE_SITE_URL`, `VITE_UMAMI_SRC`, `VITE_UMAMI_WEBSITE_ID`, `VITE_ARENA_USERNAME`, `VITE_BSKY_ACTOR`, `VITE_FEDI_USERNAME`, `VITE_GUESTBOOK_ID`; documented in `.env.example`). Unset means lok.computer's default, so production sets none of them. `vite.config.ts` fills `%SITE_URL%` and `%ANALYTICS_TAG%` in `index.html` from them; the app reads `DEPLOYMENT` from `src/config/env.ts` (image-free, so `constants.ts` and the Worker's type-check can import it). Never hard-code the domain or these accounts again. Personal content (About's quote, bio, links and projects, the repository link, the Browser's bookmarks) lives in `src/config/site.ts`. The Worker's equivalents are `wrangler.toml` vars (`FEDI_INSTANCE`, `NEODB_USERNAME`); `wrangler.toml` has no `account_id`.

### Versioning

`package.json` is the only version source. Vite injects it into boot HTML and generates `/system-version.json`; do not duplicate version strings elsewhere (the OpenAPI document's `info.version` is bumped by hand). To test an update, leave an older client open, bump `package.json`, and use Config › System › Check for updates. Cloudflare cache headers keep HTML and the version manifest fresh while hashed assets stay immutable. When the version changes, add an entry to `src/apps/about/changelog.ts` (shown in About › Changelog) and a detailed entry at the top of `docs/development-log.md` (the README is the project's public front page, not a log).

### Licensing

The code is AGPL-3.0-or-later (`LICENSE`); the lok.computer name, L3 logo, the site's writing, and displayed Are.na/social content are all rights reserved. `NOTICE.md` lists every third-party library, font, image, and trademark in the repository: when you add or vendor one (a theme library, font, wallpaper, button, or brand mark), add it to `NOTICE.md` with its owner and licence, and keep the upstream licence file next to it.
