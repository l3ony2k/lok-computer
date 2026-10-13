import { useEffect } from "react";
import { WindowLayout } from "@/components/window/WindowLayout";
import { RetroButton } from "@/components/ui/RetroButton";
import { usePersistedState } from "@/hooks/useStorage";
import { SYSTEM_VERSION } from "@/lib/system";
import { THEMES, THEME_IDS } from "@/lib/theme";
import { CHANGELOG } from "./changelog";
import { PROFILE, PROJECTS, type ProfileLink } from "@/config/site";


// Theme credits come from the theme registry so new themes are credited automatically.
const THEME_CREDITS = THEME_IDS.flatMap((id) => THEMES[id].credit ?? []);

const TYPE_AND_PICTURE_CREDITS = [
  { label: "Perfect DOS VGA 437 by Zeh Fernando", url: "https://www.dafont.com/perfect-dos-vga-437.font" },
  { label: "Chicago and Geneva bitmap recreations by Giles Booth", url: "https://www.suppertime.co.uk/blogmywiki/" },
  { label: "Fixedsys Excelsior", url: "https://github.com/kika/fixedsys" },
  { label: "Bliss by Charles O'Rear", url: "https://en.wikipedia.org/wiki/Bliss_(image)" },
  { label: "Harmony by Chuck Anderson", url: "https://en.wikipedia.org/wiki/Windows_7" },
  { label: "the Counter-Strike 1.6 menu art by Valve", url: "https://store.steampowered.com/app/10/CounterStrike/" },
];

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
        onLoad={() => console.log("[App:About] Hero image loaded")}
        onError={() => console.error("[About] Failed to load hero image")}
      />
      <div className="select-text">
        <div className="border-l-4 border-accent pl-4 italic mb-4">A small OS in your browser, for curiosity and creation.</div>

        <p className="mb-4">
          <strong>lok.computer</strong> is yet another useless side project of Leon's. It's a retro-inspired web desktop brings together modular mini apps like an are.na browser (yeh so orginal),
          weather (maybe?), social media (bsky and fediverse), and more (i don't know yet), within a playful, windowed environment.
        </p>

        <p className="mb-4">
          Under the hood: React, TypeScript, Vite, and Tailwind CSS. Oh try{" "}
          <a href="https://bun.sh" className="underline text-blue-700 dark:text-blue-300">
            bun.sh
          </a>
          , it's amazing.
        </p>

        <p className="mb-4">
          Made with Claude Sonnet (3.7|4.0|4.5|4.8|5.0|5.5), Claude Opus (4.5|5.0|5.5), Claude Fable (5|5.1), Gemini Pro (2.5|3.0), DeepSeek (V4|V4.1 Flash), Cline, Kilo Code, Windsurf, Claude Code,
          Codex CLI, Opencode and Antigravity.
        </p>

        <p>
          thank you to:{" "}
          <a href="https://github.com/adryd325/oneko.js" className="underline text-blue-700 dark:text-blue-300">
            adryd325's oneko.js
          </a>
          ,{" "}
          <a href="https://www.reddit.com/r/neocities/comments/1n1rkww/slowly_working_on_external_link_88x31_buttons/" className="underline text-blue-700 dark:text-blue-300">
            u/rosevarro
          </a>
          ,{" "}
          <a href="https://sweetfish.site/" className="underline text-blue-700 dark:text-blue-300">
            sweetfish.site
          </a>
          ,{" "}
          <a href="https://88x31.kate.pet/" className="underline text-blue-700 dark:text-blue-300">
            kate.pet's 88x31 buttons
          </a>
          ,{" "}
          <a href="https://www.neatnik.net/typo" className="underline text-blue-700 dark:text-blue-300">
            neatnik's typo
          </a>
          ,{" "}
          <a href="https://vale.rocks/portfolio/88x31-buttons-badges" className="underline text-blue-700 dark:text-blue-300">
            vale.rocks' 88x31 buttons
          </a>
          .
        </p>

        <p className="mt-4">
          themes are built on:{" "}
          {THEME_CREDITS.map((credit, index) => (
            <span key={credit.url}>
              {index > 0 && ", "}
              <a href={credit.url} className="underline text-blue-700 dark:text-blue-300">
                {credit.label}
              </a>
              {credit.license && ` (${credit.license})`}
            </span>
          ))}
          .
        </p>

        <p className="mt-4">
          type and pictures:{" "}
          {TYPE_AND_PICTURE_CREDITS.map((credit, index) => (
            <span key={credit.label}>
              {index > 0 && ", "}
              <a href={credit.url} className="underline text-blue-700 dark:text-blue-300">
                {credit.label}
              </a>
            </span>
          ))}
          .
        </p>

        <Changelog />
      </div>
    </div>
  );
};

// ============================================
// Changelog (collapsed at the end of About this)
// ============================================
const Changelog = () => (
  <details className="about-changelog mt-6">
    <summary>
      <span>Changelog</span>
    </summary>
    <ol className="about-changelog-list">
      {CHANGELOG.map((entry) => (
        <li key={`${entry.version}-${entry.date}`} className="about-changelog-entry" data-current={entry.version === SYSTEM_VERSION || undefined}>
          <header>
            <span className="about-changelog-version">{entry.version === "early" ? "pre-release" : `v${entry.version}`}</span>
            <strong>{entry.title}</strong>
            <time dateTime={entry.date}>{entry.date}</time>
          </header>
          <ul>
            {entry.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  </details>
);

// ============================================
// About Me Section
// ============================================

// 88x31 Link Button component with skeleton and no layout shift on hover
const LinkButton88x31 = ({ link }: { link: ProfileLink }) => {
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.text} className="relative cursor-default bg-secondary flex items-center justify-center" style={{ width: 88, height: 31 }}>
      {link.image ? (
        <>
          <span className="absolute text-[8px] opacity-40">loading...</span>
          <img src={link.image} alt={link.text} width={88} height={31} className="relative hover:outline hover:outline-2 hover:outline-accent pixelated-image" />
        </>
      ) : (
        <div
          className="w-full h-full border border-border bg-secondary flex items-center justify-center overflow-hidden hover:outline hover:outline-2 hover:outline-accent"
          style={{ width: 88, height: 31 }}
        >
          <div className="text-xs font-bold whitespace-nowrap animate-marquee-if-overflow">{link.text}</div>
        </div>
      )}
    </a>
  );
};

const AboutMe = () => (
  <div className="select-text p-4 max-w-lg mx-auto">
    {/* Quote */}
    <div className="border-l-2 border-current pl-4 italic my-4" style={{ fontFamily: "'Times New Roman', serif", fontSize: "18px" }}>
      "{PROFILE.quote.text}" – {PROFILE.quote.author}
    </div>

    {/* Bio */}
    {PROFILE.bio.map((paragraph) => (
      <p key={paragraph} className="mb-4">
        {paragraph}
      </p>
    ))}

    {/* Social Links as 88x31 buttons */}
    <div className="space-y-6 mt-4">
      {PROFILE.linkGroups.map((group) => (
        <div key={group.handle}>
          <h3 className="font-bold mb-3 text-accent">{group.handle}</h3>
          <div className="flex flex-wrap gap-1">
            {group.links.map((link) => (
              <LinkButton88x31 key={link.text} link={link} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Projects Section
// ============================================
const Projects = () => (
  <div className="select-text p-4 max-w-lg mx-auto">
    <div className="space-y-4">
      {PROJECTS.map((project) => (
        <div key={project.id} className="border border-border transition-colors overflow-hidden">
          {project.image && <img src={project.image} alt={project.title} className="w-full select-none border-b border-border transition-colors" />}
          <div className="p-4">
            <h3 className="font-bold text-accent mb-2">{project.title}</h3>
            <p className="mb-3 opacity-80">{project.description}</p>
            <div className="flex gap-2 flex-wrap">
              {project.actions.map((action) => (
                <RetroButton className="p-3" key={action.text} size="sm" onClick={() => window.open(action.url, "_blank", "noopener,noreferrer")}>
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
const APP_STATE_KEY = "app:about";

interface AboutProps {
  initialTab?: string;
  onPropsChange?: (props: Partial<AboutProps>) => void;
}

export const About: React.FC<AboutProps> = ({ initialTab, onPropsChange }) => {
  const [activeTab, setActiveTab] = usePersistedState({
    key: APP_STATE_KEY,
    defaultValue: initialTab || "about-this",
  });

  // Deep link priority: override persisted state if initialTab is provided and differs.
  // Intentionally runs only when initialTab changes — including activeTab in the deps
  // would reset the user's tab choice back to the deep-linked tab on every click.
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  const handleTabChange = (tab: string) => {
    console.log("[App:About] Tab:", tab);
    setActiveTab(tab);

    // Sync to window props for share URL
    if (onPropsChange) {
      onPropsChange({ initialTab: tab });
    }
  };

  return (
    <WindowLayout
      toolbar={
        <div className="app-toolbar-row app-tab-bar sticky top-0">
          <RetroButton size="sm" active={activeTab === "about-this"} onClick={() => handleTabChange("about-this")}>
            About this
          </RetroButton>
          <RetroButton size="sm" active={activeTab === "about-me"} onClick={() => handleTabChange("about-me")}>
            About me
          </RetroButton>
          <RetroButton size="sm" active={activeTab === "projects"} onClick={() => handleTabChange("projects")}>
            Projects
          </RetroButton>
        </div>
      }
      footer={
        <div className="app-footer-row arena-file-footer">
          <span>v{SYSTEM_VERSION}</span>
          <span>lok</span>
        </div>
      }
      hasPadding={false}
    >
      <div className="text-sm">
        {activeTab === "about-this" && <AboutThis />}
        {activeTab === "about-me" && <AboutMe />}
        {activeTab === "projects" && <Projects />}
      </div>
    </WindowLayout>
  );
};
