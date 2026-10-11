# URL Routing and Deep Links

`RouteInterpreter` matches the arrival URL, launches one or more Applications after session restoration, then replaces the URL with `/` through `history.replaceState`. There is no routing library and no client-side navigation.

## URL forms

| Form | Example |
|---|---|
| static Application | `/about` |
| parametric Application | `/explorer/ephemeral-visual` |
| query state | `/about?tab=projects` |
| multiple Applications | `/open?w=about,config,explorer/ephemeral-visual` |

## Route responsibility

`src/config/routes.ts` owns only:

- path matching
- URL parameter extraction
- URL generation
- contextual window title

Icon, dimensions, lazy view, default props, and single-instance behavior come from the Application catalog.

```ts
{
  pattern: 'explorer/:channelSlug',
  componentType: 'ChannelExplorer',
  extractProps: (params, query) => ({
    channelSlug: params.channelSlug,
    initialGridSize: query.get('size'),
    initialIsListView: query.get('view') === 'list',
    initialPreviewMode: query.get('preview'),
    initialSelectedBlockId: query.get('block')
      ? Number(query.get('block'))
      : undefined,
  }),
  generateUrl: (props) => {
    // Reconstruct the shareable URL.
  },
  getTitle: (props) => String(props.channelSlug || 'Channel'),
}
```

## Route interpreter

`RouteInterpreter` (`src/components/RouteInterpreter.tsx`):

1. waits for `isSessionRestored`
2. reads `window.location` and parses the single or multi-window URL
3. matches route definitions
4. calls `useApplicationLauncher`
5. replaces the URL with `/`

Unknown paths never reach it in production: the Pages function (`functions/[[path]].ts`) answers them with a 404.

Deep-linked windows append to the restored Window session.

## Supported routes

| URL | Application props |
|---|---|
| `/about` | `initialTab` |
| `/config` | none |
| `/arena` | `username` |
| `/shelf` | `initialTab`, `initialPage` |
| `/guestbook` | none |
| `/ai` | none |
| `/weather` | none |
| `/bsky` | none |
| `/fedi` | none |
| `/links` | none |
| `/console` | none |
| `/web` | `initialUrl` |
| `/explorer/:channelSlug` | view, size, preview, selected block |
| `/block/:blockId` | `blockId` |
| `/image?url=...` | `imageUrl` |

## Adding a route

1. Ensure the Application exists in `APPLICATIONS`.
2. Add route-specific parsing and generation to `ROUTES`.
3. Do not repeat catalog metadata in the route.
