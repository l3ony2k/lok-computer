import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '@/hooks/useDismiss';
import { getOverlayBounds, getOverlayRoot, toOverlayPoint } from '@/lib/overlayRoot';
import { clampToOverlay } from '@/lib/overlayPlacement';
import { MenuList, type MenuEntry } from './MenuItems';

export type ContextMenuItem = MenuEntry;

interface ContextMenuProps {
    items: MenuEntry[];
    isOpen: boolean;
    /** Viewport coordinates of the menu's top-left corner. */
    position: { x: number; y: number };
    onClose: () => void;
}

/**
 * A menu at a point: window menus, the desktop and icon context menus, and
 * taskbar menus. Closes on an outside press or Escape, and stays inside the
 * viewport once its size is known.
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({ items, isOpen, position, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useDismiss(isOpen, onClose, { inside: [menuRef], pressEvent: 'mousedown' });

    const { x, y } = position;
    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (!isOpen || !menu) return;
        const rect = menu.getBoundingClientRect();
        const bounds = getOverlayBounds();
        const point = toOverlayPoint({ x, y }, bounds);
        const place = clampToOverlay(point, rect, bounds);
        menu.style.left = `${place.x}px`;
        menu.style.top = `${place.y}px`;
    }, [isOpen, x, y]);

    if (!isOpen) return null;

    // Portaled: a menu opened from inside a window must not be clipped by it.
    // Placed by the layout effect above (the pointer position is viewport-relative; the overlay root may not be).
    return createPortal(
        <div
            ref={menuRef}
            className="menu-surface context-menu fixed min-w-[160px] select-none z-[10000]"
            role="menu"
            style={{ left: 0, top: 0 }}
            onContextMenu={(event) => event.preventDefault()}
        >
            <MenuList items={items} onClose={onClose} submenuClassName="context-submenu" />
        </div>,
        getOverlayRoot(),
    );
};
