// src/core/Desktop.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowActions, useWindowState } from "@/hooks/useWindowManager";
import { WindowContainer } from "@/components/window/WindowContainer";
import { Taskbar } from "./Taskbar";
import { DesktopIcons } from "@/components/desktop/DesktopIcons";
import { TopBar } from "./TopBar";
import { DEFAULT_DESKTOP_SETTINGS, useUserSettings, type DesktopSettings } from "@/hooks/useUserSettings";
import { useTheme } from "@/hooks/useTheme";
import { useApplicationLauncher } from "@/hooks/useApplicationLauncher";
import { adjustWindowToViewport, type WindowDimensions, type ViewportDimensions } from "@/lib/utils";
import { WINDOW_DEFAULTS } from "@/config/window";
import { Oneko } from "@/components/oneko/Oneko";
import { CrtFilter } from "@/components/effects/CrtFilter";
import { OutOfBoxExperience, type OobeSelection } from "@/components/system/OutOfBoxExperience";
import { KeyboardLauncher } from "@/components/launcher/KeyboardLauncher";
import { ContextMenu } from "@/components/menu/ContextMenu";
import type { MenuEntry } from "@/components/menu/MenuItems";
import { DESKTOP_ICON_ORDER_RESET_EVENT } from "@/lib/desktopIconOrder";
import { launcherShortcutLabel, openLauncher } from "@/lib/launcher";

export const Desktop = () => {
    const { windows } = useWindowState();
    const { updateWindowPosition, updateWindowDimensions } = useWindowActions();
    const { settings, updateSetting, isLoading } = useUserSettings();
    const { definition } = useTheme();
    const openApplication = useApplicationLauncher();
    const isClassicLayout = definition.layout === 'classic';
    const [desktopMenu, setDesktopMenu] = useState<{ x: number; y: number } | null>(null);

    // The legacy prompt flag migrates existing users past the new first-run flow.
    const showOobe = !isLoading && !settings.oobe?.completed && !settings.oneko?.hasBeenAsked;

    const previewOobe = useCallback(({ oneko, crt }: OobeSelection) => {
        updateSetting('oneko', {
            ...oneko,
            hasBeenAsked: false,
        });
        updateSetting('crt', crt);
    }, [updateSetting]);

    const completeOobe = useCallback(({ oneko, crt }: OobeSelection) => {
        updateSetting('oneko', { ...oneko, hasBeenAsked: true });
        updateSetting('crt', crt);
        updateSetting('oobe', { completed: true });
    }, [updateSetting]);
    const desktopContainerRef = useRef<HTMLDivElement>(null);
    const windowsRef = useRef(windows);
    windowsRef.current = windows;
    const windowIdentity = windows.map((window) => window.id).join('|');

    // A chosen wallpaper wins over the theme's own picture.
    const wallpaper = settings.wallpaper || definition.wallpaper;
    const desktop: DesktopSettings = { ...DEFAULT_DESKTOP_SETTINGS, ...settings.desktop };
    const updateDesktop = useCallback((patch: Partial<DesktopSettings>) => {
        updateSetting('desktop', { ...DEFAULT_DESKTOP_SETTINGS, ...settings.desktop, ...patch });
    }, [settings.desktop, updateSetting]);

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

    const fitWindowsToViewport = useCallback(() => {
        if (!desktopContainerRef.current) return;

        const viewport: ViewportDimensions = {
            width: desktopContainerRef.current.clientWidth,
            height: desktopContainerRef.current.clientHeight,
        };

        windowsRef.current.forEach((window) => {
            if (window.maximized || !window.width || !window.height || typeof window.x !== 'number' || typeof window.y !== 'number') return;

            const currentWindowData: WindowDimensions = {
                x: window.x,
                y: window.y,
                width: window.width,
                height: window.height,
                minWidth: window.minWidth ?? WINDOW_DEFAULTS.MIN_WIDTH,
                minHeight: window.minHeight ?? WINDOW_DEFAULTS.MIN_HEIGHT,
            };
            const adjusted = adjustWindowToViewport(currentWindowData, viewport);

            if (window.x !== adjusted.x || window.y !== adjusted.y) {
                updateWindowPosition(window.id, adjusted.x, adjusted.y);
            }
            if (window.width !== adjusted.width || window.height !== adjusted.height) {
                updateWindowDimensions(window.id, adjusted.width, adjusted.height);
            }
        });
    }, [updateWindowDimensions, updateWindowPosition]);

    useEffect(() => {
        window.addEventListener('resize', fitWindowsToViewport);
        return () => window.removeEventListener('resize', fitWindowsToViewport);
    }, [fitWindowsToViewport]);

    // The desktop area changes size when a theme moves the top bar into the taskbar.
    useEffect(() => {
        fitWindowsToViewport();
    }, [fitWindowsToViewport, windowIdentity, definition.layout]);

    // Right-click on the desktop itself; windows and icons bring their own menus.
    const handleContextMenu = (event: React.MouseEvent) => {
        const target = event.target as Element;
        if (target.closest('.draggable-window, .desktop-icon-button, .window-snap-preview')) return;
        event.preventDefault();
        setDesktopMenu({ x: event.clientX, y: event.clientY });
    };

    const desktopMenuItems: MenuEntry[] = [
        {
            label: 'View',
            subItems: [
                { label: 'Small icons', checked: desktop.iconSize === 's', action: () => updateDesktop({ iconSize: 's' }) },
                { label: 'Medium icons', checked: desktop.iconSize === 'm', action: () => updateDesktop({ iconSize: 'm' }) },
                { label: 'Large icons', checked: desktop.iconSize === 'l', action: () => updateDesktop({ iconSize: 'l' }) },
                { type: 'divider' },
                { label: 'Snap to grid', checked: desktop.snapToGrid, action: () => updateDesktop({ snapToGrid: !desktop.snapToGrid }) },
                { label: 'Show desktop icons', checked: desktop.showIcons, action: () => updateDesktop({ showIcons: !desktop.showIcons }) },
            ],
        },
        { label: 'Tidy up', action: () => window.dispatchEvent(new Event(DESKTOP_ICON_ORDER_RESET_EVENT)) },
        { type: 'divider' },
        { label: 'Search…', shortcut: launcherShortcutLabel(), action: openLauncher },
        { type: 'divider' },
        { label: 'Change wallpaper…', action: () => openApplication('Config', { props: { initialCategory: 'style', focusSetting: 'wallpaper' } }) },
        { label: 'Desktop settings…', action: () => openApplication('Config', { props: { initialCategory: 'desktop' } }) },
        { type: 'divider' },
        { label: 'About lok.computer', icon: 'about', action: () => openApplication('About') },
    ];

    // Dynamic viewport height: on phones the plain vh unit runs behind the browser toolbar and nothing can scroll it into view.
    return (
        <div className="h-dvh w-screen flex flex-col">
            {!isClassicLayout && <TopBar />}

            <div
                ref={desktopContainerRef}
                className="desktop-container relative"
                data-icon-size={desktop.iconSize}
                onContextMenu={handleContextMenu}
            >
                {wallpaper && (
                    <img
                        key={wallpaper}
                        className="desktop-wallpaper"
                        src={wallpaper}
                        alt=""
                        aria-hidden="true"
                        decoding="sync"
                        draggable={false}
                    />
                )}
                <WindowContainer />
                <DesktopIcons />
            </div>

            <Taskbar layout={definition.layout} />

            <KeyboardLauncher />

            <ContextMenu
                items={desktopMenuItems}
                isOpen={desktopMenu !== null}
                position={desktopMenu ?? { x: 0, y: 0 }}
                onClose={() => setDesktopMenu(null)}
            />

            {/* Oneko cat */}
            <Oneko />

            {/* CRT RGB Filter (SVG) */}
            {settings.crt?.enabled && (settings.crt?.rgbOffset ?? 0) > 0 && (
                <CrtFilter rgbOffset={settings.crt.rgbOffset ?? 0} />
            )}

            <OutOfBoxExperience
                isOpen={showOobe}
                initialOneko={settings.oneko}
                initialCrt={settings.crt}
                onPreview={previewOobe}
                onComplete={completeOobe}
            />
        </div>
    );
};

export default Desktop;
