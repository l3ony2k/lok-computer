# Creating Applications

## 1. Add the app module

Create `src/apps/<name>/<Name>App.tsx`. Use `WindowLayout` and the shared retro chrome patterns.

```tsx
import { WindowLayout } from '@/components/window/WindowLayout';

export const NotesApp = ({ initialNote }: { initialNote?: string }) => (
  <WindowLayout>{initialNote ?? 'New note'}</WindowLayout>
);
```

App modules may import other modules under `src/apps/`. Code outside `src/apps/` must never import an app module statically.

## 2. Add the lazy loader

Add one entry to `APP_MODULE_LOADERS` in `src/config/lazyApps.tsx`, then export its lazy view from the same file.

```tsx
Notes: () => import('@/apps/notes/NotesApp'),

export const NotesApp = lazy(() =>
  APP_MODULE_LOADERS.Notes().then((module) => ({ default: module.NotesApp }))
);
```

Startup warming consumes the loader from the Application catalog; do not add a second preload import.

## 3. Register the Application

Add one definition to `APPLICATIONS` in `src/config/apps.tsx`.

```tsx
Notes: {
  componentType: 'Notes',
  name: 'Notes',
  iconType: 'note',
  component: NotesApp,
  loader: APP_MODULE_LOADERS.Notes,
  defaultWidth: 520,
  defaultHeight: 460,
  defaultProps: { initialNote: '' },
  singleInstance: true,
  showOnDesktop: true,
},
```

Dynamic, prop-driven Applications use the same catalog. There is no separate restoration registry.

## 4. Add a deep link when needed

Routes own only URL-specific knowledge. Window defaults and single-instance behavior come from the catalog.

```tsx
{
  pattern: 'notes',
  componentType: 'Notes',
  extractProps: (_, query) => ({ initialNote: query.get('note') || undefined }),
  generateUrl: (props) => props.initialNote
    ? `/notes?note=${encodeURIComponent(String(props.initialNote))}`
    : '/notes',
  getTitle: () => 'Notes',
}
```

## Launching another Application

Use the Application launch interface. Do not construct React content or restoration metadata at the call site.

```tsx
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';

const openApplication = useApplicationLauncher();

openApplication('ImageViewer', {
  title: 'Cover',
  props: { imageUrl },
});
```

## Handing media to the Media Player

```tsx
import { MEDIA_PLAYER_TYPE, createMediaItem, createMediaRequest } from '@/apps/media/mediaLibrary';

openApplication(MEDIA_PLAYER_TYPE, {
  props: { request: createMediaRequest([createMediaItem(url, { title, kind: 'video', origin: 'app' })]) },
});
```

The player is single-instance; explicit launch props reach a running player, which applies each request id once.

An Are.na channel or block can be handed over as a link instead of items. The player reads every playable block (up to 200) and the Image Viewer pages through the images:

```tsx
import { formatArenaReference } from '@/apps/arena/utils/arenaLinks';

const arena = formatArenaReference({ type: 'channel', slug });
openApplication(MEDIA_PLAYER_TYPE, { props: { request: createMediaRequest([], true, { arena }) } });
openApplication('ImageViewer', { props: { arena, startBlockId } });
```

## Theme coverage

Shared chrome lives in `src/index.css`. Styles used by a single app can live beside it (for example `src/apps/media/media-player.css`) and be imported by the app module, so they ship with the lazy chunk instead of the render-blocking entry stylesheet. Either way, use the shared tokens (`--text-color`, `--detail-bg`, `--internal-border`, `--block-bg`, and so on), so classic themes recolor them automatically. Reuse `RetroButton`, `.search-input`, `.app-toolbar-row`, `.app-footer-row`, and `.app-readout`: `src/themes/classic.css` restyles those hooks for 98, XP, and 7. Add app-specific classic overrides to `classic.css` only when a surface needs a different shape, and check the app in every theme.

## Persisting view state

```tsx
const [view, setView, loading] = usePersistedState({
  key: 'app:notes:view',
  defaultValue: { mode: 'list' },
  debounceMs: 150,
  normalize: (stored, fallback) => isValidView(stored) ? stored : fallback,
});
```

The persisted-state module protects the initial value, handles key changes, and writes after the configured debounce.

## Cached remote reads

Use `cachedRequest` inside the source adapter. React views should not sequence cache, metrics, fetch, and write themselves.

```tsx
const result = await cachedRequest({
  cacheKey: `notes:${id}`,
  ttlMs: CACHE_TTL.NOTES,
  source: 'notes',
  load: async () => {
    const response = await fetch(`/api/notes/${id}`);
    if (!response.ok) throw new Error('Failed to load note');
    return response.json() as Promise<Note>;
  },
});
```

## Checklist

- [ ] app module added under `src/apps/`
- [ ] loader and lazy view added in `lazyApps.tsx`
- [ ] complete definition added to the Application catalog
- [ ] icon supported by `CustomIcon`
- [ ] optional route contains URL knowledge only
- [ ] nested launches use `useApplicationLauncher`
- [ ] persisted state uses `usePersistedState`
- [ ] remote reads use `cachedRequest`
- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run build` passes
- [ ] nothing calls `scrollIntoView()` or a bare `focus()` (use `scrollIntoViewWithin` and `focus({ preventScroll: true })`)
