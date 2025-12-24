import { useState, useEffect, useRef } from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { getAppState, setAppState } from '@/lib/storage';

// Import local 88x31 button images
import wwwButton from '@/assets/buttons/www.png';
import lightdarkButton from '@/assets/buttons/lightdark.png';
import imissxpButton from '@/assets/buttons/imissxp.gif';
import madewithwindowsButton from '@/assets/buttons/made_with_windows.gif';

// ============================================
// External 88x31 Buttons configuration
// Easy to configure - just add more sections and buttons here
// ============================================
const buttonSections = [
    {
        id: 'cool-websites',
        title: 'Cool Websites',
        buttons: [
            { url: "https://yvas.me", image: "https://yvas.me/_app/immutable/assets/savy_banner.dFhLlH1h.gif", alt: "yvas.me" },
            { url: "https://ro3or.com", image: "https://ro3or.com/button.gif", alt: "鹅玉" },
            { url: "https://dimden.dev/", image: "https://dimden.dev/services/images/88x31.gif", alt: "dimden.dev" },
            { url: "https://sweetfish.site", image: "https://sweetfish.site/img/button3.png", alt: "sweetfish.site" },
            { url: "https://mengru.space", image: "https://mengru.space/logo.jpg", alt: "mengru.space" },
        ],
    },
    {
        id: 'other',
        title: 'Other',
        buttons: [
            { url: "https://people.pledge.party", image: "https://people.pledge.party/badges/people_pledge_badge_party_black_white_88x31.png", alt: "People Pledge Party" },
            { url: "", image: wwwButton, alt: "www" },
            { url: "", image: lightdarkButton, alt: "Light/Dark Buttons" },
            { url: "", image: imissxpButton, alt: "I miss XP" },
            { url: "", image: madewithwindowsButton, alt: "Made with Windows" },
        ],
    },
];

// ============================================
// My button variants configuration
// ============================================
const myButtonVariants = [
    {
        id: 'default',
        label: 'default',
        path: '/88x31.gif',
        url: 'https://lok.computer/88x31.gif',
    },
    {
        id: 'light',
        label: 'light',
        path: '/88x31-light.gif',
        url: 'https://lok.computer/88x31-light.gif',
    },
    {
        id: 'dark',
        label: 'dark',
        path: '/88x31-dark.gif',
        url: 'https://lok.computer/88x31-dark.gif',
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
const MyButtonsTab = () => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const getEmbedCode = (variant: typeof myButtonVariants[0]) =>
        `<a href="https://lok.computer" target="_blank" rel="noopener noreferrer"><img src="${variant.url}" alt="lok.computer" width="88" height="31" /></a>`;

    const handleCopyEmbed = (variant: typeof myButtonVariants[0]) => {
        navigator.clipboard.writeText(getEmbedCode(variant));
        setCopiedId(variant.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="max-w-lg mx-auto p-4">
            <h4 className="font-bold mb-3 text-accent">88x31 Buttons</h4>

            <div className="space-y-3">
                {myButtonVariants.map((variant) => (
                    <div key={variant.id}>
                        <span className="text-xs opacity-60 mb-1 block">{variant.label}</span>
                        <div className="flex gap-2 items-stretch">
                            {/* Button Preview */}
                            <div className="shrink-0 flex items-center border border-border">
                                <img
                                    src={variant.path}
                                    alt={`lok.computer button (${variant.label})`}
                                    width={88}
                                    height={31}
                                    className="select-none"
                                />
                            </div>

                            {/* Embed Code */}
                            <div className="relative flex-1 min-w-0">
                                <pre className="bg-black/10 dark:bg-white/10 px-2 py-1 text-xs overflow-x-auto border border-border select-text h-full flex items-center">
                                    <code className="truncate">{getEmbedCode(variant)}</code>
                                </pre>
                                <button
                                    onClick={() => handleCopyEmbed(variant)}
                                    className="absolute top-1 right-1 px-2 py-0.5 text-xs bg-accent/80 hover:bg-accent/90 border border-accent/50 transition-colors"
                                >
                                    {copiedId === variant.id ? 'copied!' : 'copy'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// App state persistence
// ============================================
interface LinksAppState {
    activeTab: string;
}

const APP_STATE_KEY = 'app:links';

// ============================================
// Main Links App Component
// ============================================
export const LinksApp = () => {
    const [activeTab, setActiveTab] = useState('buttons');
    const isInitialLoad = useRef(true);

    // Load persisted state on mount
    useEffect(() => {
        let mounted = true;

        const loadState = async () => {
            try {
                const saved = await getAppState<LinksAppState>(APP_STATE_KEY);
                if (mounted && saved) {
                    setActiveTab(saved.activeTab);
                }
            } catch (error) {
                console.error('[App:Links] Failed to load state:', error);
            } finally {
                if (mounted) {
                    isInitialLoad.current = false;
                }
            }
        };

        loadState();
        console.log('[App:Links] Initialized');

        return () => {
            mounted = false;
            console.log('[App:Links] Cleanup');
        };
    }, []);

    // Save state when tab changes
    useEffect(() => {
        if (isInitialLoad.current) return;

        const saveState = async () => {
            try {
                await setAppState<LinksAppState>(APP_STATE_KEY, { activeTab });
            } catch (error) {
                console.error('[App:Links] Failed to save state:', error);
            }
        };

        saveState();
    }, [activeTab]);

    const handleTabChange = (tab: string) => {
        console.log('[App:Links] Tab:', tab);
        setActiveTab(tab);
    };


    return (
        <WindowLayout
            toolbar={
                <div className="flex border-b border-border sticky top-0 bg-background p-1 space-x-1">
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
