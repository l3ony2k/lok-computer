import { useState } from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';

// Import local 88x31 button images
import l3onButton from '@/assets/buttons/l3on.gif'
import savyButton from '@/assets/buttons/savy.gif'
import ro3orButton from '@/assets/buttons/ro3or.gif'
import wwwButton from '@/assets/buttons/www.png';
import lightdarkButton from '@/assets/buttons/lightdark.png';
import imissxpButton from '@/assets/buttons/imissxp.gif';
import madewithwindowsButton from '@/assets/buttons/made_with_windows.gif';
import bitButton from '@/assets/buttons/32b-pcb.png';
import ilikecomputerButton from '@/assets/buttons/i_like_computer.png';
import guestbookButton from '@/assets/buttons/guestbook.gif';
import ublockButton from '@/assets/buttons/ublock.png';
import atabookButton from '@/assets/buttons/atabook.gif';
import valerockButton from '@/assets/buttons/valerocks.avif';

// ============================================
// External 88x31 Buttons configuration
// Easy to configure - just add more sections and buttons here
// ============================================
const buttonSections = [
    {
        id: 'cool-websites',
        title: 'Cool Websites',
        buttons: [
            { url: "https://l3on.site", image: l3onButton, alt: "my blog" },
            { url: "https://yvas.me", image: savyButton, alt: "yvas.me" },
            { url: "https://www.geedea.pro", image: "https://www.geedea.pro/88x31.png", alt: "极客死亡计划" },
            { url: "https://eltr.ac", image: "https://www.eltr.ac/assets/88x31.webp", alt: "eltr.ac" },
            { url: "https://v1sta.xyz/", image: "https://v1sta.xyz/wp-content/uploads/2026/02/88x31.png", alt: "景の域" },
            { url: "https://ink.v1sta.xyz", image: "https://ink.v1sta.xyz/wp-content/uploads/2026/03/88x31-ink.v1sta.png", alt: "景の印" },
            { url: "https://ro3or.com", image: ro3orButton, alt: "鹅玉" },
            { url: "https://saki.net7.blog", image: "https://bear-images.sfo2.cdn.digitaloceanspaces.com/lok/image-1.webp", alt: "花島の咲 SAKI" },
            { url: "https://net7.blog/", image: "https://net7.blog/wp-content/uploads/2026/01/net7_88x31.png", alt: "网沏 Net7.Blog" },
            { url: "https://leehenry.top", image: "https://leehenry.top/88x31.gif", alt: "伏枥之间" },
            { url: "https://dimden.dev/", image: "https://dimden.dev/services/images/88x31.gif", alt: "dimden.dev" },
            { url: "https://sweetfish.site", image: "https://sweetfish.site/img/button3.png", alt: "sweetfish.site" },
            { url: "https://vale.rocks", image: valerockButton, alt: "vale.rocks" },
            { url: "https://lucida.to", image: "https://lucida.to/buttons/88x31.gif", alt: "lucida.to" },
        ],
    },
    {
        id: 'other',
        title: 'Other',
        buttons: [
            { url: "https://people.pledge.party", image: "https://people.pledge.party/badges/people_pledge_badge_party_black_white_88x31.png", alt: "People Pledge Party" },
            { url: "#", image: "https://bear-images.sfo2.cdn.digitaloceanspaces.com/lok/ally.webp", alt: "ally" },
            { url: "#", image: "https://bear-images.sfo2.cdn.digitaloceanspaces.com/lok/anti-fascism_button.gif", alt: "anti-fascism" },
            { url: "https://en.wikipedia.org/wiki/World_Wide_Web", image: wwwButton, alt: "World Wide Web" },
            { url: "#", image: lightdarkButton, alt: "Light/Dark Buttons" },
            { url: "https://win32.run/", image: imissxpButton, alt: "I miss XP" },
            { url: "#", image: madewithwindowsButton, alt: "Made with Windows" },
            { url: "https://32bit.cafe/", image: bitButton, alt: "32Bit Cafe" },
            { url: "#", image: ilikecomputerButton, alt: "I Like Computer" },
            { url: "https://guestbooks.meadow.cafe/guestbook/671", image: guestbookButton, alt: "Sign my Guestbook" },
            { url: "https://lok.atabook.org/", image: atabookButton, alt: "Sign my Atabook" },
            { url: "https://ublockorigin.com/", image: ublockButton, alt: "uBlock Origin Now!" },
            { url: "https://xn--sr8hvo.ws/", image: "https://v1sta.xyz/wp-content/uploads/2026/03/88x31-IndieWeb-Webring.png", alt: "IndieWeb Webring" },
        ],
    },
    {
        id: 'archive',
        title: "Archive",
        buttons: [
            { url: "https://mengru.space", image: "https://mengru.space/logo.jpg", alt: "mengru.space" },
        ],
    },
];

// ============================================
// My button variants configuration - 88x31
// ============================================
const my88x31Variants = [
    {
        id: '88x31-default',
        label: 'default',
        path: '/88x31.gif',
        url: 'https://lok.computer/88x31.gif',
        width: 88,
        height: 31,
    },
    {
        id: '88x31-light',
        label: 'light',
        path: '/88x31-light.gif',
        url: 'https://lok.computer/88x31-light.gif',
        width: 88,
        height: 31,
    },
    {
        id: '88x31-dark',
        label: 'dark',
        path: '/88x31-dark.gif',
        url: 'https://lok.computer/88x31-dark.gif',
        width: 88,
        height: 31,
    },
];

// ============================================
// My button variants configuration - 80x15
// ============================================
const my80x15Variants = [
    {
        id: '80x15-default',
        label: 'default',
        path: '/80x15.gif',
        url: 'https://lok.computer/80x15.gif',
        width: 80,
        height: 15,
    },
    {
        id: '80x15-light',
        label: 'light',
        path: '/80x15-light.gif',
        url: 'https://lok.computer/80x15-light.gif',
        width: 80,
        height: 15,
    },
    {
        id: '80x15-dark',
        label: 'dark',
        path: '/80x15-dark.gif',
        url: 'https://lok.computer/80x15-dark.gif',
        width: 80,
        height: 15,
    },
];

// ============================================
// Buttons Tab - External 88x31 buttons
// ============================================
const ButtonsTab = () => (
    <div className="select-text p-4 max-w-lg mx-auto">
        <div className="space-y-6">
            {buttonSections.map((section) => (
                <div key={section.id}>
                    <h3 className="font-bold mb-3 text-accent">{section.title}</h3>
                    <div className="flex flex-wrap gap-1">
                        {section.buttons.map((button) => (
                            <a
                                key={button.alt}
                                href={button.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={button.alt}
                                className="relative block cursor-default bg-secondary flex items-center justify-center"
                                style={{ width: 88, height: 31 }}
                            >
                                <span className="absolute text-[8px] opacity-40">loading...</span>
                                <img
                                    src={button.image}
                                    alt={button.alt}
                                    width={88}
                                    height={31}
                                    className="relative hover:outline hover:outline-2 hover:outline-accent pixelated-image"
                                />
                            </a>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);


// ============================================
// My Buttons Tab - Embed code for own buttons
// ============================================
type ButtonVariant = typeof my88x31Variants[0];

const MyButtonsTab = () => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const getEmbedCode = (variant: ButtonVariant) =>
        `<a href="https://lok.computer" target="_blank" rel="noopener noreferrer"><img src="${variant.url}" alt="lok.computer" width="${variant.width}" height="${variant.height}" /></a>`;

    const handleCopyEmbed = (variant: ButtonVariant) => {
        navigator.clipboard.writeText(getEmbedCode(variant));
        setCopiedId(variant.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const renderButtonSection = (title: string, variants: ButtonVariant[]) => (
        <>
            <h4 className="font-bold mb-3 text-accent">{title}</h4>
            <div className="space-y-3 mb-6">
                {variants.map((variant) => (
                    <div key={variant.id}>
                        <span className="text-xs opacity-60 mb-1 block">{variant.label}</span>
                        <div className="flex gap-2 items-stretch">
                            {/* Button Preview */}
                            <div className="shrink-0 flex items-center">
                                <img
                                    src={variant.path}
                                    alt={`lok.computer button (${variant.label})`}
                                    width={variant.width}
                                    height={variant.height}
                                    className="select-none"
                                />
                            </div>

                            {/* Embed Code */}
                            <div className="relative flex-1 min-w-0">
                                <pre className="bg-black/10 dark:bg-white/10 px-2 py-1 text-xs overflow-x-auto border border-border select-text h-full flex items-center [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    <code className="whitespace-nowrap">
                                        {getEmbedCode(variant)}
                                    </code>
                                </pre>
                                <button
                                    onClick={() => handleCopyEmbed(variant)}
                                    className="absolute top-1 right-1 px-1 py-0 text-xs bg-accent hover:bg-accent/50 border border-border transition-colors"
                                >
                                    {copiedId === variant.id ? 'copied!' : 'copy'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );

    return (
        <div className="max-w-lg mx-auto p-4">
            {renderButtonSection('88x31 Buttons', my88x31Variants)}
            {renderButtonSection('80x15 Buttons', my80x15Variants)}
        </div>
    );
};

// ============================================
// Main Links App Component
// ============================================
const APP_STATE_KEY = 'app:links';

export const LinksApp = () => {
    // Using usePersistedState hook instead of manual load/save useEffects
    const [activeTab, setActiveTab] = usePersistedState({
        key: APP_STATE_KEY,
        defaultValue: 'buttons',
    });

    const handleTabChange = (tab: string) => {
        console.log('[App:Links] Tab:', tab);
        setActiveTab(tab);
    };


    return (
        <WindowLayout
            toolbar={
                <div className="app-toolbar-row app-tab-bar sticky top-0">
                    <RetroButton
                        size="sm"
                        active={activeTab === 'buttons'}
                        onClick={() => handleTabChange('buttons')}
                    >
                        Buttons
                    </RetroButton>
                    <RetroButton
                        size="sm"
                        active={activeTab === 'my-buttons'}
                        onClick={() => handleTabChange('my-buttons')}
                    >
                        My Buttons
                    </RetroButton>
                </div>
            }
            hasPadding={false}
        >
            <div className="text-sm">
                {activeTab === 'buttons' && <ButtonsTab />}
                {activeTab === 'my-buttons' && <MyButtonsTab />}
            </div>
        </WindowLayout>
    );
};

export default LinksApp;
