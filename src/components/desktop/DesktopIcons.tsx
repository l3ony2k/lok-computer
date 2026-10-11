import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CustomIcon } from '@/components/window/CustomIcon';
import { ContextMenu } from '@/components/menu/ContextMenu';
import type { MenuEntry } from '@/components/menu/MenuItems';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePersistedState } from '@/hooks/useStorage';
import { DEFAULT_DESKTOP_SETTINGS, useUserSettings } from '@/hooks/useUserSettings';
import { APP_LIST, type AppConfig } from '@/config/apps';
import { generateShareUrl } from '@/config/routes';
import {
  DESKTOP_ICON_ORDER_KEY,
  DESKTOP_ICON_ORDER_RESET_EVENT,
  moveIcon,
  normalizeIconOrder,
} from '@/lib/desktopIconOrder';
import {
  DESKTOP_ICON_POSITIONS_KEY,
  ICON_CELLS,
  clampIconPosition,
  layoutIconSlots,
  normalizeIconPositions,
  type IconArea,
  type IconCell,
  type IconPoint,
} from '@/lib/desktopIconLayout';

/** Mouse: a drag starts after this much movement. */
const DRAG_THRESHOLD_PX = 4;
/** Touch and pen: hold this long first, so a tap or a flick never rearranges. */
const TOUCH_HOLD_MS = 300;
const TOUCH_SLOP_PX = 8;

const CATALOG_ORDER = APP_LIST.map((app) => app.componentType);
const APPS_BY_TYPE = new Map(APP_LIST.map((app) => [app.componentType, app]));

interface DesktopIconProps {
  app: AppConfig;
  onOpen: () => void;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  isMobile: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  /** Large icons upscale past the art's 32 px, so they render pixelated. */
  pixelated: boolean;
  /** Free placement: where the icon sits; null in the grid flow. */
  point: IconPoint | null;
  /** A click that ends a drag must not open the app. */
  consumeDragClick: () => boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const DesktopIcon: React.FC<DesktopIconProps> = ({
  app, onOpen, isSelected, onSelect, onDeselect, isMobile, isDragging, isDropTarget, pixelated, point, consumeDragClick, onPointerDown, onContextMenu,
}) => {
  const openAndDeselect = (button: HTMLButtonElement) => {
    onOpen();
    onDeselect();
    button.blur();
  };

  return (
    <button
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      onClick={(event) => {
        if (consumeDragClick()) return;
        if (isMobile) {
          openAndDeselect(event.currentTarget);
          return;
        }
        onSelect();
      }}
      onDoubleClick={(event) => {
        if (consumeDragClick()) return;
        if (!isMobile) openAndDeselect(event.currentTarget);
      }}
      onFocus={() => {
        if (!isMobile) onSelect();
      }}
      onBlur={onDeselect}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          openAndDeselect(event.currentTarget);
        } else if (event.key === 'Escape') {
          onDeselect();
          event.currentTarget.blur();
        }
      }}
      className="desktop-icon-button flex flex-col items-center justify-center gap-2 p-1 select-none"
      style={point ? { position: 'absolute', left: point.x, top: point.y } : undefined}
      aria-label={`Open ${app.name}`}
      aria-pressed={isSelected}
      data-selected={isSelected || undefined}
      data-dragging={isDragging || undefined}
      data-drop-target={isDropTarget || undefined}
      data-app={app.componentType}
      tabIndex={0}
    >
      <span className="desktop-icon-image flex items-center justify-center">
        <CustomIcon iconType={app.iconType} className="desktop-icon-glyph" pixelated={pixelated} />
      </span>
      <span className="desktop-icon-label max-w-full text-center text-xs font-bold leading-tight select-none">
        {app.name}
      </span>
    </button>
  );
};

interface DragState {
  type: string;
  /** Pointer offset inside the icon, so the ghost does not jump under the finger. */
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  target: string | null;
}

interface PendingDrag {
  type: string;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  /** Touch/pen only: the hold timer that arms the drag. */
  holdTimer: number | null;
  armed: boolean;
}

const iconTypeAt = (x: number, y: number): string | null => {
  for (const element of document.elementsFromPoint(x, y)) {
    const button = element.closest<HTMLElement>('.desktop-icon-button');
    if (button?.dataset.app) return button.dataset.app;
  }
  return null;
};

/**
 * The desktop's application icons. Config › Desktop (and the desktop's own
 * right-click menu) set their size, whether they show, and whether they snap
 * to the grid flow or sit wherever they were dropped.
 */
export const DesktopIcons: React.FC = React.memo(() => {
  const isMobile = useIsMobile();
  const openApplication = useApplicationLauncher();
  const { settings } = useUserSettings();
  const desktop = { ...DEFAULT_DESKTOP_SETTINGS, ...settings.desktop };
  const cell: IconCell = ICON_CELLS[desktop.iconSize];
  const free = !desktop.snapToGrid;

  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [order, setOrder] = usePersistedState<string[]>({
    key: DESKTOP_ICON_ORDER_KEY,
    defaultValue: CATALOG_ORDER,
    normalize: (stored) => normalizeIconOrder(stored, CATALOG_ORDER),
  });
  const [positions, setPositions] = usePersistedState<Record<string, IconPoint>>({
    key: DESKTOP_ICON_POSITIONS_KEY,
    defaultValue: {},
    normalize: (stored) => normalizeIconPositions(stored, CATALOG_ORDER),
  });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [menu, setMenu] = useState<{ type: string; x: number; y: number } | null>(null);
  const [area, setArea] = useState<IconArea>({ width: 0, height: 0 });
  const layerRef = useRef<HTMLDivElement>(null);
  const pending = useRef<PendingDrag | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const suppressClick = useRef(false);
  // The drop handler reads these through refs so its listeners stay bound once.
  const freeRef = useRef(free);
  freeRef.current = free;
  const cellRef = useRef(cell);
  cellRef.current = cell;

  const apps = useMemo(
    () => normalizeIconOrder(order, CATALOG_ORDER).map((type) => APPS_BY_TYPE.get(type)!),
    [order],
  );

  // Free placement needs the layer's size for default slots and clamping.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const measure = () => setArea({ width: layer.clientWidth, height: layer.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layer);
    return () => observer.disconnect();
  }, [desktop.showIcons]);

  const slots = useMemo(() => layoutIconSlots(apps.length, area, cell), [apps.length, area, cell]);
  const points = useMemo(() => (
    free
      ? apps.map((app, index) => clampIconPosition(positions[app.componentType] ?? slots[index], area, cell))
      : null
  ), [apps, area, cell, free, positions, slots]);

  useEffect(() => {
    const dismissSelection = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.desktop-icon-button')) return;

      setSelectedApp(null);
      if (document.activeElement instanceof HTMLElement && document.activeElement.matches('.desktop-icon-button')) {
        document.activeElement.blur();
      }
    };

    document.addEventListener('pointerdown', dismissSelection);
    return () => document.removeEventListener('pointerdown', dismissSelection);
  }, []);

  // "Tidy up": back to the catalog order, in the grid flow's slots.
  useEffect(() => {
    const reset = () => {
      setOrder(CATALOG_ORDER);
      setPositions({});
    };
    window.addEventListener(DESKTOP_ICON_ORDER_RESET_EVENT, reset);
    return () => window.removeEventListener(DESKTOP_ICON_ORDER_RESET_EVENT, reset);
  }, [setOrder, setPositions]);

  const clearPending = () => {
    if (pending.current?.holdTimer) window.clearTimeout(pending.current.holdTimer);
    pending.current = null;
  };

  const beginDrag = useCallback((x: number, y: number) => {
    const start = pending.current;
    if (!start) return;
    clearPending();
    suppressClick.current = true;
    setSelectedApp(null);
    setDrag({
      type: start.type,
      offsetX: start.offsetX,
      offsetY: start.offsetY,
      x,
      y,
      width: start.width,
      height: start.height,
      target: null,
    });
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const start = pending.current;
      if (start && start.pointerId === event.pointerId && !dragRef.current) {
        const distance = Math.hypot(event.clientX - start.startX, event.clientY - start.startY);
        if (start.armed) {
          if (distance >= DRAG_THRESHOLD_PX) beginDrag(event.clientX, event.clientY);
        } else if (distance > TOUCH_SLOP_PX) {
          // Moved before the hold completed: the finger is doing something else.
          clearPending();
        }
        return;
      }
      const current = dragRef.current;
      if (!current) return;
      event.preventDefault();
      // In the grid flow a drop lands on another icon's slot; free placement drops anywhere.
      const target = freeRef.current ? null : iconTypeAt(event.clientX, event.clientY);
      setDrag({ ...current, x: event.clientX, y: event.clientY, target: target === current.type ? null : target });
    };

    const onUp = (event: PointerEvent) => {
      clearPending();
      const current = dragRef.current;
      if (!current) return;
      if (freeRef.current) {
        const layer = layerRef.current;
        if (layer) {
          const rect = layer.getBoundingClientRect();
          const point = clampIconPosition(
            { x: event.clientX - current.offsetX - rect.left, y: event.clientY - current.offsetY - rect.top },
            { width: layer.clientWidth, height: layer.clientHeight },
            cellRef.current,
          );
          setPositions((previous) => ({ ...previous, [current.type]: point }));
        }
      } else {
        const target = iconTypeAt(event.clientX, event.clientY);
        if (target && target !== current.type) {
          setOrder((previous) => moveIcon(normalizeIconOrder(previous, CATALOG_ORDER), current.type, target));
        }
      }
      setDrag(null);
    };

    const onCancel = () => {
      clearPending();
      if (dragRef.current) setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
    };
  }, [beginDrag, setOrder, setPositions]);

  const handlePointerDown = (type: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || drag) return;
    clearPending();
    const rect = event.currentTarget.getBoundingClientRect();
    const touchLike = event.pointerType !== 'mouse';
    const start: PendingDrag = {
      type,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      holdTimer: null,
      armed: !touchLike,
    };
    if (touchLike) {
      start.holdTimer = window.setTimeout(() => {
        if (pending.current !== start) return;
        start.armed = true;
        // A held finger has already moved a little; start from where it is.
        beginDrag(start.startX, start.startY);
      }, TOUCH_HOLD_MS);
    }
    pending.current = start;
  };

  // Right-click opens the icon menu. A touch long-press fires contextmenu too,
  // but that gesture already rearranges icons, so it only suppresses the browser's menu.
  const handleContextMenu = (type: string) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (dragRef.current || pending.current?.pointerType === 'touch') return;
    clearPending();
    setSelectedApp(type);
    setMenu({ type, x: event.clientX, y: event.clientY });
  };

  const consumeDragClick = () => {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied to clipboard');
    } catch (error) {
      console.warn('[Desktop] Could not copy the link:', error);
      toast('Could not copy the link');
    }
  };

  const menuItems = ((): MenuEntry[] => {
    const app = menu ? APPS_BY_TYPE.get(menu.type) : undefined;
    if (!app) return [];
    const shareUrl = generateShareUrl(app.componentType, app.props);
    return [
      { label: 'Open', icon: app.iconType, action: () => openApplication(app.componentType) },
      { type: 'divider' },
      { label: 'Copy link', disabled: !shareUrl, action: shareUrl ? () => void copyLink(shareUrl) : undefined },
    ];
  })();

  const draggedApp = drag ? APPS_BY_TYPE.get(drag.type) : undefined;
  const pixelated = desktop.iconSize === 'l';

  if (!desktop.showIcons) return null;

  return (
    <>
      <div
        ref={layerRef}
        className={`desktop-icons-layer absolute inset-3 z-10 select-none ${free ? '' : 'flex flex-col flex-wrap-reverse content-start gap-3'}`}
        data-rearranging={drag ? 'true' : undefined}
        data-free={free || undefined}
      >
        {apps.map((app, index) => (
          <DesktopIcon
            key={app.componentType}
            app={app}
            onOpen={() => openApplication(app.componentType)}
            isSelected={selectedApp === app.componentType}
            onSelect={() => setSelectedApp(app.componentType)}
            onDeselect={() => setSelectedApp((selected) => selected === app.componentType ? null : selected)}
            isMobile={isMobile}
            isDragging={drag?.type === app.componentType}
            isDropTarget={drag?.target === app.componentType}
            pixelated={pixelated}
            point={points ? points[index] : null}
            consumeDragClick={consumeDragClick}
            onPointerDown={handlePointerDown(app.componentType)}
            onContextMenu={handleContextMenu(app.componentType)}
          />
        ))}
        {drag && draggedApp && (
          <div
            className="desktop-icon-ghost flex flex-col items-center justify-center gap-2 p-1"
            aria-hidden="true"
            style={{
              width: drag.width,
              height: drag.height,
              transform: `translate(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px)`,
            }}
          >
            <span className="desktop-icon-image flex items-center justify-center">
              <CustomIcon iconType={draggedApp.iconType} className="desktop-icon-glyph" pixelated={pixelated} />
            </span>
            <span className="desktop-icon-label max-w-full text-center text-xs font-bold leading-tight">{draggedApp.name}</span>
          </div>
        )}
      </div>

      <ContextMenu
        items={menuItems}
        isOpen={menu !== null}
        position={menu ?? { x: 0, y: 0 }}
        onClose={() => setMenu(null)}
      />
    </>
  );
});
