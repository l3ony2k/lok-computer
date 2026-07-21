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

const loadChannelBrowser = () => import('@/apps/arena/channels/ChannelBrowser');
const loadChannelExplorer = () => import('@/apps/arena/channels/ChannelExplorer');
const loadBlockViewer = () => import('@/apps/arena/blocks/BlockViewer');
const loadImageViewer = () => import('@/apps/imageviewer/ImageViewerApp');
const loadWebBrowser = () => import('@/apps/web/WebBrowser');
const loadBsky = () => import('@/apps/bsky/BskyPostsApp');
const loadFedi = () => import('@/apps/fedi/FediApp');
const loadWeather = () => import('@/apps/weather/WeatherApp');
const loadAbout = () => import('@/apps/about/About');
const loadConfig = () => import('@/apps/config/ConfigApp');
const loadConsole = () => import('@/apps/console/ConsoleApp');
const loadTalkToAI = () => import('@/apps/talk-to-ai/TalkToAI');
const loadGuestbook = () => import('@/apps/guestbook/GuestbookApp');
const loadShelf = () => import('@/apps/shelf/ShelfApp');
const loadLinks = () => import('@/apps/links/LinksApp');

export const ChannelBrowser = lazy(() =>
    loadChannelBrowser().then(m => ({ default: m.ChannelBrowser })));

export const ChannelExplorer = lazy(() =>
    loadChannelExplorer().then(m => ({ default: m.ChannelExplorer })));

export const BlockViewer = lazy(() =>
    loadBlockViewer().then(m => ({ default: m.BlockViewer })));

export const ImageViewerApp = lazy(() =>
    loadImageViewer().then(m => ({ default: m.ImageViewerApp })));

export const WebBrowser = lazy(() =>
    loadWebBrowser().then(m => ({ default: m.WebBrowser })));

export const BskyPostsApp = lazy(loadBsky);

export const FediApp = lazy(loadFedi);

export const WeatherApp = lazy(() =>
    loadWeather().then(m => ({ default: m.WeatherApp })));

export const About = lazy(() =>
    loadAbout().then(m => ({ default: m.About })));

export const ConfigApp = lazy(() =>
    loadConfig().then(m => ({ default: m.ConfigApp })));

export const ConsoleApp = lazy(() =>
    loadConsole().then(m => ({ default: m.ConsoleApp })));

export const TalkToAI = lazy(() =>
    loadTalkToAI().then(m => ({ default: m.TalkToAI })));

export const GuestbookApp = lazy(() =>
    loadGuestbook().then(m => ({ default: m.GuestbookApp })));

export const ShelfApp = lazy(() =>
    loadShelf().then(m => ({ default: m.ShelfApp })));

export const LinksApp = lazy(() =>
    loadLinks().then(m => ({ default: m.LinksApp })));
