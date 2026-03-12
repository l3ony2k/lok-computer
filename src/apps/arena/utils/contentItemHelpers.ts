import { ArenaImage, ArenaItem } from "@/types/arena";

export type ContentItem = ArenaItem;

export const getItemTitle = (item: ContentItem): string => {
  return item.title || "Untitled";
};

export const getPreviewImageUrl = (image?: ArenaImage | null): string | null => {
  if (!image) {
    return null;
  }

  return (
    image.square?.src ??
    image.small?.src ??
    image.medium?.src ??
    image.large?.src ??
    image.original.src
  );
};

export const getGridConfiguration = (gridSize: "S" | "M" | "L") => {
  const iconSizeClasses = {
    S: { grid: "w-12 h-12", list: "w-6 h-6" },
    M: { grid: "w-20 h-20", list: "w-8 h-8" },
    L: { grid: "w-28 h-28", list: "w-10 h-10" },
  };

  const itemWidths = {
    S: "64px",
    M: "109px",
    L: "136px",
  };

  return {
    gridIconSizeClass: iconSizeClasses[gridSize]?.grid || "w-12 h-12",
    listIconSizeClass: iconSizeClasses[gridSize]?.list || "w-6 h-6",
    itemWidth: itemWidths[gridSize],
    gridTemplateStyle: {
      gridTemplateColumns: `repeat(auto-fill, ${itemWidths[gridSize]})`,
      justifyContent: "start",
    },
  };
};
