import React from 'react';
import { createPortal } from 'react-dom';
import { getOverlayRoot } from '@/lib/overlayRoot';
import type { MenuPlacement } from '@/components/menu/AppMenu';
import { swatchBeats } from '@/lib/internetTime';

interface CalendarProps {
  isOpen: boolean;
  onClose: () => void;
  date?: Date;
  placement?: MenuPlacement;
  /** Opens the Clock app; the analog clock becomes a button when given. */
  onOpenClock?: () => void;
}

/** Calendar and analog clock flyout. `date` ticks from the clock that opens it. */
export const Calendar: React.FC<CalendarProps> = ({
  isOpen,
  onClose,
  date = new Date(),
  placement = 'top',
  onOpenClock,
}) => {
  if (!isOpen) return null;
  const clockTime = date;

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
          ? 'bg-accent text-foreground font-bold'
          : 'text-foreground'
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
        className="text-foreground"
        strokeLinecap="round"
      />
    );
  }

  // Portaled so the taskbar's stacking context cannot trap the panel below windows.
  return createPortal(
    <div
      className="fixed inset-0 z-[10000]"
      onClick={handleOutsideClick}
    >
      <div className="menu-surface calendar-panel p-3 select-none" data-placement={placement} role="dialog" aria-label="Calendar and clock">
        {/* Analog Clock: a button into the Clock app */}
        <div className="flex justify-center mb-3 select-none">
          <button
            type="button"
            className="calendar-clock-button"
            onClick={onOpenClock}
            disabled={!onOpenClock}
            title="Open Clock"
            aria-label="Open Clock"
          >
          <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
            {/* Clock Face - Circle with minute marks */}
            <circle
              cx="55"
              cy="55"
              r="50"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-foreground"
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
              className="text-foreground"
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
              className="text-foreground"
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
              className="text-foreground"
            />
          </svg>
          </button>
        </div>

        <div className="text-center text-sm mb-2 text-foreground select-none">
          {clockTime.getDate()} {monthNames[month]} {year}{' '}
          <a
            href="https://gwil.garden/internet-time/"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-help hover:text-accent"
            title={`Swatch Internet Time (.beats)
A decimal time concept dividing the day into 1000 beats.
No time zones, same time worldwide!`}
          >
            @{swatchBeats(clockTime)}
          </a>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Day names row */}
          {dayNames.map(day => (
            <div key={day} className="h-7 w-7 flex items-center justify-center text-xs font-bold text-foreground select-none">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays}
        </div>
      </div>
    </div>,
    getOverlayRoot(),
  );
};
