/* eslint-disable react-refresh/only-export-components -- catalog module, not a refresh root */
import React, { type ComponentType } from 'react';
import {
  About,
  BlockViewer,
  BskyPostsApp,
  ChannelBrowser,
  ChannelExplorer,
  ConfigApp,
  ConsoleApp,
  FediApp,
  GuestbookApp,
  ImageViewerApp,
  LinksApp,
  MediaPlayerApp,
  ShelfApp,
  AskAiApp,
  WeatherApp,
  WebBrowser,
  APP_MODULE_LOADERS,
} from '@/config/lazyApps';
import { ARENA_WINDOW_DEFAULTS } from '@/config/arenaWindows';

export interface ApplicationDefinition {
  componentType: string;
  name: string;
  iconType: string;
  // App modules have heterogeneous prop shapes; the catalog owns the erasure.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  loader: () => Promise<unknown>;
  defaultWidth: number;
  defaultHeight: number;
  defaultProps?: Record<string, unknown>;
  singleInstance?: boolean;
  showOnDesktop?: boolean;
}

const defineApplications = <T extends Record<string, ApplicationDefinition>>(definitions: T) => definitions;

/**
 * Authoritative application catalog.
 *
 * Launching, restoration, desktop/menu listing, and route interpretation all
 * consume this metadata. Dynamic windows live beside desktop applications so
 * dimensions and restoration identity cannot drift between registries.
 */
export const APPLICATIONS = defineApplications({
  'Are.na': {
    componentType: 'Are.na',
    name: 'Are.na',
    iconType: 'arena',
    component: ChannelBrowser,
    loader: APP_MODULE_LOADERS.ChannelBrowser,
    defaultWidth: ARENA_WINDOW_DEFAULTS.channelBrowser.width,
    defaultHeight: ARENA_WINDOW_DEFAULTS.channelBrowser.height,
    defaultProps: { username: 'lok' },
    showOnDesktop: true,
  },
  Web: {
    componentType: 'Web',
    name: 'Web',
    iconType: 'globe',
    component: WebBrowser,
    loader: APP_MODULE_LOADERS.Web,
    defaultWidth: 800,
    defaultHeight: 600,
    showOnDesktop: true,
  },
  Bsky: {
    componentType: 'Bsky',
    name: 'Bsky',
    iconType: 'bsky',
    component: BskyPostsApp,
    loader: APP_MODULE_LOADERS.Bsky,
    defaultWidth: 450,
    defaultHeight: 700,
    showOnDesktop: true,
  },
  Fedi: {
    componentType: 'Fedi',
    name: 'Fedi',
    iconType: 'fedi',
    component: FediApp,
    loader: APP_MODULE_LOADERS.Fedi,
    defaultWidth: 450,
    defaultHeight: 700,
    showOnDesktop: true,
  },
  // The componentType predates the Jev rewrite and stays stable for saved sessions.
  'AI Talk': {
    componentType: 'AI Talk',
    name: 'Ask AI',
    iconType: 'mailbox',
    component: AskAiApp,
    loader: APP_MODULE_LOADERS.AskAI,
    defaultWidth: 520,
    defaultHeight: 640,
    singleInstance: true,
    showOnDesktop: true,
  },
  MediaPlayer: {
    componentType: 'MediaPlayer',
    name: 'Media',
    iconType: 'media',
    component: MediaPlayerApp,
    loader: APP_MODULE_LOADERS.MediaPlayer,
    defaultWidth: 760,
    defaultHeight: 500,
    singleInstance: true,
    showOnDesktop: true,
  },
  Weather: {
    componentType: 'Weather',
    name: 'Weather',
    iconType: 'weather',
    component: WeatherApp,
    loader: APP_MODULE_LOADERS.Weather,
    defaultWidth: 860,
    defaultHeight: 525,
    showOnDesktop: true,
  },
  Console: {
    componentType: 'Console',
    name: 'Console',
    iconType: 'console',
    component: ConsoleApp,
    loader: APP_MODULE_LOADERS.Console,
    defaultWidth: 700,
    defaultHeight: 400,
    showOnDesktop: true,
  },
  Links: {
    componentType: 'Links',
    name: 'Links',
    iconType: 'webpage',
    component: LinksApp,
    loader: APP_MODULE_LOADERS.Links,
    defaultWidth: 500,
    defaultHeight: 600,
    singleInstance: true,
    showOnDesktop: true,
  },
  About: {
    componentType: 'About',
    name: 'About',
    iconType: 'about',
    component: About,
    loader: APP_MODULE_LOADERS.About,
    defaultWidth: 500,
    defaultHeight: 600,
    singleInstance: true,
    showOnDesktop: true,
  },
  Config: {
    componentType: 'Config',
    name: 'Config',
    iconType: 'config',
    component: ConfigApp,
    loader: APP_MODULE_LOADERS.Config,
    defaultWidth: 820,
    defaultHeight: 650,
    singleInstance: true,
    showOnDesktop: true,
  },
  Guestbook: {
    componentType: 'Guestbook',
    name: 'Guestbook',
    iconType: 'mail',
    component: GuestbookApp,
    loader: APP_MODULE_LOADERS.Guestbook,
    defaultWidth: 500,
    defaultHeight: 600,
    singleInstance: true,
    showOnDesktop: true,
  },
  Shelf: {
    componentType: 'Shelf',
    name: 'Shelf',
    iconType: 'shelf',
    component: ShelfApp,
    loader: APP_MODULE_LOADERS.Shelf,
    defaultWidth: 500,
    defaultHeight: 700,
    singleInstance: true,
    showOnDesktop: true,
  },
  ChannelExplorer: {
    componentType: 'ChannelExplorer',
    name: 'Channel',
    iconType: 'folder',
    component: ChannelExplorer,
    loader: APP_MODULE_LOADERS.ChannelExplorer,
    defaultWidth: ARENA_WINDOW_DEFAULTS.channelExplorer.width,
    defaultHeight: ARENA_WINDOW_DEFAULTS.channelExplorer.height,
  },
  BlockViewer: {
    componentType: 'BlockViewer',
    name: 'Block',
    iconType: 'block',
    component: BlockViewer,
    loader: APP_MODULE_LOADERS.BlockViewer,
    defaultWidth: ARENA_WINDOW_DEFAULTS.blockViewer.width,
    defaultHeight: ARENA_WINDOW_DEFAULTS.blockViewer.height,
  },
  ImageViewer: {
    componentType: 'ImageViewer',
    name: 'Images',
    iconType: 'image',
    component: ImageViewerApp,
    loader: APP_MODULE_LOADERS.ImageViewer,
    defaultWidth: 800,
    defaultHeight: 600,
    showOnDesktop: true,
  },
});

export type ApplicationType = keyof typeof APPLICATIONS;

export interface AppConfig extends ApplicationDefinition {
  props?: Record<string, unknown>;
}

export const APP_LIST: AppConfig[] = Object.values(APPLICATIONS)
  .filter((application) => application.showOnDesktop)
  .map((application) => ({
    ...application,
    props: application.defaultProps,
  }));

export const getApplicationDefinition = (componentType: string): ApplicationDefinition | undefined => (
  APPLICATIONS[componentType as ApplicationType]
);

export const createApplicationElement = (
  componentType: string,
  props: Record<string, unknown> = {},
  onPropsChange?: (props: Record<string, unknown>) => void,
): React.ReactElement | null => {
  const application = getApplicationDefinition(componentType);
  if (!application) {
    console.warn(`[ApplicationCatalog] Unknown application type: ${componentType}`);
    return null;
  }

  return React.createElement(application.component, {
    ...application.defaultProps,
    ...props,
    ...(onPropsChange ? { onPropsChange } : {}),
  });
};
