import React from 'react';
import { CustomIcon } from '@/components/window/CustomIcon';

interface AppMenuItem {
  name: string;
  iconType: string;
  action: () => void;
}

interface AppMenuProps {
  items: AppMenuItem[];
  isOpen: boolean;
  onClose: () => void;
}

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
      <div className="absolute top-[30px] left-2 bg-retro-taskbar border border-border shadow-md min-w-[200px]">
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() => {
              item.action();
              onClose();
            }}
            className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors"
          >
            <CustomIcon iconType={item.iconType} className="w-4 h-4 mr-2" />
            <span className="text-neutral-700 dark:text-neutral-100">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}; 