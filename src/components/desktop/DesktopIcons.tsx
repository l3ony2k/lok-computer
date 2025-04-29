import React from 'react';
import { CustomIcon } from '@/components/window/CustomIcon';
import { ChannelBrowser } from '@/apps/arena/channels/ChannelBrowser';
import type { WindowManagerContextType } from '@/hooks/useWindowManager'; // Adjust path if needed
import { useDoubleClick } from '@/hooks/useDoubleClick';

interface DesktopIconsProps {
  addWindow: WindowManagerContextType['addWindow'];
  handleOpenAbout: () => void;
  handleOpenSettingsWindow: () => void;
}

export const DesktopIcons: React.FC<DesktopIconsProps> = ({ 
  addWindow,
  handleOpenAbout,
  handleOpenSettingsWindow
}) => {
  const handleSingleClick = (iconName: string) => (event: React.MouseEvent) => {
    // No custom focus state needed, native focus handles it
  };

  const desktopIcons = [
    {
      name: "Are.na Browser",
      iconType: "arena",
      action: () => {
        console.log("Double-clicked Are.na Browser icon");
        addWindow({
          title: "Are.na Browser",
          content: <ChannelBrowser username="lok" />,
          width: 600,
          height: 500,
          iconType: 'arena',
        });
      },
    },
    {
        name: "About",
        iconType: "about",
        action: handleOpenAbout,
    },
    {
        name: "Config",
        iconType: "config",
        action: handleOpenSettingsWindow, // Shows toast for now
    },
  ];

  return (
    // Container div for positioning - styling will be applied in Desktop.tsx's usage
    <div className="absolute top-4 right-4 flex flex-col items-end space-y-2 z-10"> 
      {desktopIcons.map((icon) => (
          <button
              key={icon.name}
              onClick={useDoubleClick(handleSingleClick(icon.name), icon.action)}
              className="flex flex-col items-center space-y-1 p-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 w-20"
              aria-label={`Open ${icon.name}`}
              tabIndex={0}
          >
              <CustomIcon iconType={icon.iconType} className="w-10 h-10" />
              <span className="text-xs text-center break-words w-full">{icon.name}</span>
          </button>
      ))}
    </div>
  );
};
