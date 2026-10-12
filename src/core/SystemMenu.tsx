import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { AppMenu, type MenuPlacement } from '@/components/menu/AppMenu';
import type { MenuEntry } from '@/components/menu/MenuItems';
import { Calendar } from '@/components/calendar/Calendar';
import { CustomIcon } from '@/components/window/CustomIcon';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { useTheme } from '@/hooks/useTheme';
import { APP_LIST } from '@/config/apps';
import { getUserChannels } from '@/lib/api';
import { launcherShortcutLabel, openLauncher } from '@/lib/launcher';
import { clearRecent, useRecentApps } from '@/lib/recentApps';
import { rebootSystem, requestSystemUpdateCheck } from '@/lib/system';
import type { ArenaChannel } from '@/types/arena';

interface LinkAppItem {
  title: string;
  source: {
    url: string;
  };
}

const arenaUsername = APP_LIST.find((app) => app.name === 'Are.na')?.props?.username;

/**
 * System menu entries: Applications (with Are.na channels and links nested),
 * Recent, search, About, Config, and the system commands.
 */
const useSystemMenuItems = () => {
  const openApplication = useApplicationLauncher();
  const recent = useRecentApps();
  const [arenaChannels, setArenaChannels] = useState<ArenaChannel[]>([]);

  useEffect(() => {
    if (typeof arenaUsername !== 'string') return;

    let cancelled = false;
    void getUserChannels(arenaUsername)
      .then((channels) => {
        if (!cancelled) setArenaChannels(channels);
      })
      .catch((error) => console.error('Failed to fetch channels for app menu', error));

    return () => { cancelled = true; };
  }, []);

  const applications = useMemo<MenuEntry[]>(() => APP_LIST.map((app) => {
    const item: MenuEntry = {
      label: app.name,
      icon: app.iconType,
      action: () => openApplication(app.componentType),
    };

    const username = typeof app.props?.username === 'string' ? app.props.username : undefined;
    if (app.name === 'Are.na' && username && arenaChannels.length) {
      item.subItems = arenaChannels.map((channel) => ({
        label: channel.title,
        icon: 'folder',
        action: () => openApplication('ChannelExplorer', {
          title: channel.title,
          iconType: 'folder',
          props: { channelSlug: channel.slug, username },
        }),
      }));
      item.action = undefined;
    }

    if (app.name === 'Links' && Array.isArray(app.props?.items)) {
      item.subItems = (app.props.items as LinkAppItem[]).map((link) => ({
        label: link.title,
        icon: 'link',
        action: () => openApplication('Web', {
          title: link.title,
          iconType: 'link',
          props: { initialUrl: link.source.url },
        }),
      }));
      item.action = undefined;
    }

    return item;
  }), [arenaChannels, openApplication]);

  return useMemo<MenuEntry[]>(() => {
    const recentItems: MenuEntry[] = recent.map((entry) => ({
      label: entry.title,
      icon: entry.iconType,
      action: () => openApplication(entry.componentType, { title: entry.title, iconType: entry.iconType, props: entry.props }),
    }));
    if (recentItems.length) {
      recentItems.push({ type: 'divider' }, { label: 'Clear Recent', action: clearRecent });
    }

    return [
      { label: 'Applications', icon: 'folder', subItems: applications },
      { label: 'Recent', icon: 'folder', subItems: recentItems, disabled: recentItems.length === 0 },
      { type: 'divider' },
      { label: 'Search…', shortcut: launcherShortcutLabel(), action: openLauncher },
      { type: 'divider' },
      { label: 'About lok.computer', icon: 'about', action: () => openApplication('About') },
      { label: 'Config…', icon: 'config', action: () => openApplication('Config') },
      { type: 'divider' },
      { label: 'Check for updates', action: requestSystemUpdateCheck },
      { label: 'Restart', action: () => void rebootSystem('restart from the system menu') },
    ];
  }, [applications, openApplication, recent]);
};

/**
 * The system menu trigger. In the lok layout it is the `lok.computer` wordmark
 * in the top bar; in classic layouts it becomes the start button.
 */
export const SystemMenuButton: React.FC<{ placement: MenuPlacement }> = React.memo(({ placement }) => {
  const [isOpen, setIsOpen] = useState(false);
  const items = useSystemMenuItems();
  const { definition } = useTheme();
  const isStart = placement === 'bottom';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={isStart
          ? 'start-button flex items-center justify-center select-none'
          : 'app-header-button system-menu-button font-bold tracking-tight flex items-center justify-center select-none'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={isStart ? 'Start menu' : definition.menuLabel ? 'lok.computer menu' : undefined}
      >
        {isStart ? (
          <>
            <CustomIcon iconType="about" className="start-button-icon" />
            {definition.startLabel && <span className="start-button-label">{definition.startLabel}</span>}
          </>
        ) : (definition.menuLabel ?? 'lok.computer')}
      </button>

      <AppMenu
        items={items}
        isOpen={isOpen}
        placement={placement}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
});

/** Opens the keyboard launcher; sits beside the clock in both layouts. */
export const SearchButton: React.FC<{ placement: MenuPlacement }> = React.memo(({ placement }) => {
  const isTray = placement === 'bottom';
  const shortcut = launcherShortcutLabel();
  return (
    <button
      type="button"
      onClick={openLauncher}
      className={isTray
        ? 'taskbar-search flex items-center justify-center select-none'
        : 'app-header-button app-header-search flex items-center justify-center select-none'}
      title={`Search (${shortcut})`}
      aria-label={`Search, ${shortcut}`}
      aria-keyshortcuts={shortcut === '⌘K' ? 'Meta+K' : 'Control+K'}
    >
      <Search className="w-4 h-4" aria-hidden="true" />
    </button>
  );
});

/** Sits beside the clock while the browser reports no connection. */
export const OfflineReadout: React.FC = () => {
  const online = useOnlineStatus();
  if (online) return null;
  return <span className="system-offline" role="status" title="No connection">OFFLINE</span>;
};

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
// Local calendar date (toISOString would print the UTC date, which is off by one near midnight).
const formatDate = (date: Date) => {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Clock and calendar. The ticking state lives here so the surrounding bar does
 * not re-render every second.
 */
export const SystemClock: React.FC<{ placement: MenuPlacement }> = React.memo(({ placement }) => {
  const [now, setNow] = useState(() => new Date());
  const [isOpen, setIsOpen] = useState(false);
  const isTray = placement === 'bottom';
  const openApplication = useApplicationLauncher();
  const openClock = useCallback(() => {
    setIsOpen(false);
    openApplication('Clock');
  }, [openApplication]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={isTray
          ? 'taskbar-clock flex items-center select-none'
          : 'app-header-button flex items-center gap-2 select-none'}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={isTray ? `${formatDate(now)} ${formatTime(now)}` : undefined}
      >
        {isTray ? (
          <>
            <span className="taskbar-clock-time">{formatTime(now)}</span>
            <span className="taskbar-clock-date">{formatDate(now)}</span>
          </>
        ) : (
          <>
            <span>{formatDate(now)}</span>
            <span>{formatTime(now)}</span>
          </>
        )}
      </button>

      <Calendar
        isOpen={isOpen}
        placement={placement}
        onClose={() => setIsOpen(false)}
        date={now}
        onOpenClock={openClock}
      />
    </>
  );
});
