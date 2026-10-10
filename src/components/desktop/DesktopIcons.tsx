import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CustomIcon } from '@/components/window/CustomIcon';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePersistedState } from '@/hooks/useStorage';
import { APP_LIST, type AppConfig } from '@/config/apps';
import {
  DESKTOP_ICON_ORDER_KEY,
  DESKTOP_ICON_ORDER_RESET_EVENT,
  moveIcon,
  normalizeIconOrder,
} from '@/lib/desktopIconOrder';

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
  /** A click that ends a drag must not open the app. */
  consumeDragClick: () => boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

const DesktopIcon: React.FC<DesktopIconProps> = ({
  app, onOpen, isSelected, onSelect, onDeselect, isMobile, isDragging, isDropTarget, consumeDragClick, onPointerDown,
}) => {
  const openAndDeselect = (button: HTMLButtonElement) => {
    onOpen();
    onDeselect();
    button.blur();
  };

  return (
    <button
      onPointerDown={onPointerDown}
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
      className="desktop-icon-button flex min-h-[76px] w-24 flex-col items-center justify-center gap-2 p-1 select-none"
      aria-label={`Open ${app.name}`}
      aria-pressed={isSelected}
      data-selected={isSelected || undefined}
      data-dragging={isDragging || undefined}
      data-drop-target={isDropTarget || undefined}
      data-app={app.componentType}
      tabIndex={0}
    >
      <span className="desktop-icon-image flex items-center justify-center">
        <CustomIcon iconType={app.iconType} className="h-8 w-8" />
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

export const DesktopIcons: React.FC = React.memo(() => {
  const isMobile = useIsMobile();
  const openApplication = useApplicationLauncher();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [order, setOrder] = usePersistedState<string[]>({
    key: DESKTOP_ICON_ORDER_KEY,
    defaultValue: CATALOG_ORDER,
    normalize: (stored) => normalizeIconOrder(stored, CATALOG_ORDER),
  });
  const [drag, setDrag] = useState<DragState | null>(null);
  const pending = useRef<PendingDrag | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const suppressClick = useRef(false);

  const apps = useMemo(
    () => normalizeIconOrder(order, CATALOG_ORDER).map((type) => APPS_BY_TYPE.get(type)!),
    [order],
  );

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

  // Config's "Reset icon layout" button.
  useEffect(() => {
    const reset = () => setOrder(CATALOG_ORDER);
    window.addEventListener(DESKTOP_ICON_ORDER_RESET_EVENT, reset);
    return () => window.removeEventListener(DESKTOP_ICON_ORDER_RESET_EVENT, reset);
  }, [setOrder]);

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
      const target = iconTypeAt(event.clientX, event.clientY);
      setDrag({ ...current, x: event.clientX, y: event.clientY, target: target === current.type ? null : target });
    };

    const onUp = (event: PointerEvent) => {
      clearPending();
      const current = dragRef.current;
      if (!current) return;
      const target = iconTypeAt(event.clientX, event.clientY);
      if (target && target !== current.type) {
        setOrder((previous) => moveIcon(normalizeIconOrder(previous, CATALOG_ORDER), current.type, target));
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
  }, [beginDrag, setOrder]);

  const handlePointerDown = (type: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || drag) return;
    clearPending();
    const rect = event.currentTarget.getBoundingClientRect();
    const touchLike = event.pointerType !== 'mouse';
    const start: PendingDrag = {
      type,
      pointerId: event.pointerId,
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

  const consumeDragClick = () => {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  };

  const draggedApp = drag ? APPS_BY_TYPE.get(drag.type) : undefined;

  return (
    <div
      className="absolute top-3 right-3 bottom-3 flex flex-col flex-wrap-reverse content-start gap-3 z-10 select-none"
      data-rearranging={drag ? 'true' : undefined}
    >
      {apps.map((app) => (
        <DesktopIcon
          key={app.componentType}
          app={app}
          onOpen={() => openApplication(app.componentType)}
          isSelected={selectedApp === app.name}
          onSelect={() => setSelectedApp(app.name)}
          onDeselect={() => setSelectedApp((selected) => selected === app.name ? null : selected)}
          isMobile={isMobile}
          isDragging={drag?.type === app.componentType}
          isDropTarget={drag?.target === app.componentType}
          consumeDragClick={consumeDragClick}
          onPointerDown={handlePointerDown(app.componentType)}
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
            <CustomIcon iconType={draggedApp.iconType} className="h-8 w-8" />
          </span>
          <span className="desktop-icon-label max-w-full text-center text-xs font-bold leading-tight">{draggedApp.name}</span>
        </div>
      )}
    </div>
  );
});
