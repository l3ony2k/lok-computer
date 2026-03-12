import React, { useMemo } from "react";
import { useDoubleClick } from "@/hooks/useDoubleClick";
import { CustomIcon } from "@/components/window/CustomIcon";
import linkIcon from "@/assets/icons/link2.png";
import { ContentItem, getItemTitle, getPreviewImageUrl } from "./contentItemHelpers";

const hasVisualPreview = (item: ContentItem): boolean => {
  if (item.kind === "channel" || item.kind === "text") {
    return false;
  }

  return Boolean(getPreviewImageUrl(item.image));
};

export const ContentItemGrid = React.memo(({
  item,
  onSingleClick,
  onDoubleClick,
  itemWidth,
  iconSizeClass,
  getIconType,
  isMobile,
}: {
  item: ContentItem;
  onSingleClick: () => void;
  onDoubleClick: () => void;
  itemWidth: string;
  iconSizeClass: string;
  getIconType: (item: ContentItem) => string;
  isMobile: boolean;
}) => {
  const doubleClickHandler = useDoubleClick(
    () => onSingleClick(),
    () => onDoubleClick()
  );
  const handleClick = isMobile ? onDoubleClick : doubleClickHandler;
  const iconType = useMemo(() => getIconType(item), [item, getIconType]);
  const itemTitle = useMemo(() => getItemTitle(item), [item]);
  const previewImageUrl = useMemo(() => getPreviewImageUrl(item.image), [item.image]);
  const showPreview = hasVisualPreview(item) && previewImageUrl;

  return (
    <div
      className="folder-item focus:ring-2 focus:ring-accent focus:ring-opacity-50"
      onClick={handleClick}
      style={{ width: itemWidth }}
      tabIndex={0}
    >
      <div className={`folder-icon ${iconSizeClass} relative`}>
        {showPreview ? (
          <>
            <img
              src={previewImageUrl}
              alt={itemTitle}
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
            {item.kind === "link" && (
              <img
                src={linkIcon}
                alt="Link"
                className="absolute bottom-0 right-0 w-6 h-6 drop-shadow-md"
                draggable={false}
              />
            )}
          </>
        ) : (
          <CustomIcon iconType={iconType} className="w-full h-full" />
        )}
      </div>
      <div className="folder-name" title={itemTitle}>{itemTitle}</div>
    </div>
  );
});

export const ContentItemListView = React.memo(({
  item,
  onSingleClick,
  onDoubleClick,
  iconSizeClass,
  getIconType,
  isMobile,
}: {
  item: ContentItem;
  onSingleClick: () => void;
  onDoubleClick: () => void;
  iconSizeClass: string;
  getIconType: (item: ContentItem) => string;
  isMobile: boolean;
}) => {
  const doubleClickHandler = useDoubleClick(
    () => onSingleClick(),
    () => onDoubleClick()
  );
  const handleClick = isMobile ? onDoubleClick : doubleClickHandler;
  const iconType = useMemo(() => getIconType(item), [item, getIconType]);
  const itemTitle = useMemo(() => getItemTitle(item), [item]);
  const previewImageUrl = useMemo(() => getPreviewImageUrl(item.image), [item.image]);
  const showPreview = hasVisualPreview(item) && previewImageUrl;

  return (
    <div
      onClick={handleClick}
      className="flex items-center space-x-4 p-2 hover:bg-accent/50 focus:ring-2 focus:ring-accent focus:ring-opacity-50 select-none w-full"
      tabIndex={0}
    >
      {showPreview ? (
        <img
          src={previewImageUrl}
          alt={itemTitle}
          className={`${iconSizeClass} object-cover shrink-0 select-none`}
          loading="lazy"
          draggable={false}
        />
      ) : (
        <CustomIcon iconType={iconType} className={`${iconSizeClass} shrink-0 select-none`} />
      )}
      <span className="truncate text-sm select-none" title={itemTitle}>{itemTitle}</span>
    </div>
  );
});
