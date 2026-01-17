import { useState } from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';

// Import local 88x31 button images
import omglolButton from '@/assets/buttons/omglol.png';
import letterboxdButton from '@/assets/buttons/letterboxd.png';
import blueskyButton from '@/assets/buttons/bluesky.png';
import instagramButton from '@/assets/buttons/instagram.png';
import mastodonButton from '@/assets/buttons/mastodon.png';
import tumblrButton from '@/assets/buttons/tumblr.png';
import telegramButton from '@/assets/buttons/telegram.gif'
import twitterButton from '@/assets/buttons/twitter.gif'
import mailButton from '@/assets/buttons/email.png'
import l3onButton from '@/assets/buttons/l3on.gif'

// ============================================
// About This Section
// ============================================
const AboutThis = () => {
  return (
    <div className="max-w-lg mx-auto p-4">
      <img
        className="mb-6 select-none"
        src="https://d2w9rnfcy7mm78.cloudfront.net/36349997/original_9ae0772fcf1074962bb42fc2b6a21dfd.jpg"
        alt="a computer within a computer, that's basically what lok.computer is"
        onLoad={() => console.log('[App:About] Hero image loaded')}
        onError={() => console.error('[About] Failed to load hero image')}
      />
      <div className="select-text">
        <div className="border-l-4 border-accent pl-4 italic mb-4">
          A small OS in your browser, for curiosity and creation.
        </div>

        <p className="mb-4">
          <strong>lok.computer</strong> is yet another useless side project of <a href="https://leonw.ong/" className="underline text-blue-700 dark:text-blue-300">Leon</a>'s. It's a retro-inspired web desktop brings together modular mini apps like an are.na browser (yeh so orginal), weather (maybe?), social media (bsky and fediverse), and more (i don't know yet), within a playful, windowed environment.
        </p>

        <p className="mb-4">
          Under the hood: React, TypeScript, Vite, and Tailwind CSS. Oh try <a href="https://bun.sh" className="underline text-blue-700 dark:text-blue-300">bun.sh</a>, it's amazing.
        </p>

        <p className="mb-4">
          Made with Claude (3.7|4.0|4.5) Sonnet, Claude 4.5 Opus, Gemini (2.5|3.0) Pro, Cline, Kilo Code, Windsurf, Claude Code, Codex CLI, Opencode and Antigravity.
        </p>

        <p>
          thank you to: <a href="https://github.com/adryd325/oneko.js" className="underline text-blue-700 dark:text-blue-300">adryd325's oneko.js</a>, <a href="https://www.reddit.com/r/neocities/comments/1n1rkww/slowly_working_on_external_link_88x31_buttons/" className="underline text-blue-700 dark:text-blue-300">u/rosevarro</a>, <a href="https://sweetfish.site/" className="underline text-blue-700 dark:text-blue-300">sweetfish.site</a>, <a href="https://88x31.kate.pet/" className="underline text-blue-700 dark:text-blue-300">kate.pet's 88x31 buttons</a>, <a href="https://www.neatnik.net/typo" className="underline text-blue-700 dark:text-blue-300">neatnik's typo</a>.
        </p>
      </div>

      <p className="mt-4 text-xs opacity-50 select-none">
        Version 1.6.0
      </p>
    </div>
  );
};


// ============================================
// About Me Section
// ============================================

// Social links configuration
// Add optional 'image' field for 88x31 button images
// If no image is set, the text will be displayed with marquee if overflow
const socialLinks = {
  lok: [
    { text: "are.na", url: "https://are.na/lok" },
    { text: "fediverse", url: "https://rex.cat/@lok", image: mastodonButton },
    { text: "bsky", url: "https://lok.on.computer", image: blueskyButton },
    { text: "neodb", url: "https://neodb.social/users/lok" },
    { text: "status.cafe", url: "https://status.cafe/users/lok", image: "https://status.cafe/assets/button.png" },
    { text: "special.fish", url: "https://special.fish/lok" },
    { text: "omg.lol", url: "https://omg.lol/lok", image: omglolButton },
    { text: "sr.ht", url: "https://sr.ht/~lok" },
    { text: "codeberg", url: "https://codeberg.org/lok" },
    { text: "nekoweb", url: "https://lok.nekoweb.org", image: "https://nekoweb.org/assets/buttons/button11.gif" },
    { text: "signal", url: "https://signal.me/#eu/8Q-JFgLhjGbsPSfgMHep65NmUJNKxTr1uyO-arsGq6AUf2ZaxrtPHY4WLiLrwm9D" },
    { text: "tumblr", url: "https://tumblr.com/lokw", image: tumblrButton },
    { text: "matrix", url: "https://matrix.to/#/@lok:mtx.owu.one" },
    { text: "xmpp", url: "https://xmpp.link/#lok@xmpp.is" },
  ],
  l3on_y2k: [
    { text: "blog", url: "https://l3on.site", image: l3onButton },
    { text: "github", url: "https://github.com/l3ony2k" },
    { text: "instagram", url: "https://instagram.com/l3on_y2k", image: instagramButton },
    { text: "telegram", url: "https://t.me/l3on_y2k", image: telegramButton },
    { text: "twitter", url: "https://twitter.com/l3on_y2k", image: twitterButton },
    { text: "reddit", url: "https://reddit.com/user/l3on_y2k" },
    { text: "letterboxd", url: "https://letterboxd.com/l3on_y2k/", image: letterboxdButton },
    { text: "mail", url: "mailto:l3on.y2k@proton.me", image: mailButton },
  ],
};

// 88x31 Link Button component with skeleton and no layout shift on hover
const LinkButton88x31 = ({ link }: { link: { text: string; url: string; image?: string } }) => {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.text}
      className="relative block cursor-default bg-secondary flex items-center justify-center"
      style={{ width: 88, height: 31 }}
    >
      {link.image ? (
        <>
          <span className="absolute text-[8px] opacity-40">loading...</span>
          <img
            src={link.image}
            alt={link.text}
            width={88}
            height={31}
            className="relative hover:outline hover:outline-2 hover:outline-accent pixelated-image"
          />
        </>
      ) : (
        <div
          className="w-full h-full border border-border bg-secondary flex items-center justify-center overflow-hidden hover:outline hover:outline-2 hover:outline-accent"
          style={{ width: 88, height: 31 }}
        >
          <div className="text-xs font-bold whitespace-nowrap animate-marquee-if-overflow">
            {link.text}
          </div>
        </div>
      )}
    </a>
  );
};


const AboutMe = () => (
  <div className="select-text p-4 max-w-lg mx-auto">
    {/* Quote */}
    <div className="border-l-2 border-current pl-4 italic my-4" style={{ fontFamily: "'Times New Roman', serif", fontSize: '18px' }}>
      "Men must live and create. Live to the point of tears." – Albert Camus
    </div>

    {/* Bio */}
    <p className="mb-4">
      Hello there, and welcome! I'm Leon / Lok, a curious soul who finds joy in exploring every corner of the web. I'm not a designer or developer, I just love creating and tinkering digital / physical things.
    </p>

    <p className="mb-4">
      This is my personal space, not much going on here, but still feel free to wander through and poke around. Every visit inspires me, and I hope you feel just as welcomed here.
    </p>

    {/* Social Links as 88x31 buttons */}
    <div className="space-y-6 mt-4">
      {/* @lok section */}
      <div>
        <h3 className="font-bold mb-3 text-accent">@lok</h3>
        <div className="flex flex-wrap gap-1">
          {socialLinks.lok.map((link) => (
            <LinkButton88x31 key={link.text} link={link} />
          ))}
        </div>
      </div>

      {/* @l3on_y2k section */}
      <div>
        <h3 className="font-bold mb-3 text-accent">@l3on_y2k</h3>
        <div className="flex flex-wrap gap-1">
          {socialLinks.l3on_y2k.map((link) => (
            <LinkButton88x31 key={link.text} link={link} />
          ))}
        </div>
      </div>
    </div>
  </div>
);



// ============================================
// Projects Section
// ============================================
const projects = [
  {
    id: "computer-project",
    title: "lok.computer",
    description: "A mini desktop-like environment with modular apps including are.na browser, weather app, and more. Yes it's the webpage you're seeing right now!",
    actions: [
      { text: "visit site", url: "https://lok.computer" },
      { text: "view repo", url: "https://github.com/l3ony2k/lok.computer" },
    ],
  },
  {
    id: "canvas-project",
    title: "are.na blocks canvas",
    description: "A visual tool for exploring are.na blocks in a canvas interface. allows you to interact with are.na blocks in a more spatial and intuitive way.",
    image: "https://d2w9rnfcy7mm78.cloudfront.net/34381819/original_dfe72603be9a7ed6d56028b616c73281.png",
    actions: [
      { text: "visit site", url: "https://abc.lok.computer" },
      { text: "view repo", url: "https://github.com/l3ony2k/are.na-blocks-canvas" },
    ],
  },
  {
    id: "new-tab-extension",
    title: "are.na blocks new tab",
    description: "A minimalist extension that replace the new tab page with curated Are.na blocks using your favorite channels and custom settings.",
    image: "https://d2w9rnfcy7mm78.cloudfront.net/40924726/original_4028737f4f96e393d5d14b7620db6617.png",
    actions: [
      { text: "visit site", url: "https://abnt.lok.computer" },
      { text: "view repo", url: "https://github.com/l3ony2k/are.na-blocks-new-tab" },
    ],
  },
  {
    id: "feed-project",
    title: "are.na blocks feed",
    description: "A minimalist thoughts feed that displays blocks from your Are.na channel, heavily inspired by thoughts.page.",
    image: "https://d2w9rnfcy7mm78.cloudfront.net/37614786/original_c8e2ea284776923c33921dddbb23433c.png",
    actions: [
      { text: "visit site", url: "https://journal.lok.computer" },
      { text: "view repo", url: "https://github.com/l3ony2k/are.na-blocks-feed" },
    ],
  },
];

const Projects = () => (
  <div className="select-text p-4 max-w-lg mx-auto">
    <div className="space-y-4">
      {projects.map((project) => (
        <div
          key={project.id}
          className="border border-border transition-colors overflow-hidden"
        >
          {project.image && (
            <img
              src={project.image}
              alt={project.title}
              className="w-full select-none border-b border-border transition-colors"
            />
          )}
          <div className="p-4">
            <h3 className="font-bold text-accent mb-2">{project.title}</h3>
            <p className="mb-3 opacity-80">{project.description}</p>
            <div className="flex gap-2 flex-wrap">
              {project.actions.map((action) => (
                <RetroButton
                  className="p-3"
                  key={action.text}
                  size="sm"
                  onClick={() => window.open(action.url, '_blank', 'noopener,noreferrer')}
                >
                  {action.text}
                </RetroButton>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Main About Component
// ============================================
const APP_STATE_KEY = 'app:about';

export const About = () => {
  const [activeTab, setActiveTab] = usePersistedState(APP_STATE_KEY, 'about-this');

  const handleTabChange = (tab: string) => {
    console.log('[App:About] Tab:', tab);
    setActiveTab(tab);
  };

  return (
    <WindowLayout
      toolbar={
        <div className="flex border-b border-border sticky top-0 bg-background p-1 space-x-1">
          <RetroButton
            size="sm"
            active={activeTab === 'about-this'}
            onClick={() => handleTabChange('about-this')}
          >
            About this
          </RetroButton>
          <RetroButton
            size="sm"
            active={activeTab === 'about-me'}
            onClick={() => handleTabChange('about-me')}
          >
            About me
          </RetroButton>
          <RetroButton
            size="sm"
            active={activeTab === 'projects'}
            onClick={() => handleTabChange('projects')}
          >
            Projects
          </RetroButton>
        </div>
      }
      hasPadding={false}
    >
      <div className="text-sm">
        {activeTab === 'about-this' && <AboutThis />}
        {activeTab === 'about-me' && <AboutMe />}
        {activeTab === 'projects' && <Projects />}
      </div>
    </WindowLayout>
  );
};