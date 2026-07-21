// src/core/Desktop.tsx
import { useCallback, useEffect, useRef } from "react";
import { useWindowActions, useWindowState } from "@/hooks/useWindowManager";
import { WindowContainer, Taskbar } from "@/components/WindowManager";
import { DesktopIcons } from "@/components/desktop/DesktopIcons";
import { TopBar } from "./TopBar";
import { useUserSettings } from "@/hooks/useUserSettings";
import { adjustWindowToViewport, type WindowDimensions, type ViewportDimensions } from "@/lib/utils";
import { WINDOW_DEFAULTS } from "@/config/window";
import { APP_LIST } from "@/config/apps";
import { Oneko } from "@/components/oneko/Oneko";
import { CrtFilter } from "@/components/effects/CrtFilter";
import { OutOfBoxExperience, type OobeSelection } from "@/components/system/OutOfBoxExperience";

export const Desktop = () => {
    const { windows } = useWindowState();
    const { addWindow, addOrFocusWindow, updateWindowPosition, updateWindowDimensions } = useWindowActions();
    const { settings, updateSetting, isLoading } = useUserSettings();

    // The legacy prompt flag migrates existing users past the new first-run flow.
    const showOobe = !isLoading && !settings.oobe?.completed && !settings.oneko?.hasBeenAsked;

    const completeOobe = useCallback(({ onekoEnabled, crtEnabled }: OobeSelection) => {
        updateSetting('oneko', {
            enabled: onekoEnabled,
            hasBeenAsked: true,
            speed: settings.oneko?.speed ?? 10,
            variant: settings.oneko?.variant ?? 'default',
        });
        updateSetting('crt', {
            enabled: crtEnabled,
            scanlines: settings.crt?.scanlines ?? 50,
            flicker: settings.crt?.flicker ?? 10,
            rgbOffset: settings.crt?.rgbOffset ?? 50,
            curvature: settings.crt?.curvature ?? 20,
        });
        updateSetting('oobe', { completed: true });
    }, [settings.crt, settings.oneko, updateSetting]);
    const desktopContainerRef = useRef<HTMLDivElement>(null);
    const windowsRef = useRef(windows);
    windowsRef.current = windows;
    const windowIdentity = windows.map((window) => window.id).join('|');

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

    useEffect(() => {
        fitWindowsToViewport();
    }, [fitWindowsToViewport, windowIdentity]);

    // Open an app from APP_LIST by name, respecting its singleInstance flag.
    const openApp = useCallback((name: string, position?: { x: number; y: number }) => {
        const app = APP_LIST.find(a => a.name === name);
        if (!app) return;

        addOrFocusWindow({
            title: app.name,
            content: <app.component {...(app.props || {})} />,
            width: app.defaultWidth ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
            height: app.defaultHeight ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
            iconType: app.iconType,
            minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
            minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
            singleInstance: app.singleInstance,
            componentType: app.name,
            props: app.props,
            ...position,
        });
    }, [addOrFocusWindow]);

    const handleOpenAbout = useCallback(() => openApp("About"), [openApp]);
    const handleOpenSettingsWindow = useCallback(() => openApp("Config", { x: 150, y: 100 }), [openApp]);

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

            <OutOfBoxExperience
                isOpen={showOobe}
                initialOnekoEnabled={settings.oneko?.enabled}
                initialCrtEnabled={settings.crt?.enabled}
                onComplete={completeOobe}
            />
        </div>
    );
};

export default Desktop;
