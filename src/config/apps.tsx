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
import { GuestbookApp } from '@/apps/guestbook/GuestbookApp';

export interface AppConfig {
  name: string;
  iconType: string;
  component: React.ComponentType<any>;
  defaultWidth: number;
  defaultHeight: number;
  props?: Record<string, any>;
}

const links: ContentItem[] = [
  { id:  1, base_class: 'Block', class: 'Link', title: 'my site (leonw.ong)', source: { url: 'https://leonw.ong', title: '' } },
  { id:  2, base_class: 'Block', class: 'Link', title: 'are.na blocks canvas', source: { url: 'https://abc.lok.computer', title: '' } },
  { id:  3, base_class: 'Block', class: 'Link', title: 'my thoughts.page', source: { url: 'https://leon.thoughts.page', title: '' } },
  { id:  4, base_class: 'Block', class: 'Link', title: 'my blog (chinese)', source: { url: 'https://l3on.site', title: '' } },
  { id:  5, base_class: 'Block', class: 'Link', title: 'my are.na profile', source: { url: 'https://are.na/lok', title: '' } },
  { id:  6, base_class: 'Block', class: 'Link', title: 'my omg.lol', source: { url: 'https://lok.omg.lol/', title: '' } },
  { id:  7, base_class: 'Block', class: 'Link', title: 'my kinopio page', source: { url: 'https://kinopio.club/embed/?spaceId=WxFUq5kPNkJ0gFgapKSGk&zoom=60', title: '' } },
  { id:  8, base_class: 'Block', class: 'Link', title: 'my letterbird (mail)', source: { url: 'https://letterbird.co/lok', title: '' } },
  { id:  9, base_class: 'Block', class: 'Link', title: 'my special.fish', source: { url: 'https://special.fish/lok', title: '' } },
  { id: 10, base_class: 'Block', class: 'Link', title: 'my yourworldoftext.com', source: { url: 'https://www.yourworldoftext.com/~lok', title: '' } },
];

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
    name: "AI Talk",
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
  },
  {
    name: "Links",
    iconType: "folder",
    component: LinkFolder,
    defaultWidth: 300,
    defaultHeight: 400,
    props: { items: links, title: "Links" }
  },
  {
    name: "Guestbook",
    iconType: "mail",
    component: GuestbookApp,
    defaultWidth: 500,
    defaultHeight: 600
  }
]; 