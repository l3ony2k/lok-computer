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

## Title Bar Context Menu

Clicking the app icon in the window title bar shows a context menu with window actions.

### Menu Items

The menu uses a **fixed layout** to maintain user muscle memory. 

| Item | Action | Availability |
|------|--------|--------------|
| **Restore** | Restores from Maximize | Only if window is maximized |
| **Minimize** | Minimizes to Taskbar | Always available |
| **Maximize** | Maximizes to Fullscreen| Only if window is not maximized |
| **Share Window** | Copies deep link | Always available |
| **About** | App Information | Currently placeholder |
| **Close** | Closes window | Always available |

*Note: Disabled actions appear with 50% opacity and `cursor-not-allowed`.*

### Share Window URL Generation

Uses `generateShareUrl(componentType, props)` from `routes.ts` to create proper deep-link URLs.

**Examples:**
| Window Type | Props | Generated URL |
|-------------|-------|---------------|
| About | `{}` | `https://lok.computer/about` |
| About | `{initialTab: 'projects'}` | `https://lok.computer/about?tab=projects` |
| ChannelExplorer | `{channelSlug: 'ephemeral'}` | `https://lok.computer/explorer/ephemeral` |
| BlockViewer | `{blockId: 12345}` | `https://lok.computer/block/12345` |


### State Synchronization

To ensure shared URLs verify the current state (not just initial props), apps utilize a synchronization mechanism:

1.  **Callback**: Apps receive an `onPropsChange` callback via props (injected by `componentRegistry`).
2.  **Trigger**: Apps call this function when internal state changes (e.g., tab selection, view mode).
3.  **Update**: The window manager updates `window.props` with the new values.
4.  **Generate**: `generateShareUrl` uses the updated props to create the link.

**Examples:**
| Window Type | Props Sync | Generated URL |
|-------------|------------|---------------|
| About | `{initialTab: 'projects'}` | `https://lok.computer/about?tab=projects` |
| Shelf | `{initialTab: 'progress', initialPage: 2}` | `https://lok.computer/shelf?tab=progress&page=2` |
| ChannelExplorer | `{initialPreviewMode: 'horizontal', initialSelectedBlockId: 123}` | `.../slug?preview=horizontal&block=123` |

### Components

- **ContextMenu** (`src/components/menu/ContextMenu.tsx`): Reusable context menu component
- **DraggableWindow** (`src/components/window/DraggableWindow.tsx`): Integrates the context menu
- **generateShareUrl** (`src/config/routes.ts`): URL generation function

### Extending the Menu

Edit `getContextMenuItems()` in `DraggableWindow.tsx`:

```tsx
return [
  {
    type: 'item',
    label: 'Window',
    subItems: windowSubItems,
  },
  {
    type: 'item',
    label: 'Share Window',
    action: () => { /* copy URL */ },
  },
  // Add new items here
  {
    type: 'item',
    label: 'New Feature',
    action: () => { /* your action */ },
  },
];
```

### ContextMenuItem Interface

```typescript
interface ContextMenuItem {
  type: 'item' | 'divider';
  label?: string;
  icon?: string;      // iconType for CustomIcon
  action?: () => void;
  disabled?: boolean;
  subItems?: ContextMenuItem[];
}
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
