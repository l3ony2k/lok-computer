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
        toast.info("Settings functionality coming soon!");
    };

    return (
        <div className={`h-screen w-screen flex flex-col ${theme === "dark" ? "dark" : ""}`}>
            <div className="bg-retro-taskbar h-[30px] border-b border-border flex items-center justify-between text-sm relative z-[10000] px-1">
                <div className="flex space-x-1 py-1">
                    <button className="retro-button" onClick={handleOpenChannelBrowser}>
                        Home
                    </button>
                    <button className="retro-button" onClick={handleOpenAbout}>
                        About
                    </button>

                    <div className="relative group">
                        <button className="retro-button">
                            Featured Channels
                        </button>
                        <div className="absolute top-full left-0 hidden group-hover:block bg-retro-taskbar border border-border shadow-md z-50 w-60">
                            {FEATURED_CHANNELS.map((channel) => (
                                <button
                                    key={channel.slug}
                                    className="block w-full text-left px-3 py-1 hover:bg-accent truncate"
                                    onClick={() => handleOpenFeaturedChannel(channel.slug, channel.title)}
                                >
                                    {channel.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex space-x-1 py-1">
                    <button className="retro-button p-1" onClick={handleOpenSearchWindow}>
                        <Search className="w-4 h-4" />
                    </button>
                    <button className="retro-button p-1" onClick={handleOpenSettingsWindow}>
                        <Settings className="w-4 h-4" />
                    </button>
                    <button className="retro-button p-1" onClick={toggleTheme}>
                        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>
            </div>

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
