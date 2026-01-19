# Styling & Components

lok.computer uses Tailwind CSS with custom design tokens and reusable components.

---

## Reusable Components Reference

### RetroButton

Classic button with retro styling and active state.

```tsx
import { RetroButton } from '@/components/ui/RetroButton';

// Basic
<RetroButton onClick={handleClick}>Click Me</RetroButton>

// With active state (for tabs, toggles)
<RetroButton active={isActive} onClick={handleClick}>Tab</RetroButton>

// Small size (for toolbars)
<RetroButton size="sm">Small</RetroButton>

// Icon button
<RetroButton size="icon"><IconComponent /></RetroButton>

// Primary variant (bold text)
<RetroButton variant="primary">Primary</RetroButton>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'icon'` | `'md'` | Button size |
| `active` | `boolean` | `false` | Active/selected state |
| `variant` | `'default' \| 'primary'` | `'default'` | Visual variant |

---

### StateMessage

Centered message for loading, empty, or error states.

```tsx
import { StateMessage } from '@/components/ui/StateMessage';

// Full height (default)
<StateMessage>Loading...</StateMessage>

// Fixed height for grid areas
<StateMessage minHeight="h-48">No items found</StateMessage>

// With custom styling
<StateMessage className="text-red-500">Error occurred</StateMessage>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Message content |
| `minHeight` | `string` | `'h-full'` | Container height class |
| `className` | `string` | - | Additional classes |

---

### WindowLayout

Standard layout structure for app windows.

```tsx
import { WindowLayout } from '@/components/window/WindowLayout';

<WindowLayout
  toolbar={<div className="p-1 border-b">Toolbar</div>}
  footer={<div className="p-1 border-t text-xs">Status: Ready</div>}
  hasPadding={true}
  isScrollable={true}
>
  <div>Main content here</div>
</WindowLayout>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `toolbar` | `ReactNode` | - | Top toolbar area |
| `footer` | `ReactNode` | - | Bottom status bar |
| `hasPadding` | `boolean` | `true` | Add padding to content |
| `isScrollable` | `boolean` | `true` | Enable scrolling |
| `children` | `ReactNode` | - | Main content |

---

### PopupDialog

Modal dialog matching window style.

```tsx
import { PopupDialog, PopupDialogButtons } from '@/components/ui/PopupDialog';

<PopupDialog
  title="Confirm"
  iconType="config"
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  width={320}
  intrusive={true}  // Modal with overlay
>
  <p>Are you sure?</p>
  <PopupDialogButtons>
    <RetroButton onClick={handleConfirm}>Yes</RetroButton>
    <RetroButton onClick={() => setShowDialog(false)}>No</RetroButton>
  </PopupDialogButtons>
</PopupDialog>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Dialog title |
| `iconType` | `string` | `'config'` | Title bar icon |
| `isOpen` | `boolean` | - | Show/hide dialog |
| `onClose` | `() => void` | - | Close handler |
| `width` | `number` | `320` | Dialog width |
| `height` | `number` | - | Dialog height (auto if not set) |
| `intrusive` | `boolean` | `false` | Modal with overlay |
| `initialPosition` | `{x, y}` | - | Initial position |

---

### CustomIcon

Display icons from the icon library.

```tsx
import { CustomIcon } from '@/components/window/CustomIcon';

<CustomIcon iconType="folder" className="w-10 h-10" />
<CustomIcon iconType="about" className="w-4 h-4" />
```

#### Available Icon Types

| Icon Type | Description |
|-----------|-------------|
| `folder` | Folder icon |
| `image` | Image file |
| `text` | Text document |
| `video` | Video file |
| `link` | Web link |
| `other-channel` | Are.na channel |
| `config` | Settings cog |
| `console` | Terminal |
| `arena` | Are.na logo |
| `about` | lok.computer logo |
| `weather` | Weather icon |
| `bsky` | Bluesky logo |
| `globe` | Globe/web |
| `webpage` | Web page |
| `mailbox` | AI/robot |
| `mail` | Mail envelope |
| `fedi` | Fediverse logo |
| `shelf` | Bookshelf |
| `note` | Note/document |

---

### Resizable Panels

Split view with resizable divider.

```tsx
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={50} minSize={20}>
    Left content
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={50} minSize={30}>
    Right content
  </ResizablePanel>
</ResizablePanelGroup>
```

| Component | Props |
|-----------|-------|
| `ResizablePanelGroup` | `direction`: `'horizontal' \| 'vertical'` |
| `ResizablePanel` | `defaultSize`, `minSize`, `maxSize` (percentages) |
| `ResizableHandle` | `withHandle`: show grip icon |

---

### Tooltip

Hover tooltip with delay.

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>Tooltip text</TooltipContent>
</Tooltip>
```

---

### HoverCard

Rich content on hover.

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

<HoverCard>
  <HoverCardTrigger>Hover for more</HoverCardTrigger>
  <HoverCardContent>
    <p>Rich content with images, text, etc.</p>
  </HoverCardContent>
</HoverCard>
```

---

## Design System

### Color Scheme

Uses CSS custom properties for theming:

```css
/* Light mode */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --accent: 240 4.8% 95.9%;
  --border: 240 5.9% 90%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
}

/* Dark mode */
.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
}
```

### Theme Toggle

```tsx
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();
setTheme('dark'); // 'light', 'dark', or 'system'
```

---

## Tailwind Classes

### Common Patterns

```tsx
// Border
className="border border-border"

// Background
className="bg-background"
className="bg-secondary"
className="bg-muted"

// Text
className="text-foreground"
className="text-muted-foreground"

// Interactive
className="hover:bg-muted transition-colors"
```

### Responsive Breakpoints

```tsx
className="hidden md:block"  // Hidden on mobile
className="w-full md:w-1/2"  // Full width mobile, half on desktop
```

---

## Window Styling

Windows have a consistent structure:

```
┌────────────────────────────────────────┐
│ Title Bar (themed, draggable)          │
├────────────────────────────────────────┤
│ Toolbar (optional)                     │
├────────────────────────────────────────┤
│                                        │
│ Content Area (scrollable)              │
│                                        │
├────────────────────────────────────────┤
│ Footer (optional)                      │
└────────────────────────────────────────┘
```

---

## CRT Effect

Optional retro CRT effect in settings:

```tsx
settings.crt: {
  enabled: boolean;
  scanlines: number;  // 0-100
  flicker: number;    // 0-100
  rgbOffset: number;  // 0-100
  curvature: number;  // 0-100
}
```

---

## Adding New Icons

1. Add image to `src/assets/icons/`
2. Import in `CustomIcon.tsx`:
   ```tsx
   import yourIcon from '../../assets/icons/your-icon.png';
   ```
3. Add to `iconMap`:
   ```tsx
   const iconMap = {
     // ...
     'your-icon': yourIcon,
   };
   ```

---

## Typography

Prose styling via `@tailwindcss/typography`:

```tsx
<div className="prose dark:prose-invert">
  <h1>Heading</h1>
  <p>Paragraph with <a href="#">links</a>.</p>
</div>
```
