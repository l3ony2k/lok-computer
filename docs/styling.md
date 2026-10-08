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

### Themes

The desktop has four themes. `lok` is the native monospace system with light and dark modes; `98`, `xp`, and `7` recreate classic desktops after [98.css](https://github.com/jdan/98.css), [XP.css](https://github.com/botoxparty/XP.css), and [7.css](https://github.com/khang-nd/7.css) (MIT, licenses in `src/themes/*/LICENSE`).

```tsx
import { useTheme } from '@/hooks/useTheme';

const { theme, appearance, colorScheme, setTheme, setAppearance, prefetchTheme } = useTheme();
await setTheme('98');        // loads the stylesheet, then swaps atomically
setAppearance('dark');       // light | dark | system; only lok has two schemes
```

How it fits together:

| Layer | File | Role |
|-------|------|------|
| Registry and engine | `src/lib/theme.ts` | Theme metadata, preference parsing, lazy style loading, root attributes |
| Pre-paint | `index.html` inline script | Sets `data-theme`, `data-layout`, `.dark`, and `color-scheme` before React |
| Provider | `src/hooks/useTheme.tsx` | State, OS scheme tracking, cross-tab sync |
| Base tokens | `src/index.css` `:root` / `.dark` | lok values for every token |
| Classic structure | `src/themes/classic.css` | Bevels, title bars, taskbar, menus, fields, and controls drawn from `--c-*` component tokens |
| Theme skins | `src/themes/{98,xp,7}/theme.css` | Token values, caption glyphs, scrollbars, fonts, start button |

Scoping: classic rules use `html[data-layout="classic"]:not(#_)` and theme rules `html[data-theme="98"][data-layout]:not(#_)`. The never-matching id gives them id-level specificity, so they override base component rules without `!important`, and a theme skin always beats the shared classic layer regardless of stylesheet order.

Theme-level tokens every surface should use:

```css
--font-ui, --font-code            /* UI and code typefaces */
--text-color, --link-color
--detail-bg, --detail-header-bg   /* window content and its chrome */
--header-bg, --block-bg, --button-bg, --button-hover
--internal-border, --block-border
--selection-bg, --selection-fg
--desktop-bg, --desktop-pattern, --desktop-pattern-size, --desktop-label-color
--media-stage-bg, --media-stage-fg, --media-accent
```

Window chrome exposes stable hooks for skins: `.window-surface[data-active]`, `.window-titlebar`, `.window-title`, `.window-controls`, and `.window-control[data-window-control="minimize|maximize|restore|close"]`. In classic layouts the taskbar renders `.start-button`, `.taskbar-tasks`, `.taskbar-tray`, and `.taskbar-clock`; the system menu becomes `.app-menu-panel[data-placement="bottom"]` with an `.app-menu-banner`.

The "no rounded corners" rule applies to lok and to Tailwind classes. The XP and 7 skins keep their source systems' curves inside theme CSS.

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

### Browser-Filter-Safe Hooks

For first-party UI that resembles a social feed or advertisement, use project-specific CSS hooks based on the component's visual role. Prefer names such as `lok-reader-entry` over generic hooks such as `social-post`, `social-feed`, or `social-media`.

Brave Shields in aggressive mode can apply cosmetic filter selectors after the initial paint. The characteristic symptom is content that flashes briefly and then disappears even though the API returned valid JSON and the elements remain in the DOM. Compare aggressive Shields with **Adblock only** or Shields disabled, then inspect computed styles before investigating the API, cache, or Cloudflare Worker.

When renaming a hook, update its JSX class and every CSS reference, including container-query and responsive selectors. Do not rename API paths, query keys, or cache keys as part of a cosmetic-filter workaround.

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
