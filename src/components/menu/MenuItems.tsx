import React, { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { CustomIcon } from '@/components/window/CustomIcon';

import { isDivider, type MenuEntry, type MenuItemEntry } from './menuModel';

export type { MenuEntry, MenuItemEntry } from './menuModel';

const MARQUEE_SPEED_PX_PER_SECOND = 30;
const MARQUEE_TRAVEL_PORTION = 0.7;
const SUBMENU_CLOSE_DELAY_MS = 320;

interface MenuListProps {
  items: MenuEntry[];
  onClose: () => void;
  /** Class for nested submenus (sizing differs between the system menu and context menus). */
  submenuClassName?: string;
}

/** A nested list that flips to the left when it would leave the viewport. */
const Submenu: React.FC<MenuListProps & { onMouseEnter: () => void }> = ({ items, onClose, submenuClassName, onMouseEnter }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [flip, setFlip] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (rect.right > window.innerWidth && rect.left - rect.width - 10 >= 0) setFlip(true);
  }, []);

  return (
    <div
      ref={ref}
      className={`menu-surface menu-submenu absolute select-none ${submenuClassName ?? ''}`}
      data-flip={flip ? 'left' : undefined}
      role="menu"
      onMouseEnter={onMouseEnter}
    >
      <MenuList items={items} onClose={onClose} submenuClassName={submenuClassName} />
    </div>
  );
};

const MenuItem: React.FC<{ item: MenuItemEntry; onClose: () => void; submenuClassName?: string; reserveIconSlot: boolean }> = ({ item, onClose, submenuClassName, reserveIconSlot }) => {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [overflowDistance, setOverflowDistance] = useState(0);
  const textRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
  const disabled = item.disabled || (!item.action && !hasSubItems);

  // Long labels (Are.na channel titles) scroll on hover instead of clipping.
  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text) return;
    const measure = () => setOverflowDistance(Math.max(0, text.scrollWidth - text.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    return () => observer.disconnect();
  }, [item.label]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const cancelSubMenuClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    cancelSubMenuClose();
    setIsHovering(true);
    if (hasSubItems) setIsSubMenuOpen(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (hasSubItems) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsSubMenuOpen(false);
        closeTimeoutRef.current = null;
      }, SUBMENU_CLOSE_DELAY_MS);
    }
  };

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (disabled) return;
    if (item.action) {
      item.action();
      onClose();
    } else if (hasSubItems) {
      // Touch has no hover: a tap opens the submenu.
      setIsSubMenuOpen((open) => !open);
    }
  };

  const isOverflowing = overflowDistance > 0;
  const marqueeStyle = isOverflowing
    ? ({
        '--marquee-distance': `-${overflowDistance}px`,
        '--marquee-duration': `${overflowDistance / MARQUEE_SPEED_PX_PER_SECOND / MARQUEE_TRAVEL_PORTION}s`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`menu-item-shell relative ${hasSubItems ? 'has-submenu' : ''}`}
    >
      <button
        type="button"
        className="menu-item-button flex items-center select-none"
        disabled={disabled}
        role="menuitem"
        aria-haspopup={hasSubItems ? 'menu' : undefined}
        aria-expanded={hasSubItems ? isSubMenuOpen : undefined}
        aria-checked={item.checked}
      >
        {item.checked !== undefined ? (
          <span className="menu-item-check w-4 h-4 mr-2 flex items-center justify-center" aria-hidden="true">
            {item.checked && <Check className="w-3 h-3" />}
          </span>
        ) : item.icon ? (
          <CustomIcon iconType={item.icon} className="w-4 h-4 mr-2" />
        ) : reserveIconSlot ? (
          <span className="w-4 h-4 mr-2 flex-none" aria-hidden="true" />
        ) : null}
        <span className="menu-item-label min-w-0 flex-1 overflow-hidden whitespace-nowrap">
          <span
            ref={textRef}
            title={item.label}
            className={`inline-block max-w-full ${isHovering && isOverflowing ? 'animate-marquee' : ''}`}
            style={marqueeStyle}
          >
            {item.label}
          </span>
        </span>
        {item.shortcut && <span className="menu-item-shortcut ml-4" aria-hidden="true">{item.shortcut}</span>}
        {hasSubItems && <ChevronRight className="menu-item-chevron w-4 h-4 ml-2" />}
      </button>

      {hasSubItems && isSubMenuOpen && (
        <Submenu
          items={item.subItems!}
          onClose={onClose}
          submenuClassName={submenuClassName}
          onMouseEnter={cancelSubMenuClose}
        />
      )}
    </div>
  );
};

/** Renders entries and dividers; the surrounding surface and placement belong to the caller. */
export const MenuList: React.FC<MenuListProps> = ({ items, onClose, submenuClassName }) => {
  // Labels line up when some entries carry an icon or a check and others do not.
  const reserveIconSlot = items.some((item) => !isDivider(item) && (item.icon || item.checked !== undefined));
  return (
    <>
      {items.map((item, index) => (
        isDivider(item)
          ? <div key={`divider-${index}`} className="menu-divider border-t border-border" role="separator" />
          : <MenuItem key={`${item.label}-${index}`} item={item} onClose={onClose} submenuClassName={submenuClassName} reserveIconSlot={reserveIconSlot} />
      ))}
    </>
  );
};
