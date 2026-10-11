import React, { useEffect, useMemo, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { AppMenu, type AppMenuItem, type MenuPlacement } from '@/components/menu/AppMenu';
import { Calendar } from '@/components/calendar/Calendar';
import { CustomIcon } from '@/components/window/CustomIcon';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { useTheme } from '@/hooks/useTheme';
import { APP_LIST } from '@/config/apps';
import { getUserChannels } from '@/lib/api';
import type { ArenaChannel } from '@/types/arena';

interface LinkAppItem {
  title: string;
  source: {
    url: string;
  };
}

const arenaUsername = APP_LIST.find((app) => app.name === 'Are.na')?.props?.username;

/** Application menu entries, including Are.na channel and link submenus. */
const useSystemMenuItems = () => {
  const openApplication = useApplicationLauncher();
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

  return useMemo<AppMenuItem[]>(() => APP_LIST.map((app) => {
    const baseItem: AppMenuItem = {
      name: app.name,
      iconType: app.iconType,
      action: () => openApplication(app.componentType),
      subItems: [],
    };

    const username = typeof app.props?.username === 'string' ? app.props.username : undefined;
    if (app.name === 'Are.na' && username) {
      baseItem.subItems = arenaChannels.map((channel) => ({
        name: channel.title,
        iconType: 'folder',
        action: () => openApplication('ChannelExplorer', {
          title: channel.title,
          iconType: 'folder',
          props: { channelSlug: channel.slug, username },
        }),
      }));
    }

    if (app.name === 'Links' && app.props?.items) {
      baseItem.subItems = (app.props.items as LinkAppItem[]).map((item) => ({
        name: item.title,
        iconType: 'link',
        action: () => openApplication('Web', {
          title: item.title,
          iconType: 'link',
          props: { initialUrl: item.source.url },
        }),
      }));
    }

    if (baseItem.subItems?.length) baseItem.action = undefined;
    return baseItem;
  }), [arenaChannels, openApplication]);
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
      />
    </>
  );
});
