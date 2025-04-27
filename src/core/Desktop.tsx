// src/core/Desktop.tsx
import { useState, useEffect } from "react";
import { useWindowManager } from "@/components/WindowManager"; // Keep original path for now
import { ChannelBrowser } from "@/apps/arena/channels/ChannelBrowser"; // Updated path
import { ChannelExplorer } from "@/apps/arena/channels/ChannelExplorer"; // Updated path
import { About } from "@/apps/about/about/About"; // Updated path
import { Moon, Sun, Search, Settings } from "lucide-react";
import { toast } from "sonner";
import { FEATURED_CHANNELS } from "@/config/channels"; // Keep original path for now
import { WindowContainer, Taskbar } from "@/components/WindowManager"; // Keep original path for now

export const Desktop = () => {
    const { addWindow } = useWindowManager();
    const [theme, setTheme] = useState<"light" | "dark">(
        () => (localStorage.getItem("theme") as "light" | "dark") || "light"
    );
    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        // Prevent infinite window creation by checking if we've already initialized
        if (hasInitialized) return;

        // Open the main channel browser on first load
        addWindow({
            title: "@lok's Channels",
            content: <ChannelBrowser username="lok" />,
            width: 600,
            height: 500,
            x: 50,
            y: 50,
            iconType: 'folder',
        });

        setHasInitialized(true);
    }, [addWindow, hasInitialized]);

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
            iconType: 'config',
        });
    };

    const handleOpenFeaturedChannel = (slug: string, title: string) => {
        // Create a new window for the featured channel
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
            {/* Top Menu Bar - Increase z-index */}
            <div className="bg-retro-taskbar h-[30px] border-b border-border flex items-center justify-between text-sm relative z-[10000] px-1">
                <div className="flex space-x-1 py-1">
                    <button className="retro-button" onClick={handleOpenChannelBrowser}>
                        Home
                    </button>
                    <button className="retro-button" onClick={handleOpenAbout}>
                        About
                    </button>

                    {/* Featured channels dropdown */}
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

            {/* Main Desktop Area */}
            <div className="flex-1 relative overflow-hidden">
                <WindowContainer />
            </div>

            {/* Taskbar */}
            <Taskbar />
        </div>
    );
};

export default Desktop; // Use default export for consistency if preferred, or named export
