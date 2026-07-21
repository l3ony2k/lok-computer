import React, { useEffect, useState } from 'react';
import { CustomIcon } from '@/components/window/CustomIcon';
import type { WindowManagerActionsContextType } from '@/hooks/useWindowManager';
import { useIsMobile } from '@/hooks/use-mobile';
import { APP_LIST, type AppConfig } from '@/config/apps';

interface DesktopIconsProps {
  addWindow: WindowManagerActionsContextType['addWindow'];
  addOrFocusWindow: WindowManagerActionsContextType['addOrFocusWindow'];
  handleOpenAbout: () => void;
  handleOpenSettingsWindow: () => void;
}

interface DesktopIconProps {
  app: AppConfig;
  onOpen: () => void;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  isMobile: boolean;
}

const DesktopIcon: React.FC<DesktopIconProps> = ({ app, onOpen, isSelected, onSelect, onDeselect, isMobile }) => {
  const openAndDeselect = (button: HTMLButtonElement) => {
    onOpen();
    onDeselect();
    button.blur();
  };

  return (
    <button
      onClick={(event) => {
        if (isMobile) {
          openAndDeselect(event.currentTarget);
          return;
        }
        onSelect();
      }}
      onDoubleClick={(event) => {
        if (!isMobile) openAndDeselect(event.currentTarget);
      }}
      onFocus={() => {
        if (!isMobile) onSelect();
      }}
      onBlur={onDeselect}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          openAndDeselect(event.currentTarget);
        } else if (event.key === 'Escape') {
          onDeselect();
          event.currentTarget.blur();
        }
      }}
      className="desktop-icon-button flex min-h-[76px] w-24 flex-col items-center justify-center gap-2 p-1 select-none"
      aria-label={`Open ${app.name}`}
      aria-pressed={isSelected}
      data-selected={isSelected || undefined}
      tabIndex={0}
    >
      <span className="desktop-icon-image flex items-center justify-center">
        <CustomIcon iconType={app.iconType} className="h-8 w-8" />
      </span>
      <span className="desktop-icon-label max-w-full text-center text-xs font-bold leading-tight select-none">
        {app.name}
      </span>
    </button>
  );
};

export const DesktopIcons: React.FC<DesktopIconsProps> = React.memo(({
  addWindow,
  addOrFocusWindow,
  handleOpenAbout,
  handleOpenSettingsWindow
}) => {
  const isMobile = useIsMobile();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  useEffect(() => {
    const dismissSelection = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.desktop-icon-button')) return;

      setSelectedApp(null);
      if (document.activeElement instanceof HTMLElement && document.activeElement.matches('.desktop-icon-button')) {
        document.activeElement.blur();
      }
    };

    document.addEventListener('pointerdown', dismissSelection);
    return () => document.removeEventListener('pointerdown', dismissSelection);
  }, []);

  const getActionForApp = (app: AppConfig) => {
    switch (app.name) {
      case "About":
        return handleOpenAbout;
      case "Config":
        return handleOpenSettingsWindow;
      default:
        return () => {
          if (app.singleInstance) {
            addOrFocusWindow({
              title: app.name,
              content: <app.component {...(app.props || {})} />,
              width: app.defaultWidth,
              height: app.defaultHeight,
              iconType: app.iconType,
              singleInstance: true,
              componentType: app.name,
              props: app.props,
            });
          } else {
            addWindow({
              title: app.name,
              content: <app.component {...(app.props || {})} />,
              width: app.defaultWidth,
              height: app.defaultHeight,
              iconType: app.iconType,
              componentType: app.name,
              props: app.props,
            });
          }
        };
    }
  };

  return (
    <div className="absolute top-3 right-3 bottom-3 flex flex-col flex-wrap-reverse content-start gap-3 z-10 select-none">
      {APP_LIST.map((app) => (
        <DesktopIcon
          key={app.name}
          app={app}
          onOpen={getActionForApp(app)}
          isSelected={selectedApp === app.name}
          onSelect={() => setSelectedApp(app.name)}
          onDeselect={() => setSelectedApp((selected) => selected === app.name ? null : selected)}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
});
