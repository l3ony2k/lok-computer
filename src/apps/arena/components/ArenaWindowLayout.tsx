import React from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';

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
    <WindowLayout
      toolbar={toolbar}
      isScrollable={true}
      hasPadding={false} // Arena content usually handles its own padding or needs full width
    >
      {children}
    </WindowLayout>
  );
};
