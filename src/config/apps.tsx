import React from 'react';
import { ChannelBrowser } from '@/apps/arena/channels/ChannelBrowser';
import { WebBrowser } from '@/apps/web/WebBrowser';
import BskyPostsApp from '@/apps/bsky/BskyPostsApp';
import FediApp from '@/apps/fedi/FediApp';
import { WeatherApp } from '@/apps/weather/WeatherApp';
import { About } from '@/apps/about/About';
import { ConfigApp } from '@/apps/config/ConfigApp';
import { ConsoleApp } from '@/apps/console/ConsoleApp';
import { TalkToAI } from '@/apps/talk-to-ai/TalkToAI';
import { GuestbookApp } from '@/apps/guestbook/GuestbookApp';
import { ShelfApp } from '@/apps/shelf/ShelfApp';
import { ButtonsApp } from '@/apps/buttons/ButtonsApp';

export interface AppConfig {
  name: string;
  iconType: string;
  component: React.ComponentType<any>;
  defaultWidth: number;
  defaultHeight: number;
  props?: Record<string, any>;
  singleInstance?: boolean; // If true, only one instance can be open at a time
}

export const APP_LIST: AppConfig[] = [
  {
    name: "Are.na",
    iconType: "arena",
    component: ChannelBrowser,
    defaultWidth: 400,
    defaultHeight: 500,
    props: { username: "lok" }
  },
  {
    name: "Web",
    iconType: "webpage",
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
    name: "Buttons",
    iconType: "note",
    component: ButtonsApp,
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
    defaultWidth: 400,
    defaultHeight: 500,
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
