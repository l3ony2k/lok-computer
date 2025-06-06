import React, { useState } from 'react';
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

const MenuItem: React.FC<{ item: AppMenuItem; onClose: () => void }> = ({ item, onClose }) => {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);

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
      className="relative"
    >
      <button
        className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors select-none"
        disabled={!item.action && !hasSubItems}
      >
        <CustomIcon iconType={item.iconType} className="w-4 h-4 mr-2" />
        <span className="flex-1 text-neutral-700 dark:text-neutral-100">{item.name}</span>
        {hasSubItems && <ChevronRight className="w-4 h-4" />}
      </button>

      {hasSubItems && isSubMenuOpen && (
        <div className="absolute left-full top-0 bg-retro-taskbar border border-border shadow-md min-w-[200px] select-none">
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
    <div 
      className="fixed inset-0 z-[10000]" 
      onClick={handleOutsideClick}
    >
      <div className="absolute top-[30px] left-2 bg-retro-taskbar border border-border shadow-md min-w-[200px] select-none">
        {items.map((item) => (
          <MenuItem key={item.name} item={item} onClose={onClose} />
        ))}
      </div>
    </div>
  );
}; 