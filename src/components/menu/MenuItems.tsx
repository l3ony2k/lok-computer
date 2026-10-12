import React, { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { CustomIcon } from '@/components/window/CustomIcon';
import { getOverlayBounds } from '@/lib/overlayRoot';

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

/** Space kept between a submenu and the edge of the overlay. */
const SUBMENU_EDGE_MARGIN = 8;
/** Gap between an item and the list that hangs off it. */
const SUBMENU_GAP = 5;

interface SubmenuPlacement {
  left: number;
  top: number;
  flip: boolean;
}

/**
 * A nested list beside its item. It is positioned fixed, against the overlay
 * root rather than its parent: a parent list that scrolls (the Applications
 * list) would otherwise clip it, or scroll sideways to show it. When it would
 * leave the overlay it opens to the left of its item instead; when that side
 * has no room either (a phone, with the menu at the left edge) it sits flush
 * with the far edge, over its parent. In a menu that rises from the taskbar
 * the list's bottom lines up with its item.
 */
const Submenu: React.FC<MenuListProps & { onMouseEnter: () => void }> = ({ items, onClose, submenuClassName, onMouseEnter }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<SubmenuPlacement | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    const item = element?.parentElement;
    if (!element || !item) return;
    const bounds = getOverlayBounds();
    const itemRect = item.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const rises = Boolean(element.closest('[data-placement="bottom"]'));

    let left = itemRect.right + SUBMENU_GAP - bounds.left;
    let flip = false;
    if (left + rect.width > bounds.width - SUBMENU_EDGE_MARGIN) {
      const flipped = itemRect.left - SUBMENU_GAP - rect.width - bounds.left;
      if (flipped >= SUBMENU_EDGE_MARGIN) {
        left = flipped;
        flip = true;
      } else {
        left = Math.max(SUBMENU_EDGE_MARGIN, bounds.width - SUBMENU_EDGE_MARGIN - rect.width);
      }
    }

    const wanted = rises ? itemRect.bottom + 1 - rect.height : itemRect.top - 1;
    const top = Math.max(SUBMENU_EDGE_MARGIN, Math.min(wanted - bounds.top, bounds.height - SUBMENU_EDGE_MARGIN - rect.height));
    setPlacement({ left, top, flip });
  }, []);

  return (
    <div
      ref={ref}
      className={`menu-surface menu-submenu select-none ${submenuClassName ?? ''}`}
      data-flip={placement?.flip ? 'left' : undefined}
      style={placement ? { left: placement.left, top: placement.top } : { left: 0, top: 0, visibility: 'hidden' }}
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
  // A tap opens a submenu and then fires the mouse compatibility events; the
  // mouseleave that follows must not close what the finger just opened.
  const touchRef = useRef(false);

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
    if (hasSubItems && !touchRef.current) {
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
      // Touch has no hover: a tap opens the submenu. Open, not toggle: a tap
      // also fires a synthetic mouseenter first, which would have opened and
      // then closed it, and a click on a hovered parent keeps it open anyway.
      setIsSubMenuOpen(true);
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
      onPointerDown={(event) => { touchRef.current = event.pointerType === 'touch'; }}
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
