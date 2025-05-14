import React from 'react';

interface ArenaWindowLayoutProps {
  /** Toolbar area (e.g. buttons, inputs) */
  toolbar: React.ReactNode;
  /** Main content to render inside scrollable area */
  children: React.ReactNode;
}

/**
 * Arena-specific window layout: toolbar + scrollable content.
 */
export const ArenaWindowLayout = ({ toolbar, children }: ArenaWindowLayoutProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-2 flex items-center select-none">
        {toolbar}
      </div>
      <div className="window-content-area flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};
