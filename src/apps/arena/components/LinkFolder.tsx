import React, { useState, useMemo } from "react";
import { useWindowManager } from "@/hooks/useWindowManager";
import { ArenaWindowLayout } from "./ArenaWindowLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContentItemGrid, ContentItemListView, getGridConfiguration, ContentItem, getItemTitle } from "../utils/contentItems";
import { FixedSizeGrid, FixedSizeList, GridChildComponentProps, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { WebBrowser } from "@/apps/web/WebBrowser";
import { RetroButton } from "@/components/ui/RetroButton";

// Memoized content item components for better performance
const MemoizedContentItemGrid = React.memo(ContentItemGrid);
const MemoizedContentItemListView = React.memo(ContentItemListView);

interface ContentRendererProps {
  contents: ContentItem[];
  gridSize: 'S' | 'M' | 'L';
  onSingleClick: (itemId: number) => void;
  onDoubleClick: (item: ContentItem) => void;
  getIconType: (item: ContentItem) => string;
  isMobile: boolean;
}

interface AutoSizerProps {
  height: number;
  width: number;
}

const GridContent = React.memo(({
  contents,
  gridSize,
  onSingleClick,
  onDoubleClick,
  getIconType,
  isMobile
}: ContentRendererProps) => {
  const { gridIconSizeClass, itemWidth } = getGridConfiguration(gridSize);
  const itemWidthNum = parseInt(itemWidth.replace('px', ''), 10);

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }: AutoSizerProps) => {
          // Add gap/padding to column width calculations
          const gap = 8; // 4px padding on each side
          const columnWidth = itemWidthNum + gap;
          const columnCount = Math.max(1, Math.floor(width / columnWidth));
          const rowCount = Math.ceil(contents.length / columnCount);
          const itemHeight = columnWidth + 32;

          return (
            <FixedSizeGrid
              className="folder-grid"
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={height}
              rowCount={rowCount}
              rowHeight={itemHeight}
              width={width}
              style={{ overflow: 'auto' }}
            >
              {({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
                const itemIndex = rowIndex * columnCount + columnIndex;
                const item = contents[itemIndex];

                if (!item) return null;

                return (
                  <div style={style} className="p-1">
                    <MemoizedContentItemGrid
                      key={item.id}
                      item={item}
                      onSingleClick={() => onSingleClick(item.id)}
                      onDoubleClick={() => onDoubleClick(item)}
                      itemWidth={itemWidth}
                      iconSizeClass={gridIconSizeClass}
                      getIconType={getIconType}
                      isMobile={isMobile}
                    />
                  </div>
                );
              }}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>
    </div>
  );
});

const ListContent = React.memo(({
  contents,
  gridSize,
  onSingleClick,
  onDoubleClick,
  getIconType,
  isMobile
}: ContentRendererProps) => {
  const { listIconSizeClass } = getGridConfiguration(gridSize);

  // Dynamic item size to fix list view overlapping
  const itemSizeMap = {
    S: 40, // icon (h-6, 24px) + vertical padding (p-2, 16px)
    M: 48, // icon (h-8, 32px) + vertical padding (p-2, 16px)
    L: 56, // icon (h-10, 40px) + vertical padding (p-2, 16px)
  };
  const itemSize = (itemSizeMap[gridSize] || 40) + 4; // Add 4px for gap

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }: AutoSizerProps) => (
          <FixedSizeList
            className="space-y-1 p-1"
            height={height}
            itemCount={contents.length}
            itemSize={itemSize}
            width={width}
            style={{ overflow: 'auto' }}
          >
            {({ index, style }: ListChildComponentProps) => (
              <div style={{ ...style, width: width - 8, left: 4 }}>
                <MemoizedContentItemListView
                  key={contents[index].id}
                  item={contents[index]}
                  onSingleClick={() => onSingleClick(contents[index].id)}
                  onDoubleClick={() => onDoubleClick(contents[index])}
                  iconSizeClass={listIconSizeClass}
                  getIconType={getIconType}
                  isMobile={isMobile}
                />
              </div>
            )}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
});

export const LinkFolder: React.FC<{ items: ContentItem[], title: string }> = ({ items, title }) => {
  const [isListView, setIsListView] = useState(true);
  const { addWindow } = useWindowManager();
  const [gridSize, setGridSize] = useState<'S' | 'M' | 'L'>('S');
  const isMobile = useIsMobile();

  const getIconType = (item: ContentItem): string => {
    if (item.base_class === "Channel") return "other-channel";
    if (item.class === "Link") return "link";
    return "text";
  };

  const handleItemSingleClick = (itemId: number) => {
    // No action on single click
  };

  const handleItemDoubleClick = (item: ContentItem) => {
    if (item.class === "Link" && item.source?.url) {
      addWindow({
        title: getItemTitle(item),
        content: <WebBrowser initialUrl={item.source.url} />,
        width: 800,
        height: 600,
        iconType: "link",
      });
    }
  };

  const renderGridView = () => (
    <GridContent
      contents={items}
      gridSize={gridSize}
      onSingleClick={handleItemSingleClick}
      onDoubleClick={handleItemDoubleClick}
      getIconType={getIconType}
      isMobile={isMobile}
    />
  );

  const renderListView = () => (
    <ListContent
      contents={items}
      gridSize={gridSize}
      onSingleClick={handleItemSingleClick}
      onDoubleClick={handleItemDoubleClick}
      getIconType={getIconType}
      isMobile={isMobile}
    />
  );

  return (
    <ArenaWindowLayout
      toolbar={
        <div className="flex items-center justify-between space-x-2 p-1 border-b border-border">
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" active={gridSize === 'S'} onClick={() => setGridSize('S')} title="Small Icons">S</RetroButton>
            <RetroButton size="sm" active={gridSize === 'M'} onClick={() => setGridSize('M')} title="Medium Icons">M</RetroButton>
            <RetroButton size="sm" active={gridSize === 'L'} onClick={() => setGridSize('L')} title="Large Icons">L</RetroButton>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs opacity-50">Total: {items.length} items</span>
          </div>
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" active={!isListView} onClick={() => setIsListView(false)}>Grid</RetroButton>
            <RetroButton size="sm" active={isListView} onClick={() => setIsListView(true)}>List</RetroButton>
          </div>
        </div>
      }
    >
      {isListView ? renderListView() : renderGridView()}
    </ArenaWindowLayout>
  );
};