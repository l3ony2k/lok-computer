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
| `fedi` | GoToSocial sloth |
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

The desktop has eight themes. `lok` is the native monospace system with light and dark modes. The rest recreate other systems after open-source CSS libraries (licenses in `src/themes/*/LICENSE`):

| Theme | Source | Layout | Desktop |
|-------|--------|--------|---------|
| `98` | [98.css](https://github.com/jdan/98.css) | classic taskbar | teal |
| `xp` | [XP.css](https://github.com/botoxparty/XP.css) | classic taskbar | Bliss |
| `7` | [7.css](https://github.com/khang-nd/7.css) | classic taskbar | Harmony |
| `system` | [system.css](https://github.com/sakofchit/system.css) | menu bar | 50% gray pattern |
| `tui` | [TuiCss](https://github.com/vinibiavatti1/TuiCss) | menu bar and status line | `░` cells |
| `386` | [BOOTSTRA.386](https://github.com/kristopolous/BOOTSTRA.386) | menu bar and status line | DOS blue |
| `cs16` | [cs16.css](https://github.com/ekmas/cs16.css) | classic taskbar | CS 1.6 menu art |

```tsx
import { useTheme } from '@/hooks/useTheme';

const { theme, appearance, colorScheme, setTheme, setAppearance, prefetchTheme } = useTheme();
await setTheme('98');        // loads stylesheet, fonts, and wallpaper, then swaps atomically
setAppearance('dark');       // light | dark | system; only lok has two schemes
```

A theme's picture is registered as `wallpaper` in `theme.ts` and painted by `Desktop.tsx` as an `<img class="desktop-wallpaper" decoding="sync">` layer, not as a CSS background. Keep `--desktop-pattern` for the cheap colour or gradient that shows under it; a `url()` there would be rasterised again on every window drag and could checkerboard after a tab switch.

How it fits together:

| Layer | File | Role |
|-------|------|------|
| Registry and engine | `src/lib/theme.ts` | Theme metadata, preference parsing, lazy loading of styles, fonts, and wallpaper, root attributes |
| Pre-paint | `index.html` inline script | Sets `data-theme`, `data-layout`, `data-chrome`, `.dark`, and `color-scheme` before React |
| Provider | `src/hooks/useTheme.tsx` | State, OS scheme tracking, cross-tab sync |
| Base tokens | `src/index.css` `:root` / `.dark` | lok values for every token |
| Classic components | `src/themes/classic.css` | Bevels, title bars, menu bar, taskbar, menus, fields, and controls drawn from `--c-*` component tokens |
| Theme skins | `src/themes/<id>/theme.css` | Token values, caption glyphs, scrollbars, fonts, desktop stand-in |

Two root attributes describe a theme. `data-layout` is the desktop arrangement: `lok` keeps the top bar (system menu, frontmost window name, clock) and a bottom task strip; `classic` merges start menu, tasks, and tray into one taskbar. `data-chrome` picks the component layer: `classic` loads `classic.css` under either layout, which is how System, TUI, and 386 pair classic controls with a top menu bar.

Scoping: classic rules use `html[data-chrome="classic"]:not(#_)` and theme rules `html[data-theme="98"][data-layout]:not(#_)`. The never-matching id gives them id-level specificity, so they override base component rules without `!important`, and a theme skin always beats the shared classic layer regardless of stylesheet order. Keep classic rules to one attribute so skins keep winning.

Bitmap fonts (Chicago, Geneva, Perfect DOS VGA 437, ArialPixel) sit on a 16px grid and blur at any other size, so the System, TUI, 386, and CS 1.6 skins set every UI element to 16px. Their glyphs (caption buttons, checkboxes, scroll arrows) are pixel-exact SVGs in `src/themes/<id>/icons/`; the DOS ones are rendered from the VGA font itself.

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

Window chrome exposes stable hooks for skins: `.window-surface[data-active]`, `.window-titlebar`, `.window-title`, `.window-controls`, and `.window-control[data-window-control="minimize|maximize|restore|close"]`. Skins can set `.window-controls { display: contents }` and reorder controls with `order` (System and TUI put close on the left). The lok-layout top bar renders `.app-header`, `.system-menu-button`, and `.app-header-active`; classic layouts render `.start-button`, `.taskbar-tasks`, `.taskbar-tray`, and `.taskbar-clock`, and the system menu becomes `.app-menu-panel[data-placement="bottom"]` with an `.app-menu-banner`.

Toasts use the theme face and window frame; classic skins can set `--c-toast-width`, `--c-toast-padding`, and `--c-toast-title-weight`.

The "no rounded corners" rule applies to lok and to Tailwind classes. Skins keep their source systems' shapes inside theme CSS.

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

1. Draw the icon in `scripts/pixel-icons.mjs` (an ASCII grid on the 32×32 canvas using the shared palette; add a `vector` layer only for detail the grid cannot carry, such as a logo) and run `node scripts/pixel-icons.mjs --only your-icon`, which writes `src/assets/icons/your-icon.png`
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
