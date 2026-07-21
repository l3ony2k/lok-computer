import React, { CSSProperties, useEffect, useState, useLayoutEffect, useRef } from 'react';
import { CustomIcon } from '@/components/window/CustomIcon';
import { ChevronRight } from 'lucide-react';

export interface AppMenuItem {
  name: string;
  iconType: string;
  action?: () => void;
  subItems?: AppMenuItem[];
}

interface AppMenuProps {
  items: AppMenuItem[];
  isOpen: boolean;
  onClose: () => void;
}

const MARQUEE_SPEED_PX_PER_SECOND = 30;
const MARQUEE_TRAVEL_PORTION = 0.7;

const MenuItem: React.FC<{ item: AppMenuItem; onClose: () => void }> = ({ item, onClose }) => {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text) return;

    const measureOverflow = () => {
      setOverflowDistance(Math.max(0, text.scrollWidth - text.clientWidth));
    };

    measureOverflow();
    const resizeObserver = new ResizeObserver(measureOverflow);
    resizeObserver.observe(text);
    return () => resizeObserver.disconnect();
  }, [item.name]);

  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isOverflowing = overflowDistance > 0;
  const marqueeDuration = overflowDistance / MARQUEE_SPEED_PX_PER_SECOND / MARQUEE_TRAVEL_PORTION;
  const marqueeStyle = isOverflowing
    ? ({
        '--marquee-distance': `-${overflowDistance}px`,
        '--marquee-duration': `${marqueeDuration}s`,
      } as CSSProperties)
    : undefined;

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
    if (hasSubItems) {
      setIsSubMenuOpen(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (hasSubItems) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsSubMenuOpen(false);
        closeTimeoutRef.current = null;
      }, 320);
    }
  };

  const handleClick = () => {
    if (item.action) {
      item.action();
      onClose();
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`menu-item-shell relative ${hasSubItems ? 'has-submenu' : ''}`}
    >
      <button
        className="menu-item-button flex items-center select-none"
        disabled={!item.action && !hasSubItems}
      >
        <CustomIcon iconType={item.iconType} className="w-4 h-4 mr-2" />
        <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
          <span
            ref={textRef}
            title={item.name}
            className={`inline-block max-w-full ${isHovering && isOverflowing ? 'animate-marquee' : ''}`}
            style={marqueeStyle}
          >
            {item.name}
          </span>
        </div>
        {hasSubItems && <ChevronRight className="w-4 h-4" />}
      </button>

      {hasSubItems && isSubMenuOpen && (
        <div
          className="menu-surface app-submenu absolute left-[calc(100%+5px)] top-[-1px] select-none"
          onMouseEnter={cancelSubMenuClose}
        >
          {item.subItems?.map((subItem) => (
            <MenuItem key={subItem.name} item={subItem} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
};

export const AppMenu: React.FC<AppMenuProps> = ({
  items,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  // Handle clicks outside the menu to close it
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes marquee {
            0%, 15% { transform: translateX(0); }
            85%, 100% { transform: translateX(var(--marquee-distance)); }
          }
          .animate-marquee {
            animation: marquee var(--marquee-duration) linear infinite alternate;
          }
        `}
      </style>
      <div
        className="fixed inset-0 z-[10000]"
        onClick={handleOutsideClick}
      >
        <div className="menu-surface absolute top-[43px] left-[10px] min-w-[200px] select-none" role="menu">
          {items.map((item) => (
            <MenuItem key={item.name} item={item} onClose={onClose} />
          ))}
        </div>
      </div>
    </>
  );
};
