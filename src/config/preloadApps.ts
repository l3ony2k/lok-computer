const APP_MODULE_LOADERS = [
  () => import("@/apps/arena/channels/ChannelBrowser"),
  () => import("@/apps/arena/channels/ChannelExplorer"),
  () => import("@/apps/arena/blocks/BlockViewer"),
  () => import("@/apps/imageviewer/ImageViewerApp"),
  () => import("@/apps/web/WebBrowser"),
  () => import("@/apps/bsky/BskyPostsApp"),
  () => import("@/apps/fedi/FediApp"),
  () => import("@/apps/weather/WeatherApp"),
  () => import("@/apps/about/About"),
  () => import("@/apps/config/ConfigApp"),
  () => import("@/apps/console/ConsoleApp"),
  () => import("@/apps/talk-to-ai/TalkToAI"),
  () => import("@/apps/guestbook/GuestbookApp"),
  () => import("@/apps/shelf/ShelfApp"),
  () => import("@/apps/links/LinksApp"),
];

export const APP_MODULE_COUNT = APP_MODULE_LOADERS.length;

export const preloadAppModules = async (onProgress?: (loaded: number, total: number) => void) => {
  let loaded = 0;
  const results = await Promise.allSettled(APP_MODULE_LOADERS.map(async (loader) => {
    await loader();
    loaded += 1;
    onProgress?.(loaded, APP_MODULE_LOADERS.length);
  }));

  return results.filter((result) => result.status === "rejected").length;
};
