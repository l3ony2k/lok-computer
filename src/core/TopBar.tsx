import React, { useState, useEffect } from 'react';
import { AppMenu } from '@/components/menu/AppMenu';
import { Calendar } from '@/components/calendar/Calendar';
import { ChannelBrowser } from '@/apps/arena/channels/ChannelBrowser';
import { About } from '@/apps/about/About';
import { ConfigApp } from '@/apps/config/ConfigApp';
import { WeatherApp } from '@/apps/weather/WeatherApp';
import BskyPostsApp from '@/apps/bsky/BskyPostsApp';

interface TopBarProps {
  addWindow: (windowProps: any) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ addWindow }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleOpenChannelBrowser = () => {
    addWindow({
      title: "Are.na Browser",
      content: <ChannelBrowser username="lok" />,
      width: 600,
      height: 500,
      iconType: 'arena',
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

  const handleOpenConfigApp = () => {
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

  const handleOpenWeatherApp = () => {
    addWindow({
      title: "Weather",
      content: <WeatherApp />,
      width: 860,
      height: 525,
      iconType: 'weather',
    });
  };

  const handleOpenBskyPostsApp = () => {
    addWindow({
      title: "Bsky Posts",
      content: <BskyPostsApp />,
      width: 450,
      height: 700,
      iconType: 'bsky',
    });
  };

  const appMenuItems = [
    {
      name: "Are.na Browser",
      iconType: "arena",
      action: handleOpenChannelBrowser
    },
    {
      name: "About",
      iconType: "about",
      action: handleOpenAbout
    },
    {
      name: "Weather",
      iconType: "weather",
      action: handleOpenWeatherApp
    },
    {
      name: "Bsky Posts",
      iconType: "bsky",
      action: handleOpenBskyPostsApp
    },
    {
      name: "Config",
      iconType: "config",
      action: handleOpenConfigApp
    }
  ];

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
      <div className="h-[30px] bg-retro-taskbar text-sm px-2 flex items-center border-b border-border select-none">
        {/* Left side: lok.computer */}
        <button 
          onClick={toggleAppMenu}
          className="font-mono font-bold text-s text-neutral-700 dark:text-neutral-100 tracking-tight hover:bg-accent px-1 py-0 rounded-sm select-none"
        >
          lok.computer
        </button>
        
        {/* Right side: Date and Time */}
        <div className="ml-auto flex items-center space-x-2 text-s font-mono font-bold select-none">
          <button
            onClick={toggleCalendar}
            className="flex items-center space-x-2 hover:bg-accent px-1 py-0 rounded-sm select-none"
          >
            <span>{formatDate(currentTime)}</span>
            <span>{formatTime(currentTime)}</span>
          </button>
        </div>
      </div>
      
      {/* App Menu */}
      <AppMenu 
        items={appMenuItems} 
        isOpen={isAppMenuOpen} 
        onClose={() => setIsAppMenuOpen(false)} 
      />

      {/* Calendar */}
      <Calendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        date={currentTime}
      />
    </>
  );
};