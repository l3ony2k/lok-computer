# URL Routing & Deep Links

Users can open apps directly via URL.

## URL Schema

| Pattern | Example | Opens |
|---------|---------|-------|
| `/<app>` | `/about` | About app |
| `/<app>/<param>` | `/explorer/ephemeral-visual` | Channel Explorer |
| `/<app>?query` | `/about?tab=projects` | About with tab |
| `/open?w=a,b` | `/open?w=about,config` | Multiple windows |

---

## Supported Routes

| URL | Component | Props |
|-----|-----------|-------|
| `/about` | About | `initialTab` |
| `/config` | Config | - |
| `/arena` | Are.na | `username` |
| `/shelf` | Shelf | `initialTab`, `initialPage` |
| `/guestbook` | Guestbook | - |
| `/ai` | AI Talk | - |
| `/weather` | Weather | - |
| `/bsky` | Bsky | - |
| `/fedi` | Fedi | - |
| `/links` | Links | - |
| `/console` | Console | - |
| `/web` | Web | `initialUrl` |
| `/explorer/:channelSlug` | ChannelExplorer | `channelSlug`, `view`, `size`, `preview`, `block` |
| `/block/:blockId` | BlockViewer | `blockId` |
| `/image` | ImageViewer | `url` |

---

## Query Parameters

### Channel Explorer
```
/explorer/ephemeral-visual?view=list&size=L&preview=horizontal
```

| Param | Values | Description |
|-------|--------|-------------|
| `view` | `list`, `grid` | View mode |
| `size` | `S`, `M`, `L` | Icon size |
| `preview` | `off`, `horizontal`, `vertical` | Preview panel |
| `block` | `number` | Selected block ID |

### Tabbed Apps
```
/about?tab=projects
/shelf?tab=movie&page=2
```

| Param | Values | Description |
|-------|--------|-------------|
| `tab` | string | Active tab ID |
| `page` | number | Page number (Shelf only) |

### Web Browser
```
/web?url=https://example.com
```

---

## Multi-Window URLs

Open multiple windows at once:

```
/open?w=about,config,explorer/ephemeral-visual
```

Each window spec can include query params:
```
/open?w=about?tab=projects,shelf?tab=movie
```

---

## Implementation

### Route Configuration
Defined in `src/config/routes.ts`:

```typescript
export const ROUTES: RouteConfig[] = [
  {
    pattern: 'explorer/:channelSlug',
    componentType: 'ChannelExplorer',
    extractProps: (params, query) => ({
      channelSlug: params.channelSlug,
      initialGridSize: query.get('size'),
      initialIsListView: query.get('view') === 'list',
      initialPreviewMode: query.get('preview'),
      initialSelectedBlockId: query.get('block'),
    }),
    generateUrl: (props) => {
      // Logic to reconstruct URL with query params
    },
    iconType: 'folder',
    // ...
  },
];
```

### RouteInterpreter
Located at `src/components/RouteInterpreter.tsx`.

Behavior:
1. Waits for `isSessionRestored` (cached windows load first)
2. Parses URL path and query params
3. Matches against routes
4. Calls `addOrFocusWindow()` for each match
5. Navigates to `/` (cleans URL)

---

## Adding New Routes

1. Edit `src/config/routes.ts`:

```typescript
{
  pattern: 'your-app',
  componentType: 'Your App',  // Must match name in apps.tsx
  extractProps: (params, query) => ({
    someParam: query.get('param'),
  }),
  getTitle: () => 'Your App',
  iconType: 'your-icon',
  singleInstance: true,
}
```

2. If parametric route:

```typescript
{
  pattern: 'your-app/:itemId',
  extractProps: (params) => ({
    itemId: params.itemId,
  }),
  getTitle: (props) => `Item ${props.itemId}`,
}
```

---

## Behavior

### Session Preservation
URL windows open **on top of** cached windows. Existing session is not cleared.

### Single Instance
Apps marked `singleInstance: true` will focus existing window instead of creating duplicate.

### URL Cleanup
After processing, URL resets to `/`. This:
- Keeps URL clean
- Prevents re-opening on refresh
- Maintains shareable link on first load
