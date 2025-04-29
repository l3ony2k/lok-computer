// src/core/Desktop.tsx
import { useEffect } from "react";
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

export const Desktop = () => {
    const { addWindow } = useWindowManager();
    const { theme, setTheme } = useTheme();
    const { settings } = useUserSettings();
    
    // Apply the wallpaper as a CSS variable if it exists
    useEffect(() => {
        const rootElement = document.documentElement;
        
        if (settings.wallpaper) {
            rootElement.style.setProperty('--wallpaper-url', `url("${settings.wallpaper}")`);
        } else {
            rootElement.style.removeProperty('--wallpaper-url');
        }
    }, [settings.wallpaper]);

    const handleOpenChannelBrowser = () => {
        addWindow({
            title: "@lok's Channels",
            content: <ChannelBrowser username="lok" />,
            width: 600,
            height: 500,
            iconType: 'folder',
        });
    };

    const handleOpenAbout = () => {
        addWindow({
            title: "About",
            content: <About />,
            width: 400,
            height: 400,
            iconType: 'about',
        });
    };

    const handleOpenFeaturedChannel = (slug: string, title: string) => {
        addWindow({
            title: title,
            content: <ChannelExplorer channelSlug={slug} username="lok" />,
            width: 600,
            height: 500,
            iconType: 'folder',
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
        });
    };

    return (
        <div className={`h-screen w-screen flex flex-col ${theme === "dark" ? "dark" : ""}`}>
            <TopBar />

            <div className={`desktop-container ${settings.wallpaper ? 'has-wallpaper' : ''}`}>
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
