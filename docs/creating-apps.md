# Creating New Apps

This guide walks you through creating a new app for lok.computer.

## Quick Start

1. Create app folder in `src/apps/your-app/`
2. Create main component `YourApp.tsx`
3. Register in `src/config/apps.tsx`
4. Add route in `src/config/routes.ts` (for deep linking)

---

## Step 1: Create the App Component

Create `src/apps/your-app/YourApp.tsx`:

```tsx
import { WindowLayout } from '@/components/window/WindowLayout';

interface YourAppProps {
  // Optional props for session restoration
  initialTab?: string;
}

export const YourApp = ({ initialTab = 'home' }: YourAppProps) => {
  return (
    <WindowLayout
      toolbar={<div className="p-1 border-b">Toolbar goes here</div>}
      footer={<div className="p-1 border-t text-xs">Footer</div>}
    >
      <div className="p-4">
        Your app content here
      </div>
    </WindowLayout>
  );
};
```

### WindowLayout Props

| Prop | Type | Description |
|------|------|-------------|
| `toolbar` | `ReactNode` | Top toolbar area |
| `footer` | `ReactNode` | Bottom status bar |
| `hasPadding` | `boolean` | Add padding to content (default: true) |
| `children` | `ReactNode` | Main content |

---

## Step 2: Register the App

Add to `src/config/apps.tsx`:

```tsx
import { YourApp } from '@/apps/your-app/YourApp';

export const APP_LIST: AppConfig[] = [
  // ... existing apps
  {
    name: "Your App",           // Display name
    iconType: "your-icon",      // Icon identifier (see CustomIcon.tsx)
    component: YourApp,         // React component
    defaultWidth: 500,          // Initial window width
    defaultHeight: 400,         // Initial window height
    props: {},                  // Default props
    singleInstance: true,       // Only allow one window
  },
];
```

### App Config Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Display name and identifier |
| `iconType` | `string` | ✅ | Icon key for CustomIcon |
| `component` | `React.ComponentType` | ✅ | The app component |
| `defaultWidth` | `number` | ✅ | Initial window width |
| `defaultHeight` | `number` | ✅ | Initial window height |
| `props` | `Record<string, any>` | ❌ | Default props |
| `singleInstance` | `boolean` | ❌ | Prevent duplicate windows |

---

## Step 3: Add an Icon

Edit `src/components/window/CustomIcon.tsx`:

```tsx
const ICON_MAP: Record<string, string | { light: string; dark: string }> = {
  // ... existing icons
  "your-icon": "/icons/your-icon.png",
  // Or with dark mode variant:
  "your-icon": {
    light: "/icons/your-icon-light.png",
    dark: "/icons/your-icon-dark.png"
  },
};
```

Add icon files to `public/icons/`.

---

## Step 4: Add URL Deep Link (Optional)

Add to `src/config/routes.ts`:

```tsx
export const ROUTES: RouteConfig[] = [
  // ... existing routes
  {
    pattern: 'your-app',
    componentType: 'Your App',  // Must match name in apps.tsx
    extractProps: (params, query) => ({
      initialTab: query.get('tab') || undefined,
    }),
    getTitle: () => 'Your App',
    iconType: 'your-icon',
    singleInstance: true,
    defaultWidth: 500,
    defaultHeight: 400,
  },
];
```

Now users can visit `/your-app` or `/your-app?tab=settings`.

---

## Step 5: Add State Persistence (Optional)

Use `usePersistedState` to save state across sessions:

```tsx
import { usePersistedState } from '@/hooks/useStorage';

export const YourApp = () => {
  const [activeTab, setActiveTab] = usePersistedState('app:your-app:tab', 'home');
  
  // activeTab persists in IndexedDB
};
```

Or use `getAppState`/`setAppState` for more complex state:

```tsx
import { getAppState, setAppState } from '@/lib/storage';

useEffect(() => {
  getAppState<YourState>('app:your-app:state').then(saved => {
    if (saved) setState(saved);
  });
}, []);

useEffect(() => {
  setAppState('app:your-app:state', state);
}, [state]);
```

---

## Common Patterns

### Tabbed Interface

```tsx
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';

export const TabbedApp = () => {
  const [activeTab, setActiveTab] = usePersistedState('app:myapp', 'tab1');

  return (
    <WindowLayout
      toolbar={
        <div className="flex p-1 space-x-1 border-b">
          <RetroButton active={activeTab === 'tab1'} onClick={() => setActiveTab('tab1')}>
            Tab 1
          </RetroButton>
          <RetroButton active={activeTab === 'tab2'} onClick={() => setActiveTab('tab2')}>
            Tab 2
          </RetroButton>
        </div>
      }
    >
      {activeTab === 'tab1' && <Tab1Content />}
      {activeTab === 'tab2' && <Tab2Content />}
    </WindowLayout>
  );
};
```

### Loading State

```tsx
import { StateMessage } from '@/components/ui/StateMessage';

if (loading) {
  return <StateMessage>Loading...</StateMessage>;
}
```

### Opening Child Windows

```tsx
import { useWindowManager } from '@/hooks/useWindowManager';

const { addWindow } = useWindowManager();

const handleOpenDetail = (itemId: number) => {
  addWindow({
    title: `Item ${itemId}`,
    content: <DetailViewer itemId={itemId} />,
    width: 400,
    height: 300,
    iconType: 'detail',
    componentType: 'DetailViewer',  // For session restoration
    props: { itemId },              // Serializable props
  });
};
```

---

## Checklist

- [ ] Created component in `src/apps/your-app/`
- [ ] Used `WindowLayout` for consistent structure
- [ ] Registered in `src/config/apps.tsx`
- [ ] Added icon to `CustomIcon.tsx` and `public/icons/`
- [ ] Added route in `src/config/routes.ts` (if deep linking needed)
- [ ] Used `usePersistedState` for state that should persist
- [ ] Set `componentType` and `props` when creating child windows
