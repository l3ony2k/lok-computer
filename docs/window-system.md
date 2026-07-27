# Window System

The window system manages live desktop windows and restores the Window session from IndexedDB.

## Public interfaces

### Read state

```tsx
const { windows, activeWindow, isSessionRestored } = useWindowState();
```

### Command existing windows

```tsx
const {
  closeWindow,
  minimizeWindow,
  maximizeWindow,
  restoreWindow,
  focusWindow,
  updateWindowPosition,
  updateWindowDimensions,
  updateWindowProps,
} = useWindowActions();
```

### Launch Applications

```tsx
const openApplication = useApplicationLauncher();

openApplication('ChannelExplorer', {
  title: channel.title,
  props: { channelSlug: channel.slug, username: 'lok' },
});
```

Application code does not use the low-level window-construction interface. The launch module supplies content, defaults, restoration identity, and single-instance behavior from the catalog.

## Provider structure

`WindowManagerProvider` supplies three contexts:

- state context for live window state
- action context for stable commands
- provider-internal launch context consumed by `useApplicationLauncher`

`useWindowManagerController` is provider-internal.

## Window session

Only serializable data is stored:

```ts
interface SerializableWindowData {
  id: string;
  title: string;
  componentType: string;
  iconType?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minimized?: boolean;
  maximized?: boolean;
  zIndex: number;
  props?: Record<string, unknown>;
}
```

On restore, the window manager:

1. reads `windowSession`
2. resolves each `componentType` through the Application catalog
3. recreates the lazy React view
4. injects `onPropsChange`
5. restores geometry and stacking
6. skips definitions that no longer exist

Session writes are debounced by 500ms.

## Current-prop synchronization

Restorable Applications can accept `onPropsChange`. When their shareable state changes, they report the corresponding initial props:

```tsx
onPropsChange?.({
  initialTab: activeTab,
  initialPage: page,
});
```

The window manager merges these values into serialized props. Share URL generation then uses current state rather than mount-time state.

## Single-instance behavior

The catalog marks single-instance Applications. The launch module focuses the existing titled window instead of creating another one.

## Window defaults

- Application-specific dimensions: `src/config/apps.tsx`
- global fallback/minimum dimensions: `src/config/window.ts`
- Are.na dimension constants: `src/config/arenaWindows.ts`, consumed by the catalog

## Title-bar context menu

`DraggableWindow` uses `ContextMenu` for restore, minimize, maximize, share, and close commands. `generateShareUrl` maps the window's Application identity and current props back to a route.
