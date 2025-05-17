import React from 'react';
import { ChannelBrowser } from '@/apps/arena/channels/ChannelBrowser';
import { WebBrowser } from '@/apps/web/WebBrowser';
import BskyPostsApp from '@/apps/bsky/BskyPostsApp';
import { WeatherApp } from '@/apps/weather/WeatherApp';
import { About } from '@/apps/about/About';
import { ConfigApp } from '@/apps/config/ConfigApp';
import { ConsoleApp } from '@/apps/console/ConsoleApp';
import { TalkToAI } from '@/apps/talk-to-ai/TalkToAI';

export interface AppConfig {
  name: string;
  iconType: string;
  component: React.ComponentType<any>;
  defaultWidth: number;
  defaultHeight: number;
  props?: Record<string, any>;
}

export const APP_LIST: AppConfig[] = [
  {
    name: "Are.na Browser",
    iconType: "arena",
    component: ChannelBrowser,
    defaultWidth: 600,
    defaultHeight: 500,
    props: { username: "lok" }
  },
  {
    name: "Web Browser",
    iconType: "webpage",
    component: WebBrowser,
    defaultWidth: 800,
    defaultHeight: 600
  },
  {
    name: "Bsky Posts",
    iconType: "bsky",
    component: BskyPostsApp,
    defaultWidth: 450,
    defaultHeight: 700
  },
  {
    name: "Talk to AI",
    iconType: "mailbox",
    component: TalkToAI,
    defaultWidth: 400,
    defaultHeight: 600
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
    name: "About",
    iconType: "about",
    component: About,
    defaultWidth: 500,
    defaultHeight: 600
  },
  {
    name: "Config",
    iconType: "config",
    component: ConfigApp,
    defaultWidth: 400,
    defaultHeight: 500
  }
]; 