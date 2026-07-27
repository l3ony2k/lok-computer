import React, { useEffect, useMemo, useState } from 'react';
import { AppMenu, AppMenuItem } from '@/components/menu/AppMenu';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { APP_LIST } from '@/config/apps';
import { getUserChannels } from '@/lib/api';
import { ArenaChannel } from '@/types/arena';
import { Calendar } from '@/components/calendar/Calendar';

interface LinkAppItem {
  title: string;
  source: {
    url: string;
  };
}

const arenaUsername = APP_LIST.find((app) => app.name === 'Are.na')?.props?.username;

export const TopBar: React.FC = React.memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const openApplication = useApplicationLauncher();
  const [arenaChannels, setArenaChannels] = useState<ArenaChannel[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof arenaUsername !== 'string') return;

    let cancelled = false;
    void getUserChannels(arenaUsername)
      .then((channels) => {
        if (!cancelled) setArenaChannels(channels);
      })
      .catch((error) => console.error("Failed to fetch channels for app menu", error));

    return () => { cancelled = true; };
  }, []);

  const appMenuItems = useMemo<AppMenuItem[]>(() => APP_LIST.map((app) => {
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

    if (baseItem.subItems.length > 0) baseItem.action = undefined;
    return baseItem;
  }), [arenaChannels, openApplication]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const toggleAppMenu = () => {
    setIsAppMenuOpen(!isAppMenuOpen);
    if (isCalendarOpen) setIsCalendarOpen(false);
  };

  const toggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen);
    if (isAppMenuOpen) setIsAppMenuOpen(false);
  };

  return (
    <>
      <div className="app-header h-[35px] text-sm flex items-center select-none">
        <div className="flex items-center">
          <button
            onClick={toggleAppMenu}
            className="app-header-button font-mono font-bold tracking-tight flex items-center justify-center select-none"
            aria-haspopup="menu"
            aria-expanded={isAppMenuOpen}
          >
            lok.computer
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 text-sm font-mono select-none">
          <button
            onClick={toggleCalendar}
            className="app-header-button flex items-center gap-2 select-none"
            aria-haspopup="dialog"
            aria-expanded={isCalendarOpen}
          >
            <span>{formatDate(currentTime)}</span>
            <span>{formatTime(currentTime)}</span>
          </button>
        </div>
      </div>

      <AppMenu
        items={appMenuItems}
        isOpen={isAppMenuOpen}
        onClose={() => setIsAppMenuOpen(false)}
      />

      <Calendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        date={currentTime}
      />
    </>
  );
});
