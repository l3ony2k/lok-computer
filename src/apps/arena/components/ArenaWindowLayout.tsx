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
    <div className="h-full flex flex-col">
      {toolbar}
      <div className="window-content-area overflow-auto flex-1">
        {children}
      </div>
    </div>
  );
};
