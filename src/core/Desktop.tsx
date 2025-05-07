// src/core/Desktop.tsx
import { useEffect, useRef } from "react";
import { useWindowManager } from "@/components/WindowManager";
import { ChannelBrowser } from "@/apps/arena/channels/ChannelBrowser";
import { ChannelExplorer } from "@/apps/arena/channels/ChannelExplorer";
import { About } from "@/apps/about/about/About";
import { Moon, Sun, Search, Settings } from "lucide-react";
import { toast } from "sonner";
import { FEATURED_CHANNELS } from "@/config/channels";
import { WindowContainer, Taskbar } from "@/components/WindowManager";
import { DesktopIcons } from "@/components/desktop/DesktopIcons";
import { TopBar } from "./TopBar";
import { ConfigApp } from "@/apps/config/ConfigApp";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTheme } from "next-themes";
import { adjustWindowToViewport, type WindowDimensions, type ViewportDimensions } from "@/lib/utils";

// Default min dimensions, ideally from a shared constants file or useWindowManager context
const MIN_WINDOW_WIDTH = 250;
const MIN_WINDOW_HEIGHT = 200;

export const Desktop = () => {
    const { addWindow, windows, updateWindowPosition, updateWindowDimensions } = useWindowManager();
    const { theme, setTheme } = useTheme();
    const { settings } = useUserSettings();
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
                            minWidth: win.minWidth ?? MIN_WINDOW_WIDTH,
                            minHeight: win.minHeight ?? MIN_WINDOW_HEIGHT,
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

    const handleOpenChannelBrowser = () => {
        addWindow({
            title: "@lok's Channels",
            content: <ChannelBrowser username="lok" />,
            width: 600,
            height: 500,
            iconType: 'folder',
            minWidth: MIN_WINDOW_WIDTH,
            minHeight: MIN_WINDOW_HEIGHT,
        });
    };

    const handleOpenAbout = () => {
        addWindow({
            title: "About",
            content: <About />,
            width: 400,
            height: 400,
            iconType: 'about',
            minWidth: MIN_WINDOW_WIDTH,
            minHeight: MIN_WINDOW_HEIGHT,
        });
    };

    const handleOpenFeaturedChannel = (slug: string, title: string) => {
        addWindow({
            title: title,
            content: <ChannelExplorer channelSlug={slug} username="lok" />,
            width: 600,
            height: 500,
            iconType: 'folder',
            minWidth: MIN_WINDOW_WIDTH,
            minHeight: MIN_WINDOW_HEIGHT,
        });
    };

    const handleOpenSearchWindow = () => {
        toast.info("Search functionality coming soon!");
    };

    const handleOpenSettingsWindow = () => {
        addWindow({
            title: 'Config',
            iconType: 'config', 
            content: <ConfigApp />,
            width: 400, 
            height: 500,
            x: 150, 
            y: 100,
            minWidth: MIN_WINDOW_WIDTH,
            minHeight: MIN_WINDOW_HEIGHT,
        });
    };

    return (
        <div className={`h-screen w-screen flex flex-col ${theme === "dark" ? "dark" : ""}`}>
            <TopBar />

            <div ref={desktopContainerRef} className={`desktop-container ${settings.wallpaper ? 'has-wallpaper' : ''}`}>
                <WindowContainer />
                <DesktopIcons 
                    addWindow={addWindow}
                    handleOpenAbout={handleOpenAbout}
                    handleOpenSettingsWindow={handleOpenSettingsWindow}
                />
            </div>

            <Taskbar />
        </div>
    );
};

export default Desktop;
