import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { CustomIcon } from '@/components/window/CustomIcon';
import { ChevronRight } from 'lucide-react';

/**
 * Context menu item definition.
 * Supports regular items, dividers, and sub-menus.
 */
export interface ContextMenuItem {
    type: 'item' | 'divider';
    label?: string;
    icon?: string;  // iconType for CustomIcon
    action?: () => void;
    disabled?: boolean;
    subItems?: ContextMenuItem[];
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
}

interface MenuItemProps {
    item: ContextMenuItem;
    onClose: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, onClose }) => {
    const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
    const itemRef = useRef<HTMLDivElement>(null);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasSubItems = item.subItems && item.subItems.length > 0;

    useEffect(() => () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    }, []);

    if (item.type === 'divider') {
        return <div className="border-t border-border" />;
    }

    const cancelSubMenuClose = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const handleMouseEnter = () => {
        cancelSubMenuClose();
        if (hasSubItems) {
            setIsSubMenuOpen(true);
        }
    };

    const handleMouseLeave = () => {
        if (hasSubItems) {
            closeTimeoutRef.current = setTimeout(() => {
                setIsSubMenuOpen(false);
                closeTimeoutRef.current = null;
            }, 320);
        }
    };

    const handleClick = () => {
        if (item.disabled) return;
        if (item.action) {
            item.action();
            onClose();
        }
    };

    return (
        <div
            ref={itemRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className={`menu-item-shell relative ${hasSubItems ? 'has-submenu' : ''}`}
        >
            <button
                className="menu-item-button flex items-center select-none"
                disabled={item.disabled}
            >
                {item.icon && (
                    <CustomIcon iconType={item.icon} className="w-4 h-4 mr-2" />
                )}
                <span className="flex-1">{item.label}</span>
                {hasSubItems && <ChevronRight className="w-4 h-4 ml-2" />}
            </button>

            {hasSubItems && isSubMenuOpen && (
                <div
                    className="menu-surface context-submenu absolute left-[calc(100%+5px)] top-[-1px] min-w-[160px] select-none"
                    onMouseEnter={cancelSubMenuClose}
                >
                    {item.subItems?.map((subItem, index) => (
                        <MenuItem key={subItem.label || `divider-${index}`} item={subItem} onClose={onClose} />
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Reusable context menu component.
 * Displays a menu at the specified position with support for:
 * - Menu items with icons and actions
 * - Dividers to separate sections
 * - Sub-menus that open on hover
 * - Click-outside and Escape key to close
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
    items,
    isOpen,
    position,
    onClose
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close
    const handleOutsideClick = useCallback((e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            onClose();
        }
    }, [onClose]);

    // Handle Escape key to close
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('mousedown', handleOutsideClick);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, handleOutsideClick, handleKeyDown]);

    // Keep the menu inside the viewport once its size is known.
    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (!isOpen || !menu) return;
        const rect = menu.getBoundingClientRect();
        const left = Math.max(0, Math.min(position.x, window.innerWidth - rect.width));
        const top = Math.max(0, Math.min(position.y, window.innerHeight - rect.height));
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }, [isOpen, position.x, position.y]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="menu-surface fixed min-w-[160px] select-none z-[10000]"
            role="menu"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            {items.map((item, index) => (
                <MenuItem
                    key={item.type === 'divider' ? `divider-${index}` : item.label}
                    item={item}
                    onClose={onClose}
                />
            ))}
        </div>
    );
};
