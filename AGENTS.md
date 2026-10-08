# Repository Guide

## Commands

```bash
bun dev          # Vite development server on http://localhost:8080
bun run build    # Production build
bun run lint     # ESLint
bun test         # Architecture and behavior tests
```

Use the `@/` alias for `src/`. Do not start another dev server when port 8080 is already serving the project.

## Editing Rules

- Preserve unrelated worktree changes.
- Use `neutral-*`, never Tailwind `gray-*`.
- Keep corners square; do not add `rounded-*` styles.
- Reuse the shared CSS variables and `RetroButton`/window chrome patterns in `src/index.css`.
- Keep app modules lazy through `src/config/lazyApps.tsx`. Do not statically import app modules outside `src/apps/`.
- Run `bun test`, `bun run build`, and `bun run lint` after implementation.

## Architecture

lok.computer is a single-page React desktop. React Router only interprets deep links, opens windows, and returns the URL to `/`.

### Window System

- `useWindowState` exposes `windows`, `activeWindow`, and session restoration state.
- `useWindowActions` exposes stable window commands.
- `useWindowManagerController` is provider-internal; app code should not consume it.
- `WindowManagerProvider` supplies separate state and action contexts.
- `WindowContainer` renders memoized `DraggableWindow` instances using `react-rnd`.
- Restorable window state is persisted to IndexedDB by `componentType` and props.

When adding a window action, keep its callback stable. Read current state through functional state updates or synchronized refs rather than adding `windows` to callback dependencies.

### Applications

1. Add the app component under `src/apps/<name>/`.
2. Add its loader and lazy export to `src/config/lazyApps.tsx`.
3. Add its complete definition to the authoritative catalog in `src/config/apps.tsx`, including the same loader.
4. Add deep-link configuration to `src/config/routes.ts` when needed; routes contain URL knowledge only.

Use `useApplicationLauncher` for every app launch, including nested dynamic windows. Do not construct window content or restoration metadata at call sites. Dynamic, prop-driven windows use the same catalog as desktop apps.

App chunks remain code-split but are warmed during `SystemStartup`, along with bundled local assets. Window content still retains a Suspense fallback.

### Themes

- `src/lib/theme.ts` is the theme registry; `src/hooks/useTheme.tsx` is the provider and hook. Do not reintroduce `next-themes`.
- `lok` ships in `src/index.css`. `98`, `xp`, and `7` are lazy stylesheets in `src/themes/` on top of `src/themes/classic.css`, scoped with `html[data-layout="classic"]:not(#_)` and `html[data-theme="<id>"][data-layout]:not(#_)`.
- The inline script in `index.html` applies the stored theme before first paint; `src/lib/theme.test.ts` keeps it in sync with the registry.
- Use shared tokens for new styles and check new UI in all four themes. Rounded corners are allowed only inside the XP and 7 skins.

### Media Player and Ask AI

- Hand media to the player with `createMediaRequest`/`createMediaItem` from `src/apps/media/mediaLibrary.ts`; the player applies each request id once.
- Launching a single-instance app with explicit props delivers them to the running window.
- Ask AI calls `/api/jev/plan` and `/api/jev`. The planner prompt, plan validation, Jev call, and result forming live in `jev.js` with tests in `jev.test.ts`. Worker secrets: `TYPESAFE_API_KEY` plus the existing `AI_*` planner settings.

### Are.na

- Shared file rendering lives in `src/apps/arena/components/ArenaFileView.tsx`.
- Shared preview/detail rendering lives in `ArenaDetailPanel.tsx`.
- Use `ARENA_WINDOW_DEFAULTS` from `src/config/arenaWindows.ts` in the Application catalog for Are.na-family defaults.
- `useArenaChannelBrowsing` owns remote/in-memory paging, ordering, cancellation, dedupe, and selection restoration.
- Are.na responses use the shared `cachedRequest` lifecycle.

### Storage And Debugging

`src/lib/storage.ts` owns the `appState`, `apiCache`, and `usageStats` IndexedDB stores. Verbose cache messages are disabled by default and controlled through Config > Debug.

Use `usePersistedState` for persisted view state and `cachedRequest` for remote reads. Do not reproduce cache lookup, request accounting, fetch, and cache write in app modules.

### Version And Updates

`package.json` is the only version source. Vite injects it into the boot HTML and generates `/system-version.json`. To test an update, leave an older client open, bump `package.json`, and use Config > System > Check for updates.

Cloudflare cache headers keep HTML and the version manifest fresh while hashed assets remain immutable.
