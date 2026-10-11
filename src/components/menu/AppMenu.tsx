import React from 'react';
import { createPortal } from 'react-dom';
import { MenuList, type MenuEntry } from './MenuItems';

/** `top` drops from the top bar; `bottom` rises from the taskbar as a start menu. */
export type MenuPlacement = 'top' | 'bottom';

interface AppMenuProps {
  items: MenuEntry[];
  isOpen: boolean;
  placement?: MenuPlacement;
  onClose: () => void;
}

/** The system menu panel: the lok.computer menu in the top bar, the start menu in classic layouts. */
export const AppMenu: React.FC<AppMenuProps> = ({ items, isOpen, placement = 'top', onClose }) => {
  if (!isOpen) return null;

  const handleOutsideClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  // Portaled so the taskbar's stacking context cannot trap the menu below windows.
  return createPortal(
    <div
      className="fixed inset-0 z-[10000]"
      onClick={handleOutsideClick}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="menu-surface app-menu-panel min-w-[200px] select-none" data-placement={placement} role="menu">
        {placement === 'bottom' && (
          <div className="app-menu-banner" aria-hidden="true">
            <span>lok<b>.computer</b></span>
          </div>
        )}
        <div className="app-menu-items">
          <MenuList items={items} onClose={onClose} submenuClassName="app-submenu" />
        </div>
      </div>
    </div>,
    document.body,
  );
};
