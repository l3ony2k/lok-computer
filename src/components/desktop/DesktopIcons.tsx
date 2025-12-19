import React from 'react';
import { CustomIcon } from '@/components/window/CustomIcon';
import type { WindowManagerContextType } from '@/hooks/useWindowManager';
import { useDoubleClick } from '@/hooks/useDoubleClick';
import { useIsMobile } from '@/hooks/use-mobile';
import { APP_LIST } from '@/config/apps';

interface DesktopIconsProps {
  addWindow: WindowManagerContextType['addWindow'];
  addOrFocusWindow: WindowManagerContextType['addOrFocusWindow'];
  handleOpenAbout: () => void;
  handleOpenSettingsWindow: () => void;
}

export const DesktopIcons: React.FC<DesktopIconsProps> = ({
  addWindow,
  addOrFocusWindow,
  handleOpenAbout,
  handleOpenSettingsWindow
}) => {
  const isMobile = useIsMobile();

  const handleSingleClickBase = () => () => {
    // No custom focus state needed, native focus handles it
  };

  const getActionForApp = (app: typeof APP_LIST[0]) => {
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
    <div className="absolute top-4 right-4 bottom-4 flex flex-col flex-wrap-reverse content-start gap-2 z-10 select-none">
      {APP_LIST.map((app) => {
        const singleClickHandlerForHook = handleSingleClickBase();
        const action = getActionForApp(app);
        const doubleClickHandler = useDoubleClick(singleClickHandlerForHook, action);
        const clickAction = isMobile ? action : doubleClickHandler;

        return (
          <button
            key={app.name}
            onClick={clickAction}
            className="flex flex-col items-center space-y-1 p-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 w-20 select-none"
            aria-label={`Open ${app.name}`}
            tabIndex={0}
          >
            <CustomIcon iconType={app.iconType} className="w-10 h-10" />
            <span
              className="text-xs text-center break-words w-full text-neutral-200 font-bold select-none"
              style={{ textShadow: "0px 0px 3px rgba(0, 0, 0, 0.8)" }}
            >
              {app.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
