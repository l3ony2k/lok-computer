// src/core/Desktop.tsx
import { useEffect, useRef } from "react";
import { useWindowManager } from "@/components/WindowManager";
import { ChannelExplorer } from "@/apps/arena/channels/ChannelExplorer";
import { About } from "@/apps/about/About";
import { toast } from "sonner";
import { FEATURED_CHANNELS } from "@/config/channels";
import { WindowContainer, Taskbar } from "@/components/WindowManager";
import { DesktopIcons } from "@/components/desktop/DesktopIcons";
import { TopBar } from "./TopBar";
import { ConfigApp } from "@/apps/config/ConfigApp";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTheme } from "next-themes";
import { adjustWindowToViewport, type WindowDimensions, type ViewportDimensions } from "@/lib/utils";
import { WINDOW_DEFAULTS } from "@/config/window";
import { APP_LIST } from "@/config/apps";
import { Oneko } from "@/components/oneko/Oneko";
import { PopupDialog, PopupDialogButtons } from "@/components/ui/PopupDialog";
import { RetroButton } from "@/components/ui/RetroButton";
import { CrtFilter } from "@/components/effects/CrtFilter";

export const Desktop = () => {
    const { addWindow, addOrFocusWindow, windows, updateWindowPosition, updateWindowDimensions } = useWindowManager();
    const { theme, setTheme } = useTheme();
    const { settings, updateSetting, isLoading } = useUserSettings();

    // Only show oneko prompt after settings have loaded and user hasn't been asked
    const showOnekoPrompt = !isLoading && !settings.oneko?.hasBeenAsked;

    const handleOnekoResponse = (enabled: boolean) => {
        updateSetting('oneko', {
            enabled,
            hasBeenAsked: true,
            speed: 10,
            variant: 'default',
        });
    };
    const desktopContainerRef = useRef<HTMLDivElement>(null);

    // Apply the wallpaper as a CSS variable if it exists
    useEffect(() => {
        const rootElement = document.documentElement;

        if (settings.wallpaper) {
            rootElement.style.setProperty('--wallpaper-url', `url("${settings.wallpaper}")`);
        } else {
            rootElement.style.removeProperty('--wallpaper-url');
        }
    }, [settings.wallpaper]);

    // Apply CRT effect based on settings
    useEffect(() => {
        const rootElement = document.documentElement;

        if (settings.crt?.enabled) {
            rootElement.classList.add('crt-effect');

            // Set per-effect intensity CSS variables
            rootElement.style.setProperty('--crt-scanlines', String(settings.crt.scanlines ?? 0));
            rootElement.style.setProperty('--crt-flicker', String(settings.crt.flicker ?? 0));
            rootElement.style.setProperty('--crt-rgb-offset', String(settings.crt.rgbOffset ?? 0));
            rootElement.style.setProperty('--crt-curvature', String(settings.crt.curvature ?? 0));

            // Toggle flicker animation class based on intensity
            if ((settings.crt.flicker ?? 0) > 0) {
                rootElement.classList.add('crt-flicker-active');
            } else {
                rootElement.classList.remove('crt-flicker-active');
            }

            // Toggle RGB offset class based on intensity
            if ((settings.crt.rgbOffset ?? 0) > 0) {
                rootElement.classList.add('crt-rgb-active');
            } else {
                rootElement.classList.remove('crt-rgb-active');
            }
        } else {
            rootElement.classList.remove('crt-effect', 'crt-flicker-active', 'crt-rgb-active');
            rootElement.style.removeProperty('--crt-scanlines');
            rootElement.style.removeProperty('--crt-flicker');
            rootElement.style.removeProperty('--crt-rgb-offset');
            rootElement.style.removeProperty('--crt-curvature');
        }
    }, [settings.crt]);

    // Global resize handler
    useEffect(() => {
        const handleResize = () => {
            if (desktopContainerRef.current && windows) {
                const viewport: ViewportDimensions = {
                    width: desktopContainerRef.current.clientWidth,
                    height: desktopContainerRef.current.clientHeight,
                };

                windows.forEach(win => {
                    if (!win.maximized && win.width && win.height && typeof win.x === 'number' && typeof win.y === 'number') {
                        const currentWindowData: WindowDimensions = {
                            x: win.x,
                            y: win.y,
                            width: win.width,
                            height: win.height,
                            minWidth: win.minWidth ?? WINDOW_DEFAULTS.MIN_WIDTH,
                            minHeight: win.minHeight ?? WINDOW_DEFAULTS.MIN_HEIGHT,
                        };

                        const adjusted = adjustWindowToViewport(currentWindowData, viewport);

                        if (adjusted.changed) {
                            if (win.x !== adjusted.x || win.y !== adjusted.y) {
                                updateWindowPosition(win.id, adjusted.x, adjusted.y);
                            }
                            if (win.width !== adjusted.width || win.height !== adjusted.height) {
                                updateWindowDimensions(win.id, adjusted.width, adjusted.height);
                            }
                        }
                    }
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [windows, updateWindowPosition, updateWindowDimensions]);

    const handleOpenAbout = () => {
        const app = APP_LIST.find(app => app.name === "About");
        if (app?.singleInstance) {
            addOrFocusWindow({
                title: "About",
                content: <About />,
                width: app?.defaultWidth ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
                height: app?.defaultHeight ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
                iconType: 'about',
                minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
                minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
                singleInstance: true,
                componentType: "About",
            });
        } else {
            addWindow({
                title: "About",
                content: <About />,
                width: app?.defaultWidth ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
                height: app?.defaultHeight ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
                iconType: 'about',
                minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
                minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
                componentType: "About",
            });
        }
    };

    const handleOpenFeaturedChannel = (slug: string, title: string) => {
        const app = APP_LIST.find(app => app.name === "Are.na Browser");
        addWindow({
            title: title,
            content: <ChannelExplorer channelSlug={slug} username="lok" />,
            width: app?.defaultWidth ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
            height: app?.defaultHeight ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
            iconType: 'folder',
            minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
            minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
            componentType: 'ChannelExplorer',
            props: { channelSlug: slug, username: 'lok' },
        });
    };

    const handleOpenSearchWindow = () => {
        toast.info("Search functionality coming soon!");
    };

    const handleOpenSettingsWindow = () => {
        const app = APP_LIST.find(app => app.name === "Config");
        if (app?.singleInstance) {
            addOrFocusWindow({
                title: 'Config',
                iconType: 'config',
                content: <ConfigApp />,
                width: app?.defaultWidth ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
                height: app?.defaultHeight ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
                x: 150,
                y: 100,
                minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
                minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
                singleInstance: true,
                componentType: "Config",
            });
        } else {
            addWindow({
                title: 'Config',
                iconType: 'config',
                content: <ConfigApp />,
                width: app?.defaultWidth ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
                height: app?.defaultHeight ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
                x: 150,
                y: 100,
                minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
                minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
                componentType: "Config",
            });
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col">
            <TopBar />

            <div ref={desktopContainerRef} className={`desktop-container relative overflow-hidden ${settings.wallpaper ? 'has-wallpaper' : ''}`}>
                <WindowContainer />
                <DesktopIcons
                    addWindow={addWindow}
                    addOrFocusWindow={addOrFocusWindow}
                    handleOpenAbout={handleOpenAbout}
                    handleOpenSettingsWindow={handleOpenSettingsWindow}
                />
            </div>

            <Taskbar />

            {/* Oneko cat */}
            <Oneko />

            {/* CRT RGB Filter (SVG) */}
            {settings.crt?.enabled && (settings.crt?.rgbOffset ?? 0) > 0 && (
                <CrtFilter rgbOffset={settings.crt.rgbOffset ?? 0} />
            )}

            {/* Oneko first-time prompt (non-intrusive, draggable) */}
            <PopupDialog
                title="Oneko"
                iconType="config"
                isOpen={showOnekoPrompt}
                onClose={() => handleOnekoResponse(false)}
                width={300}
                intrusive={false}
            >
                <p>Do you want a cat chasing your cursor?</p>
                <PopupDialogButtons>
                    <RetroButton onClick={() => handleOnekoResponse(true)}>
                        Yes
                    </RetroButton>
                    <RetroButton onClick={() => handleOnekoResponse(false)}>
                        No
                    </RetroButton>
                </PopupDialogButtons>
            </PopupDialog>
        </div>
    );
};

export default Desktop;
