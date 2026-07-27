/* eslint-disable react-refresh/only-export-components -- loader catalog intentionally shares lazy exports */
/**
 * Lazy-loaded app components.
 *
 * Every app is code-split into its own chunk and only downloaded the first
 * time a window for it is opened. Window content renders inside the Suspense
 * boundary in DraggableWindow, which shows a lightweight fallback while the
 * chunk loads.
 *
 * All consumers (APP_LIST, the component registry, TopBar, Desktop) must use
 * these instead of importing app components directly — a static import would
 * pull the app back into the entry bundle.
 */

import { lazy } from 'react';

/**
 * The loader map is the single source of truth for app chunks. Lazy rendering
 * and startup warming both consume these exact functions, so adding an app can
 * no longer update one path while missing the other.
 */
export const APP_MODULE_LOADERS = {
    ChannelBrowser: () => import('@/apps/arena/channels/ChannelBrowser'),
    ChannelExplorer: () => import('@/apps/arena/channels/ChannelExplorer'),
    BlockViewer: () => import('@/apps/arena/blocks/BlockViewer'),
    ImageViewer: () => import('@/apps/imageviewer/ImageViewerApp'),
    Web: () => import('@/apps/web/WebBrowser'),
    Bsky: () => import('@/apps/bsky/BskyPostsApp'),
    Fedi: () => import('@/apps/fedi/FediApp'),
    Weather: () => import('@/apps/weather/WeatherApp'),
    About: () => import('@/apps/about/About'),
    Config: () => import('@/apps/config/ConfigApp'),
    Console: () => import('@/apps/console/ConsoleApp'),
    TalkToAI: () => import('@/apps/talk-to-ai/TalkToAI'),
    Guestbook: () => import('@/apps/guestbook/GuestbookApp'),
    Shelf: () => import('@/apps/shelf/ShelfApp'),
    Links: () => import('@/apps/links/LinksApp'),
} as const;

export const ChannelBrowser = lazy(() =>
    APP_MODULE_LOADERS.ChannelBrowser().then(m => ({ default: m.ChannelBrowser })));

export const ChannelExplorer = lazy(() =>
    APP_MODULE_LOADERS.ChannelExplorer().then(m => ({ default: m.ChannelExplorer })));

export const BlockViewer = lazy(() =>
    APP_MODULE_LOADERS.BlockViewer().then(m => ({ default: m.BlockViewer })));

export const ImageViewerApp = lazy(() =>
    APP_MODULE_LOADERS.ImageViewer().then(m => ({ default: m.ImageViewerApp })));

export const WebBrowser = lazy(() =>
    APP_MODULE_LOADERS.Web().then(m => ({ default: m.WebBrowser })));

export const BskyPostsApp = lazy(APP_MODULE_LOADERS.Bsky);

export const FediApp = lazy(APP_MODULE_LOADERS.Fedi);

export const WeatherApp = lazy(() =>
    APP_MODULE_LOADERS.Weather().then(m => ({ default: m.WeatherApp })));

export const About = lazy(() =>
    APP_MODULE_LOADERS.About().then(m => ({ default: m.About })));

export const ConfigApp = lazy(() =>
    APP_MODULE_LOADERS.Config().then(m => ({ default: m.ConfigApp })));

export const ConsoleApp = lazy(() =>
    APP_MODULE_LOADERS.Console().then(m => ({ default: m.ConsoleApp })));

export const TalkToAI = lazy(() =>
    APP_MODULE_LOADERS.TalkToAI().then(m => ({ default: m.TalkToAI })));

export const GuestbookApp = lazy(() =>
    APP_MODULE_LOADERS.Guestbook().then(m => ({ default: m.GuestbookApp })));

export const ShelfApp = lazy(() =>
    APP_MODULE_LOADERS.Shelf().then(m => ({ default: m.ShelfApp })));

export const LinksApp = lazy(() =>
    APP_MODULE_LOADERS.Links().then(m => ({ default: m.LinksApp })));
