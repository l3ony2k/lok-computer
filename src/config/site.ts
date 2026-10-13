/**
 * Who this desktop belongs to: the deployment settings and the personal
 * content the apps show (About's bio, links and projects, the Browser's
 * bookmarks). A fork replaces this file; everything here is lok.computer's own
 * and not covered by the code licence (see NOTICE.md).
 */
import { DEPLOYMENT } from './env';

import omglolButton from '@/assets/buttons/omglol.png';
import letterboxdButton from '@/assets/buttons/letterboxd.png';
import blueskyButton from '@/assets/buttons/bluesky.png';
import instagramButton from '@/assets/buttons/instagram.png';
import mastodonButton from '@/assets/buttons/mastodon.png';
import tumblrButton from '@/assets/buttons/tumblr.png';
import telegramButton from '@/assets/buttons/telegram.gif';
import twitterButton from '@/assets/buttons/twitter.gif';
import mailButton from '@/assets/buttons/email.png';
import l3onButton from '@/assets/buttons/l3on.gif';
import codebergButton from '@/assets/buttons/codeberg.gif';

export const SITE = {
  name: 'lok.computer',
  url: DEPLOYMENT.VITE_SITE_URL,
  repository: 'https://github.com/l3ony2k/lok-computer',
};

export interface ProfileLink {
  text: string;
  url: string;
  /** Optional 88×31 button; without one the text is shown (with a marquee if it overflows). */
  image?: string;
}

export interface ProfileLinkGroup {
  handle: string;
  links: ProfileLink[];
}

/** About › About me. */
export const PROFILE = {
  quote: { text: 'Men must live and create. Live to the point of tears.', author: 'Albert Camus' },
  bio: [
    "Hello there, and welcome! I'm Leon / Lok, a curious soul who finds joy in exploring every corner of the web. I'm not a designer or developer, I just love creating and tinkering digital / physical things.",
    'This is my personal space, not much going on here, but still feel free to wander through and poke around. Every visit inspires me, and I hope you feel just as welcomed here.',
  ],
  linkGroups: [
    {
      handle: '@lok',
      links: [
        { text: 'are.na', url: 'https://are.na/lok' },
        { text: 'fediverse', url: 'https://rex.cat/@lok', image: mastodonButton },
        { text: 'bsky', url: 'https://lok.on.computer', image: blueskyButton },
        { text: 'neodb', url: 'https://neodb.social/users/lok' },
        { text: 'status.cafe', url: 'https://status.cafe/users/lok', image: 'https://status.cafe/assets/button.png' },
        { text: 'special.fish', url: 'https://special.fish/lok' },
        { text: 'omg.lol', url: 'https://omg.lol/lok', image: omglolButton },
        { text: 'sr.ht', url: 'https://sr.ht/~lok' },
        { text: 'codeberg', url: 'https://codeberg.org/lok', image: codebergButton },
        { text: 'nekoweb', url: 'https://lok.nekoweb.org', image: 'https://nekoweb.org/assets/buttons/button11.gif' },
        { text: 'signal', url: 'https://signal.me/#eu/8Q-JFgLhjGbsPSfgMHep65NmUJNKxTr1uyO-arsGq6AUf2ZaxrtPHY4WLiLrwm9D' },
        { text: 'tumblr', url: 'https://tumblr.com/lokw', image: tumblrButton },
        { text: 'matrix', url: 'https://matrix.to/#/@lok:mtx.owu.one' },
        { text: 'xmpp', url: 'https://xmpp.link/#lok@xmpp.is' },
      ],
    },
    {
      handle: '@l3on_y2k',
      links: [
        { text: 'blog', url: 'https://l3on.site', image: l3onButton },
        { text: 'github', url: 'https://github.com/l3ony2k' },
        { text: 'instagram', url: 'https://instagram.com/l3on_y2k', image: instagramButton },
        { text: 'telegram', url: 'https://t.me/l3on_y2k', image: telegramButton },
        { text: 'twitter', url: 'https://twitter.com/l3on_y2k', image: twitterButton },
        { text: 'reddit', url: 'https://reddit.com/user/l3on_y2k' },
        { text: 'letterboxd', url: 'https://letterboxd.com/l3on_y2k/', image: letterboxdButton },
        { text: 'mail', url: 'mailto:l3on.y2k@proton.me', image: mailButton },
      ],
    },
  ] satisfies ProfileLinkGroup[],
};

export interface Project {
  id: string;
  title: string;
  description: string;
  image?: string;
  actions: { text: string; url: string }[];
}

/** About › Projects. */
export const PROJECTS: Project[] = [
  {
    id: 'computer-project',
    title: 'lok.computer',
    description: "A mini desktop-like environment with modular apps including are.na browser, weather app, and more. Yes it's the webpage you're seeing right now!",
    actions: [
      { text: 'visit site', url: SITE.url },
      { text: 'view repo', url: SITE.repository },
    ],
  },
  {
    id: 'canvas-project',
    title: 'are.na blocks canvas',
    description: 'A visual tool for exploring are.na blocks in a canvas interface. allows you to interact with are.na blocks in a more spatial and intuitive way.',
    image: 'https://d2w9rnfcy7mm78.cloudfront.net/34381819/original_dfe72603be9a7ed6d56028b616c73281.png',
    actions: [
      { text: 'visit site', url: 'https://abc.lok.computer' },
      { text: 'view repo', url: 'https://github.com/l3ony2k/are.na-blocks-canvas' },
    ],
  },
  {
    id: 'new-tab-extension',
    title: 'are.na blocks new tab',
    description: 'A minimalist extension that replace the new tab page with curated Are.na blocks using your favorite channels and custom settings.',
    image: 'https://d2w9rnfcy7mm78.cloudfront.net/40924726/original_4028737f4f96e393d5d14b7620db6617.png',
    actions: [
      { text: 'visit site', url: 'https://abnt.lok.computer' },
      { text: 'view repo', url: 'https://github.com/l3ony2k/are.na-blocks-new-tab' },
    ],
  },
  {
    id: 'feed-project',
    title: 'are.na blocks feed',
    description: 'A minimalist thoughts feed that displays blocks from your Are.na channel, heavily inspired by thoughts.page.',
    image: 'https://d2w9rnfcy7mm78.cloudfront.net/37614786/original_c8e2ea284776923c33921dddbb23433c.png',
    actions: [
      { text: 'visit site', url: 'https://journal.lok.computer' },
      { text: 'view repo', url: 'https://github.com/l3ony2k/are.na-blocks-feed' },
    ],
  },
];

/** The Browser app's bookmark bar. */
export const BROWSER_BOOKMARKS: { name: string; url: string }[] = [
  { name: 'are.na', url: 'https://are.na/lok' },
  { name: 'blog', url: 'https://l3on.site' },
  { name: 'journal', url: 'https://journal.lok.computer' },
  { name: 'canvas', url: 'https://abc.lok.computer' },
  { name: 'status', url: 'https://status.cafe/users/lok' },
  { name: "simone's", url: 'https://simone.computer/#/webdesktops' },
];
