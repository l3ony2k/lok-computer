# Styling

lok.computer uses Tailwind CSS with custom design tokens.

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
  /* ... */
}

/* Dark mode */
.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

### Theme Toggle

Uses `next-themes` for system-aware theming:

```tsx
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();
setTheme('dark'); // 'light', 'dark', or 'system'
```

---

## Common Components

### RetroButton

Standard button with active state:

```tsx
import { RetroButton } from '@/components/ui/RetroButton';

<RetroButton 
  active={isActive} 
  onClick={handleClick}
  size="sm"  // 'sm' | 'default'
>
  Button Text
</RetroButton>
```

### StateMessage

Centered message for loading/empty states:

```tsx
import { StateMessage } from '@/components/ui/StateMessage';

<StateMessage minHeight="h-24">
  Loading...
</StateMessage>
```

### WindowLayout

Standard window content layout:

```tsx
import { WindowLayout } from '@/components/window/WindowLayout';

<WindowLayout
  toolbar={<div>Toolbar</div>}
  footer={<div>Footer</div>}
  hasPadding={true}
>
  Content
</WindowLayout>
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

### Responsive

```tsx
className="hidden md:block"  // Hidden on mobile
className="w-full md:w-1/2"  // Full width mobile, half on desktop
```

---

## Window Styling

Windows have a consistent structure:

```
┌────────────────────────────────┐
│ Title Bar (colored/themed)     │
├────────────────────────────────┤
│ Toolbar (optional)             │
├────────────────────────────────┤
│                                │
│ Content Area (scrollable)      │
│                                │
├────────────────────────────────┤
│ Footer (optional)              │
└────────────────────────────────┘
```

---

## CRT Effect

Optional retro CRT effect with customizable intensity:

```tsx
// Settings in useUserSettings
settings.crt: {
  enabled: boolean;
  scanlines: number;  // 0-100
  flicker: number;    // 0-100
  rgbOffset: number;  // 0-100
  curvature: number;  // 0-100
}
```

CSS classes added to `<html>`:
- `.crt-effect`
- `.crt-flicker-active`
- `.crt-rgb-active`

---

## Custom Wallpaper

User can set custom wallpaper via settings:

```tsx
settings.wallpaper = "https://example.com/image.jpg";
```

Applied as CSS variable:
```css
--wallpaper-url: url("...");
```

---

## Icons

### CustomIcon Component

```tsx
import { CustomIcon } from '@/components/window/CustomIcon';

<CustomIcon iconType="folder" className="w-10 h-10" />
```

Icon types defined in `CustomIcon.tsx` → `ICON_MAP`.

### Adding Icons

1. Add image to `public/icons/`
2. Register in `ICON_MAP`:

```tsx
const ICON_MAP = {
  "your-icon": "/icons/your-icon.png",
  // Or with dark mode variant:
  "your-icon": {
    light: "/icons/your-icon-light.png",
    dark: "/icons/your-icon-dark.png"
  },
};
```

---

## Typography

Uses `@tailwindcss/typography` for prose content:

```tsx
<div className="prose dark:prose-invert">
  <h1>Heading</h1>
  <p>Paragraph text with <a href="#">links</a>.</p>
</div>
```

---

## Animations

Defined in `tailwind.config.ts`:

```javascript
animation: {
  "fade-in": "fadeIn 0.2s ease-out",
  "slide-in": "slideIn 0.2s ease-out",
}
```

Usage:
```tsx
className="animate-fade-in"
```
