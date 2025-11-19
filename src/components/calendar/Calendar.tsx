import React, { useState, useEffect } from 'react';

interface CalendarProps {
  isOpen: boolean;
  onClose: () => void;
  date?: Date;
}

export const Calendar: React.FC<CalendarProps> = ({
  isOpen,
  onClose,
  date = new Date()
}) => {
  const [clockTime, setClockTime] = useState(new Date());

  // Update clock time every second
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setClockTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get month data
  const month = date.getMonth();
  const year = date.getFullYear();
  const currentDay = date.getDate();

  // Names for days and months
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Get first day of the month and total days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Generate calendar grid
  const calendarDays = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-7 w-7"></div>);
  }

  // Add cells for all days in the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isCurrentDay = day === currentDay;
    calendarDays.push(
      <div
        key={`day-${day}`}
        className={`h-7 w-7 flex items-center justify-center text-xs select-none ${isCurrentDay
            ? 'bg-accent text-neutral-700 dark:text-neutral-100 font-bold'
            : 'text-neutral-700 dark:text-neutral-100'
          }`}
      >
        {day}
      </div>
    );
  }

  // Calculate clock hand angles
  const seconds = clockTime.getSeconds();
  const minutes = clockTime.getMinutes();
  const hours = clockTime.getHours() % 12;

  const secondDegrees = (seconds / 60) * 360;
  const minuteDegrees = ((minutes + seconds / 60) / 60) * 360;
  const hourDegrees = ((hours + minutes / 60) / 12) * 360;

  // Generate minute marks
  const minuteMarks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 360;
    const isHourMark = i % 5 === 0;
    minuteMarks.push(
      <line
        key={`mark-${i}`}
        x1={isHourMark ? 42 : 46}
        y1={0}
        x2={50}
        y2={0}
        transform={`rotate(${angle})`}
        stroke={`currentColor`}
        strokeWidth={isHourMark ? 1.5 : 0.5}
        className="text-neutral-700 dark:text-neutral-100"
        strokeLinecap="round"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[10000]"
      onClick={handleOutsideClick}
    >
      <div className="absolute top-[35px] right-2 bg-retro-taskbar border border-border shadow-md p-3 select-none">
        {/* Analog Clock */}
        <div className="flex justify-center mb-3 select-none">
          <svg width="110" height="110" viewBox="0 0 110 110">
            {/* Clock Face - Circle with minute marks */}
            <circle
              cx="55"
              cy="55"
              r="50"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-neutral-700 dark:text-neutral-100"
            />

            {/* Minute marks */}
            <g transform="translate(55, 55)">
              {minuteMarks}
            </g>

            {/* Hour Hand */}
            <line
              x1="55"
              y1="55"
              x2="55"
              y2="30"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-neutral-700 dark:text-neutral-100"
              transform={`rotate(${hourDegrees}, 55, 55)`}
            />

            {/* Minute Hand */}
            <line
              x1="55"
              y1="55"
              x2="55"
              y2="20"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-neutral-700 dark:text-neutral-100"
              transform={`rotate(${minuteDegrees}, 55, 55)`}
            />

            {/* Second Hand */}
            <line
              x1="55"
              y1="60"
              x2="55"
              y2="15"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeLinecap="round"
              className="text-accent"
              transform={`rotate(${secondDegrees}, 55, 55)`}
            />

            {/* Center Dot */}
            <circle
              cx="55"
              cy="55"
              r="2"
              fill="currentColor"
              className="text-neutral-700 dark:text-neutral-100"
            />
          </svg>
        </div>

        <div className="text-center text-sm mb-2 text-neutral-700 dark:text-neutral-100 select-none">
          {monthNames[month]} {year}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Day names row */}
          {dayNames.map(day => (
            <div key={day} className="h-7 w-7 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-100 select-none">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays}
        </div>
      </div>
    </div>
  );
}; 