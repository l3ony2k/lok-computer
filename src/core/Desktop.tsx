// src/core/Desktop.tsx
import { useState } from "react";
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

export const Desktop = () => {
    const { addWindow } = useWindowManager();
    const [theme, setTheme] = useState<"light" | "dark">(
        () => (localStorage.getItem("theme") as "light" | "dark") || "light"
    );

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
    };

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
            width: 350, 
            height: 250,
            x: 150, 
            y: 150,
        });
    };

    return (
        <div className={`h-screen w-screen flex flex-col ${theme === "dark" ? "dark" : ""}`}>
            <TopBar />

            <div className="flex-1 relative overflow-hidden">
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
