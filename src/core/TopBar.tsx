import React, { useState, useEffect } from 'react';

export const TopBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

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

  return (
    <div className="h-[30px] bg-retro-taskbar text-sm px-2 flex items-center border-b border-border select-none">
      {/* Left side: lok.computer */}
        <span className="font-mono font-bold text-s text-neutral-700 dark:text-neutral-100 tracking-tight">lok.computer</span>
      {/* Right side: Date and Time */}
      <div className="ml-auto flex items-center space-x-2 text-s font-mono font-bold">
        <span>{formatDate(currentTime)}</span>
        <span>{formatTime(currentTime)}</span>
      </div>
    </div>
  );
};