import React, { useState, useEffect } from 'react';
import { AppMenu, AppMenuItem } from '@/components/menu/AppMenu';
import { useWindowManager } from '@/hooks/useWindowManager';
import { APP_LIST } from '@/config/apps';
import { getUserChannels } from '@/lib/api';
import { ArenaChannel } from '@/types/arena';
import { ChannelExplorer } from '@/apps/arena/channels/ChannelExplorer';
import { WebBrowser } from '@/apps/web/WebBrowser';
import { Calendar } from '@/components/calendar/Calendar';

export const TopBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { addWindow, addOrFocusWindow } = useWindowManager();
  const [appMenuItems, setAppMenuItems] = useState<AppMenuItem[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchMenuData = async () => {
      const generatedItems: AppMenuItem[] = await Promise.all(APP_LIST.map(async (app) => {
        const baseItem: AppMenuItem = {
          name: app.name,
          iconType: app.iconType,
          action: () => {
            if (app.singleInstance) {
              addOrFocusWindow({
                title: app.name,
                content: <app.component {...(app.props || {})} />,
                width: app.defaultWidth,
                height: app.defaultHeight,
                iconType: app.iconType,
                singleInstance: true,
              });
            } else {
              addWindow({
                title: app.name,
                content: <app.component {...(app.props || {})} />,
                width: app.defaultWidth,
                height: app.defaultHeight,
                iconType: app.iconType,
              });
            }
          },
          subItems: []
        };

        if (app.name === 'Are.na Browser' && app.props?.username) {
          try {
            const channels: ArenaChannel[] = await getUserChannels(app.props.username);
            baseItem.subItems = channels.map(channel => ({
              name: channel.title,
              iconType: 'folder',
              action: () => addWindow({
                title: channel.title,
                content: <ChannelExplorer channelSlug={channel.slug} username={app.props.username} />,
                width: 600,
                height: 500,
                iconType: 'folder',
              }),
            }));
          } catch (e) {
            console.error("Failed to fetch channels for app menu", e);
          }
        }

        if (app.name === 'Links' && app.props?.items) {
          baseItem.subItems = app.props.items.map((item: any) => ({
            name: item.title,
            iconType: 'link',
            action: () => addWindow({
              title: item.title,
              content: <WebBrowser initialUrl={item.source.url} />,
              width: 800,
              height: 600,
              iconType: 'link',
            }),
          }));
        }

        if (baseItem.subItems && baseItem.subItems.length > 0) {
          baseItem.action = undefined;
        }

        return baseItem;
      }));
      setAppMenuItems(generatedItems);
    };

    fetchMenuData();
  }, [addWindow, addOrFocusWindow]);

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
      <div className="h-[35px] bg-retro-taskbar text-sm px-2 flex items-center border-b border-border select-none">
        <div className="flex items-center">
          <button
            onClick={toggleAppMenu}
            className="font-mono font-bold text-s text-neutral-700 dark:text-neutral-100 tracking-tight hover:bg-accent h-[24px] px-2 flex items-center justify-center rounded-sm select-none"
          >
            lok.computer
          </button>
        </div>

        <div className="ml-auto flex items-center space-x-2 text-s font-mono font-bold select-none">
          <button
            onClick={toggleCalendar}
            className="flex items-center space-x-2 hover:bg-accent h-[24px] px-2 rounded-sm select-none"
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
};