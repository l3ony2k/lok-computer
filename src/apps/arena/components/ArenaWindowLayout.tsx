import React from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';

interface ArenaWindowLayoutProps {
  /** Toolbar area (e.g. buttons, inputs) */
  toolbar: React.ReactNode;
  /** Footer area (e.g. status bar) */
  footer?: React.ReactNode;
  /** Main content to render inside scrollable area */
  children: React.ReactNode;
}

/**
 * Arena-specific window layout: toolbar + scrollable content.
 */
export const ArenaWindowLayout = ({ toolbar, footer, children }: ArenaWindowLayoutProps) => {
  return (
    <WindowLayout
      toolbar={toolbar}
      footer={footer}
      isScrollable={true}
      hasPadding={false} // Arena content usually handles its own padding or needs full width
    >
      {children}
    </WindowLayout>
  );
};
