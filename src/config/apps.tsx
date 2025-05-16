import React from 'react';
import { ChannelBrowser } from '@/apps/arena/channels/ChannelBrowser';
import { WebBrowser } from '@/apps/web/WebBrowser';
import BskyPostsApp from '@/apps/bsky/BskyPostsApp';
import { WeatherApp } from '@/apps/weather/WeatherApp';
import { About } from '@/apps/about/About';
import { ConfigApp } from '@/apps/config/ConfigApp';

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
    name: "Weather",
    iconType: "weather",
    component: WeatherApp,
    defaultWidth: 860,
    defaultHeight: 525
  },
  {
    name: "About",
    iconType: "about",
    component: About,
    defaultWidth: 400,
    defaultHeight: 400
  },
  {
    name: "Config",
    iconType: "config",
    component: ConfigApp,
    defaultWidth: 400,
    defaultHeight: 500
  }
]; 