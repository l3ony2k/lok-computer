import React from 'react';
import { ChannelBrowser } from '@/apps/arena/channels/ChannelBrowser';
import { WebBrowser } from '@/apps/web/WebBrowser';
import BskyPostsApp from '@/apps/bsky/BskyPostsApp';
import { WeatherApp } from '@/apps/weather/WeatherApp';
import { About } from '@/apps/about/About';
import { ConfigApp } from '@/apps/config/ConfigApp';
import { ConsoleApp } from '@/apps/console/ConsoleApp';
import { TalkToAI } from '@/apps/talk-to-ai/TalkToAI';
import { LinkFolder } from '@/apps/arena/components/LinkFolder';
import { ContentItem } from '@/apps/arena/utils/contentItems';

export interface AppConfig {
  name: string;
  iconType: string;
  component: React.ComponentType<any>;
  defaultWidth: number;
  defaultHeight: number;
  props?: Record<string, any>;
}

const links: ContentItem[] = [
  { id: 1, base_class: 'Block', class: 'Link', title: 'leonw.ong', source: { url: 'https://leonw.ong', title: '' } },
  { id: 2, base_class: 'Block', class: 'Link', title: 'are.na/lok', source: { url: 'https://are.na/lok', title: '' } },
  { id: 3, base_class: 'Block', class: 'Link', title: 'leon.thoughts.page', source: { url: 'https://leon.thoughts.page', title: '' } },
  { id: 4, base_class: 'Block', class: 'Link', title: 'l3on.site (blog)', source: { url: 'https://l3on.site', title: '' } },
  { id: 5, base_class: 'Block', class: 'Link', title: 'exa.ee/leon', source: { url: 'https://exa.ee/leon', title: '' } },
  { id: 6, base_class: 'Block', class: 'Link', title: 'letterbird.co/lok', source: { url: 'https://letterbird.co/lok', title: '' } },
];

export const APP_LIST: AppConfig[] = [
  {
    name: "Links",
    iconType: "folder",
    component: LinkFolder,
    defaultWidth: 600,
    defaultHeight: 500,
    props: { items: links, title: "Links" }
  },
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