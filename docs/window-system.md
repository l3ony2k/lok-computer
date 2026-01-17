# Window System

The window system manages draggable, resizable windows with session persistence.

## Core Components

### WindowManagerProvider
Context provider that wraps the entire app.

```tsx
// src/pages/Index.tsx
<WindowManagerProvider>
  <RouteInterpreter />
  <Desktop />
</WindowManagerProvider>
```

### useWindowManager Hook
Access window management functions from any component.

```tsx
import { useWindowManager } from '@/hooks/useWindowManager';

const {
  windows,              // Array of all windows
  addWindow,            // Create a new window
  addOrFocusWindow,     // Create or focus existing
  closeWindow,          // Close by ID
  minimizeWindow,       // Minimize by ID
  maximizeWindow,       // Maximize by ID
  restoreWindow,        // Restore from min/max
  focusWindow,          // Bring to front
  activeWindow,         // Currently active window ID
  updateWindowPosition, // Update x, y
  updateWindowDimensions, // Update width, height
  updateWindowProps,    // Update serializable props
  isSessionRestored,    // True after session loads
} = useWindowManager();
```

---

## Creating Windows

### addWindow

Creates a new window instance.

```tsx
addWindow({
  title: "Window Title",
  content: <YourComponent />,
  width: 500,
  height: 400,
  iconType: "your-icon",
  
  // For session restoration:
  componentType: "YourComponent",
  props: { someData: "value" },
});
```

### addOrFocusWindow

For single-instance apps. If a window with the same title exists, focuses it instead of creating a duplicate.

```tsx
addOrFocusWindow({
  title: "Settings",
  content: <ConfigApp />,
  singleInstance: true,  // Required
  // ... other options
});
```

---

## Window Interface

```typescript
interface Window {
  id: string;           // Unique ID (auto-generated)
  title: string;        // Window title bar text
  content: ReactNode;   // React content to render
  componentType?: string; // For session restoration
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  minimized?: boolean;
  maximized?: boolean;
  zIndex: number;
  iconType?: string;
  props?: Record<string, unknown>; // Serializable props
}
```

---

## Session Persistence

Windows are automatically saved to IndexedDB and restored on page reload.

### What Gets Saved

```typescript
interface SerializableWindowData {
  id: string;
  title: string;
  componentType: string;  // Required for restoration
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

### Requirements for Restoration

1. **componentType** must be set when creating the window
2. **componentType** must exist in the Component Registry
3. **props** must be JSON-serializable

```tsx
// ✅ Will be restored
addWindow({
  title: "Channel: ephemeral-visual",
  content: <ChannelExplorer channelSlug="ephemeral-visual" />,
  componentType: "ChannelExplorer",
  props: { channelSlug: "ephemeral-visual" },
});

// ❌ Will NOT be restored (no componentType)
addWindow({
  title: "Some Window",
  content: <SomeComponent />,
});
```

---

## Component Registry

Maps component type names to React components.

### Location
`src/config/componentRegistry.tsx`

### Static Apps (from APP_LIST)
Automatically registered. Use the app's `name` as `componentType`.

### Dynamic Components
Manually registered for components opened with various props:

```tsx
const DYNAMIC_COMPONENTS: Record<string, ComponentRestoreConfig> = {
  'ChannelExplorer': {
    component: ChannelExplorer,
    defaultIcon: 'folder',
    defaultWidth: 600,
    defaultHeight: 500,
  },
  'BlockViewer': {
    component: BlockViewer,
    defaultIcon: 'block',
    defaultWidth: 500,
    defaultHeight: 600,
  },
};
```

---

## Window State Updates

### Update Props (for session persistence)

When app state changes that should persist:

```tsx
const { updateWindowProps } = useWindowManager();

// When user selects an item
updateWindowProps(windowId, { selectedItemId: item.id });
```

### Get Current Window ID

The window doesn't know its own ID by default. Pass it as a prop if needed:

```tsx
addWindow({
  title: "My Window",
  content: <MyApp onStateChange={(state) => updateWindowProps(id, state)} />,
  componentType: "MyApp",
});
```

---

## Z-Index Management

- New windows get highest z-index
- Focusing a window brings it to front
- Minimized windows are hidden (not z-indexed)

---

## Window Defaults

Defined in `src/config/window.ts`:

```typescript
export const WINDOW_DEFAULTS = {
  DEFAULT_WIDTH: 400,
  DEFAULT_HEIGHT: 300,
  MIN_WIDTH: 200,
  MIN_HEIGHT: 150,
};
```

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `windowPositions` | Saved positions for each window ID |
| `windowSession` | Full window session (all windows) |

---

## Debouncing

Session saves are debounced (500ms) to avoid excessive writes during rapid changes like dragging.
