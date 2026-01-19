import React, { useState, useEffect, useRef, useCallback } from 'react';
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

    if (item.type === 'divider') {
        return <div className="border-t border-border my-1" />;
    }

    const hasSubItems = item.subItems && item.subItems.length > 0;

    const handleMouseEnter = () => {
        if (hasSubItems) {
            setIsSubMenuOpen(true);
        }
    };

    const handleMouseLeave = () => {
        if (hasSubItems) {
            setIsSubMenuOpen(false);
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
            className="relative"
        >
            <button
                className={`flex items-center w-full px-3 py-1.5 text-sm text-left transition-colors select-none
          ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent cursor-default'}`}
                disabled={item.disabled}
            >
                {item.icon && (
                    <CustomIcon iconType={item.icon} className="w-4 h-4 mr-2" />
                )}
                <span className="flex-1">{item.label}</span>
                {hasSubItems && <ChevronRight className="w-4 h-4 ml-2" />}
            </button>

            {hasSubItems && isSubMenuOpen && (
                <div className="absolute left-full top-0 bg-retro-taskbar border border-border shadow-md min-w-[160px] select-none">
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

    if (!isOpen) return null;

    // Adjust position to prevent menu from going off-screen
    const adjustedPosition = { ...position };

    return (
        <div
            ref={menuRef}
            className="fixed bg-retro-taskbar border border-border shadow-md min-w-[160px] select-none z-[10000]"
            style={{
                left: adjustedPosition.x,
                top: adjustedPosition.y,
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
