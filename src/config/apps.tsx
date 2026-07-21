import React from 'react';
import {
  ChannelBrowser,
  WebBrowser,
  BskyPostsApp,
  FediApp,
  WeatherApp,
  About,
  ConfigApp,
  ConsoleApp,
  TalkToAI,
  GuestbookApp,
  ShelfApp,
  LinksApp,
} from '@/config/lazyApps';
import { ARENA_WINDOW_DEFAULTS } from '@/config/arenaWindows';

export interface AppConfig {
  name: string;
  iconType: string;
  // Apps have heterogeneous prop shapes; the registry erases them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  defaultWidth: number;
  defaultHeight: number;
  props?: Record<string, unknown>;
  singleInstance?: boolean; // If true, only one instance can be open at a time
}

export const APP_LIST: AppConfig[] = [
  {
    name: "Are.na",
    iconType: "arena",
    component: ChannelBrowser,
    defaultWidth: ARENA_WINDOW_DEFAULTS.channelBrowser.width,
    defaultHeight: ARENA_WINDOW_DEFAULTS.channelBrowser.height,
    props: { username: "lok" }
  },
  {
    name: "Web",
    iconType: "globe",
    component: WebBrowser,
    defaultWidth: 800,
    defaultHeight: 600
  },
  {
    name: "Bsky",
    iconType: "bsky",
    component: BskyPostsApp,
    defaultWidth: 450,
    defaultHeight: 700
  },
  {
    name: "Fedi",
    iconType: "fedi",
    component: FediApp,
    defaultWidth: 450,
    defaultHeight: 700
  },
  {
    name: "AI Talk",
    iconType: "mailbox",
    component: TalkToAI,
    defaultWidth: 400,
    defaultHeight: 600,
    singleInstance: true
  },
  {
    name: "Weather",
    iconType: "weather",
    component: WeatherApp,
    defaultWidth: 860,
    defaultHeight: 525
  },
  {
    name: "Console",
    iconType: "console",
    component: ConsoleApp,
    defaultWidth: 700,
    defaultHeight: 400
  },
  {
    name: "Links",
    iconType: "webpage",
    component: LinksApp,
    defaultWidth: 500,
    defaultHeight: 600,
    singleInstance: true
  },
  {
    name: "About",
    iconType: "about",
    component: About,
    defaultWidth: 500,
    defaultHeight: 600,
    singleInstance: true
  },
  {
    name: "Config",
    iconType: "config",
    component: ConfigApp,
    defaultWidth: 650,
    defaultHeight: 600,
    singleInstance: true
  },
  {
    name: "Guestbook",
    iconType: "mail",
    component: GuestbookApp,
    defaultWidth: 500,
    defaultHeight: 600,
    singleInstance: true
  },
  {
    name: "Shelf",
    iconType: "shelf",
    component: ShelfApp,
    defaultWidth: 500,
    defaultHeight: 700,
    singleInstance: true
  }
];
