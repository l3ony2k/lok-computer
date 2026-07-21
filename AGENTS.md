# Repository Guide

## Commands

```bash
bun dev          # Vite development server on http://localhost:8080
bun run build    # Production build
bun run lint     # ESLint
```

Use the `@/` alias for `src/`. Do not start another dev server when port 8080 is already serving the project.

## Editing Rules

- Preserve unrelated worktree changes.
- Use `neutral-*`, never Tailwind `gray-*`.
- Keep corners square; do not add `rounded-*` styles.
- Reuse the shared CSS variables and `RetroButton`/window chrome patterns in `src/index.css`.
- Keep app modules lazy through `src/config/lazyApps.tsx`. Do not statically import app modules outside `src/apps/`.
- Run both `bun run build` and `bun run lint` after implementation.

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
2. Add its loader to `src/config/lazyApps.tsx` and `src/config/preloadApps.ts`.
3. Add its launch configuration to `src/config/apps.tsx`.
4. Add deep-link configuration to `src/config/routes.ts` when needed.
5. Add dynamic, prop-driven windows to `DYNAMIC_COMPONENTS` in `src/config/componentRegistry.tsx`.

App chunks remain code-split but are warmed during `SystemStartup`, along with bundled local assets. Window content still retains a Suspense fallback.

### Are.na

- Shared file rendering lives in `src/apps/arena/components/ArenaFileView.tsx`.
- Shared preview/detail rendering lives in `ArenaDetailPanel.tsx`.
- Use `ARENA_WINDOW_DEFAULTS` from `src/config/arenaWindows.ts` for all Are.na-family launches, routes, and restoration defaults.
- Are.na API responses use the shared IndexedDB TTL cache.

### Storage And Debugging

`src/lib/storage.ts` owns the `appState`, `apiCache`, and `usageStats` IndexedDB stores. Verbose cache messages are disabled by default and controlled through Config > Debug.

### Version And Updates

`package.json` is the only version source. Vite injects it into the boot HTML and generates `/system-version.json`. To test an update, leave an older client open, bump `package.json`, and use Config > System > Check for updates.

Cloudflare cache headers keep HTML and the version manifest fresh while hashed assets remain immutable.
