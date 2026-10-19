/**
 * Lazy-loaded app components.
 *
 * Every app is code-split into its own chunk and only downloaded the first
 * time a window for it is opened. Window content renders inside the Suspense
 * boundary in DraggableWindow, which shows a lightweight fallback while the
 * chunk loads; a chunk that fails to download (offline) renders a retry.
 *
 * All consumers (APP_LIST, the component registry, TopBar, Desktop) must use
 * these instead of importing app components directly — a static import would
 * pull the app back into the entry bundle.
 */

import { lazy as reactLazy, type ComponentType } from 'react';
import { ChunkRetry, type LazyModule } from '@/components/window/ChunkRetry';

/**
 * `React.lazy` that survives a failed download. A lazy component remembers a
 * rejection for the rest of the session, so the failure resolves to a retry
 * view instead, and the real module is fetched again from there.
 */
const lazy = <P extends object>(load: () => Promise<LazyModule<P>>) => reactLazy(() =>
    load().catch((error: unknown) => {
        console.warn('[App] Module failed to load:', error);
        const Fallback = (props: P) => <ChunkRetry load={load} props={props} />;
        return { default: Fallback as ComponentType<P> };
    }),
);

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
    AskAI: () => import('@/apps/ask-ai/AskAiApp'),
    Guestbook: () => import('@/apps/guestbook/GuestbookApp'),
    Shelf: () => import('@/apps/shelf/ShelfApp'),
    Links: () => import('@/apps/links/LinksApp'),
    MediaPlayer: () => import('@/apps/media/MediaPlayerApp'),
    Notepad: () => import('@/apps/notepad/NotepadApp'),
    Chance: () => import('@/apps/chance/ChanceApp'),
    Clock: () => import('@/apps/clock/ClockApp'),
    Calculator: () => import('@/apps/calculator/CalculatorApp'),
    Document: () => import('@/apps/document/DocumentApp'),
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

export const AskAiApp = lazy(() =>
    APP_MODULE_LOADERS.AskAI().then(m => ({ default: m.AskAiApp })));

export const GuestbookApp = lazy(() =>
    APP_MODULE_LOADERS.Guestbook().then(m => ({ default: m.GuestbookApp })));

export const ShelfApp = lazy(() =>
    APP_MODULE_LOADERS.Shelf().then(m => ({ default: m.ShelfApp })));

export const LinksApp = lazy(() =>
    APP_MODULE_LOADERS.Links().then(m => ({ default: m.LinksApp })));

export const MediaPlayerApp = lazy(() =>
    APP_MODULE_LOADERS.MediaPlayer().then(m => ({ default: m.MediaPlayerApp })));

export const NotepadApp = lazy(() =>
    APP_MODULE_LOADERS.Notepad().then(m => ({ default: m.NotepadApp })));

export const ChanceApp = lazy(() =>
    APP_MODULE_LOADERS.Chance().then(m => ({ default: m.ChanceApp })));

export const ClockApp = lazy(() =>
    APP_MODULE_LOADERS.Clock().then(m => ({ default: m.ClockApp })));

export const CalculatorApp = lazy(() =>
    APP_MODULE_LOADERS.Calculator().then(m => ({ default: m.CalculatorApp })));

export const DocumentApp = lazy(() =>
    APP_MODULE_LOADERS.Document().then(m => ({ default: m.DocumentApp })));
