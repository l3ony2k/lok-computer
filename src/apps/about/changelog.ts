/**
 * Release notes shown at the end of About › About this.
 *
 * Newest first. Versions before 2.0.7 were never numbered, so the early
 * entries carry the era instead of a number. Dates are the commit dates.
 * Add an entry here when package.json's version changes.
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.1.2',
    date: '2026-10-11',
    title: 'Four new apps',
    notes: [
      'Notepad: notes saved in this browser, as plain text, Markdown with a preview, or basic rich text; download any note as a file.',
      'Clock: Internet time in beats, your local time, and a world clock you can add zones to (Hong Kong, Tokyo, Hà Nội, Los Angeles, New York, London and Kyiv to start).',
      'Calculator: a desk calculator with a tape, keyboard entry, and a repeat-equals.',
      'Chance: dice (up to twelve, any shape), a coin, cards from a 52-card deck, and tarot with an "Ask AI" button for the reading. Randomness is an illusion here; never use it for secrets.',
      'Ask AI accepts a question handed over by another app.',
    ],
  },
  {
    version: '3.1.1',
    date: '2026-10-11',
    title: 'A desktop that behaves like one',
    notes: [
      'Windows snap to a half or a quarter of the desktop: hold Alt while dragging, or drag the pointer to the desktop\'s edge.',
      'Window shade rolls a window up to its title bar, from the window menu or on double-click (Config › Desktop).',
      'Search (⌘K / Ctrl+K) finds apps and Are.na channels; the magnifier beside the clock opens it too.',
      'Right-click the desktop for icon size, snapping, hiding icons and tidy up; icons, title bars and taskbar buttons have menus as well.',
      'Desktop icons come in three sizes and can sit anywhere once snapping is off.',
      'The system menu groups Applications and Recent, with Search, About, Config, Check for updates and Restart beside them.',
      'Images and the Are.na preview say "Loading image…" instead of showing the previous picture while the next one downloads.',
      'The CRT flicker stays off for anyone who asked their system for reduced motion.',
    ],
  },
  {
    version: '3.0.7',
    date: '2026-10-10',
    title: 'Spring cleaning',
    notes: [
      'The clock shows the local date again; it used to flip to the UTC date near midnight.',
      'Console, channel and playlist scrolling stays inside its own window.',
      'A lighter first load: the router and unused UI libraries are gone, and icons travel as files instead of inline data.',
      'Window menus stay on screen, and settings sliders no longer write on every tick.',
      'Share Window says when it has copied, and the link reopens the window as you left it.',
      'Fedi and Shelf requests are rate limited per visitor, like Ask AI.',
      'Window buttons and the title-bar menu answer a tap on phones.',
      'Images suggests whichever channels carry the 🜳 mark on Are.na.',
      'The setup screen fits a phone; its buttons used to hide behind the browser toolbar.',
    ],
  },
  {
    version: '3.0.6',
    date: '2026-10-10',
    title: 'Move things around',
    notes: [
      'Desktop icons can be dragged into any order; the order is remembered.',
      'This changelog, at the bottom of About.',
      'Self-hosted analytics: one pageview per visit and app-open counts, nothing personal.',
    ],
  },
  {
    version: '3.0.5',
    date: '2026-10-09',
    title: 'Worker on a diet',
    notes: [
      'Dropped the unused chat and Bluesky proxies; the Worker went from 1.8 MB to 47 KB.',
      'Ask AI needs its planner model set explicitly, no silent fallback.',
    ],
  },
  {
    version: '3.0.4',
    date: '2026-10-09',
    title: 'Grid manners',
    notes: [
      'A lone filtered Are.na block keeps its card size instead of filling the row.',
      'System theme: toolbar labels centred, code text at a proper 9 pt Monaco.',
    ],
  },
  {
    version: '3.0.3',
    date: '2026-10-09',
    title: 'Holds, loops and going offline',
    notes: [
      'A clip opened from Are.na or a feed plays once and stops; short videos loop like GIFs.',
      'Wallpapers moved to their own layer, so dragging windows no longer flickers.',
      'The desktop stopped nudging every window when Ask AI answered.',
      'Offline mode: feeds and weather show their last copy, an OFFLINE readout sits by the clock.',
    ],
  },
  {
    version: '3.0.2',
    date: '2026-10-09',
    title: 'Bliss, actually',
    notes: [
      'XP and 7 finally paint Bliss and Harmony on the real desktop.',
      'Media and Images accept Are.na channels and blocks; double-click a clip to play it.',
      'Ask AI plans with gpt-6-luna, answers in your language, and knows what day it is.',
      'Taskbar scrolls again; boot screens stay monospace in every theme.',
    ],
  },
  {
    version: '3.0.1',
    date: '2026-10-08',
    title: 'Eight skins',
    notes: [
      'Four more themes: System (one-bit Mac), TUI, 386 and Counter-Strike 1.6.',
      'Every app icon redrawn as pixel art from one script.',
      'Ask AI became one question in, one calibrated answer out.',
    ],
  },
  {
    version: '3.0.0',
    date: '2026-10-08',
    title: 'The big one',
    notes: [
      'A theme engine with Windows 98, XP and 7 skins, taskbar and Start menu included.',
      'Media: a cassette-deck player with a spectrum analyser and a public-domain library.',
      'Ask AI rebuilt on TypeSafe Jev: typed questions, probabilities, confidence.',
    ],
  },
  {
    version: '2.0.10',
    date: '2026-07-27',
    title: 'One catalog to rule them all',
    notes: [
      'Every app is described once: identity, loader, defaults, deep link, restore.',
      'Bluesky and Fediverse share one feed renderer.',
    ],
  },
  {
    version: '2.0.7',
    date: '2026-07-22',
    title: 'Boot sequence',
    notes: [
      'TTY boot screen, first-run setup, update checks, reboot and kernel panic.',
      'The whole desktop adopted the Are.na Blocks Canvas look, light and dark.',
      'Windows minimise with a measured animation and come back where they were.',
    ],
  },
  {
    version: 'early',
    date: '2026-03-12',
    title: 'Are.na v3 and more buttons',
    notes: [
      'Moved to the Are.na v3 API.',
      'Deep links for every window, a context menu, and a share-URL that follows what you view.',
      'More 88×31 buttons than anyone asked for.',
    ],
  },
  {
    version: 'early',
    date: '2026-01-05',
    title: 'CRT glow',
    notes: [
      'A configurable CRT effect: scanlines, flicker, RGB offset, curvature.',
      'Images zoom, pan and auto-fit.',
    ],
  },
  {
    version: 'early',
    date: '2025-12-25',
    title: 'IndexedDB and a cat',
    notes: [
      'App state and API caches moved into IndexedDB.',
      'Oneko follows the cursor; Buttons app; NeoDB shelf; Swatch Internet Time on the calendar.',
    ],
  },
  {
    version: 'early',
    date: '2025-11-26',
    title: 'Fediverse',
    notes: [
      'Fedi app with profile and feed, Bluesky profile header, Are.na preview panel and link thumbnails.',
    ],
  },
  {
    version: 'early',
    date: '2025-06-09',
    title: 'Apps galore',
    notes: [
      'Weather, Bsky, Browser, Console, Links and Guestbook, one after another.',
      'Single-instance apps, the app menu and the calendar flyout.',
    ],
  },
  {
    version: 'early',
    date: '2025-04-27',
    title: 'Hello, world',
    notes: [
      'Draggable windows, desktop icons, an Are.na browser and a wallpaper picker.',
      'A computer within a computer.',
    ],
  },
];
