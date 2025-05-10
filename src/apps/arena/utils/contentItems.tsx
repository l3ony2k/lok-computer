import React from "react";
import { useDoubleClick } from "@/hooks/useDoubleClick";
import { ArenaBlock, ArenaChannel } from "@/types/arena";
import { CustomIcon } from "@/components/window/CustomIcon";

export interface ContentItem extends Partial<ArenaBlock>, Partial<ArenaChannel> {
  id: number;
  base_class: string;
  class?: string;
  title?: string;
}

// Helper functions for content items
export const getItemTitle = (item: ContentItem): string => {
  return item.title || (item as ArenaBlock).generated_title || "Untitled";
};

// Component for grid view content item (used in both channel browser and explorer)
export const ContentItemGrid = React.memo(({ 
  item, 
  onSingleClick, 
  onDoubleClick, 
  itemWidth, 
  iconSizeClass,
  renderThumbnail,
  getIconType,
  isMobile
}: { 
  item: ContentItem; 
  onSingleClick: () => void; 
  onDoubleClick: () => void; 
  itemWidth: string; 
  iconSizeClass: string;
  renderThumbnail?: (image: any) => string;
  getIconType: (item: ContentItem) => string;
  isMobile: boolean;
}) => {
  const doubleClickHandler = useDoubleClick(
    (event: React.MouseEvent | React.TouchEvent) => onSingleClick(),
    (event: React.MouseEvent | React.TouchEvent) => onDoubleClick()
  );
  const handleClick = isMobile ? onDoubleClick : doubleClickHandler;

  const hasImage = (item as ArenaBlock).class === "Image" && (item as ArenaBlock).image?.thumb;

  return (
    <div
      className="folder-item focus:ring-2 focus:ring-accent focus:ring-opacity-50"
      onClick={handleClick}
      style={{ width: itemWidth }}
      tabIndex={0}
    >
      <div className={`folder-icon ${iconSizeClass}`}> 
        {hasImage && renderThumbnail ? (
          <img 
            src={renderThumbnail((item as ArenaBlock).image?.thumb)} 
            alt={getItemTitle(item)}
            className={`w-full h-full object-cover`}
            loading="lazy"
          />
        ) : (
          <CustomIcon iconType={getIconType(item)} className={`w-full h-full`} />
        )}
      </div>
      <div className="folder-name">{getItemTitle(item)}</div>
    </div>
  );
});

// Component for list view content item (used in both channel browser and explorer)
export const ContentItemListView = React.memo(({ 
  item, 
  onSingleClick, 
  onDoubleClick, 
  iconSizeClass,
  renderThumbnail,
  getIconType,
  isMobile
}: { 
  item: ContentItem; 
  onSingleClick: () => void; 
  onDoubleClick: () => void; 
  iconSizeClass: string;
  renderThumbnail?: (image: any) => string;
  getIconType: (item: ContentItem) => string;
  isMobile: boolean;
}) => {
  const doubleClickHandler = useDoubleClick(
    (event: React.MouseEvent | React.TouchEvent) => onSingleClick(),
    (event: React.MouseEvent | React.TouchEvent) => onDoubleClick()
  );
  const handleClick = isMobile ? onDoubleClick : doubleClickHandler;

  const hasImage = (item as ArenaBlock).class === "Image" && (item as ArenaBlock).image?.thumb;

  return (
    <div
      onClick={handleClick}
      className="flex items-center space-x-4 p-2 hover:bg-accent/50 cursor-pointer focus:ring-2 focus:ring-accent focus:ring-opacity-50"
      tabIndex={0}
    >
      {hasImage && renderThumbnail ? (
        <img 
          src={renderThumbnail((item as ArenaBlock).image?.thumb)} 
          alt={getItemTitle(item)}
          className={`${iconSizeClass} object-cover shrink-0`}
          loading="lazy"
        />
      ) : (
        <CustomIcon iconType={getIconType(item)} className={`${iconSizeClass} shrink-0`} />
      )}
      <span className="truncate text-sm">{getItemTitle(item)}</span>
    </div>
  );
});

// Shared utility to determine grid view configuration
export const getGridConfiguration = (gridSize: 'S' | 'M' | 'L') => {
  // Icon size classes based on size
  const iconSizeClasses = { 
    S: { grid: 'w-12 h-12', list: 'w-6 h-6' }, 
    M: { grid: 'w-20 h-20', list: 'w-8 h-8' }, 
    L: { grid: 'w-28 h-28', list: 'w-10 h-10' } 
  };
  
  // Fixed width for each grid item based on size
  const itemWidths = {
    S: '64px',
    M: '109px',
    L: '136px',
  };

  return {
    gridIconSizeClass: iconSizeClasses[gridSize]?.grid || 'w-12 h-12',
    listIconSizeClass: iconSizeClasses[gridSize]?.list || 'w-6 h-6',
    itemWidth: itemWidths[gridSize],
    gridTemplateStyle: { 
      gridTemplateColumns: `repeat(auto-fill, ${itemWidths[gridSize]})`,
      justifyContent: 'start'
    }
  };
}; 