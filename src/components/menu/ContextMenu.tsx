import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getOverlayBounds, getOverlayRoot, toOverlayPoint } from '@/lib/overlayRoot';
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

    const handleOutsideClick = useCallback((event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    }, [onClose]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleOutsideClick, handleKeyDown]);

    const { x, y } = position;
    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (!isOpen || !menu) return;
        const rect = menu.getBoundingClientRect();
        const bounds = getOverlayBounds();
        const point = toOverlayPoint({ x, y }, bounds);
        menu.style.left = `${Math.max(0, Math.min(point.x, bounds.width - rect.width))}px`;
        menu.style.top = `${Math.max(0, Math.min(point.y, bounds.height - rect.height))}px`;
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
