import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { WindowErrorBoundary } from './WindowErrorBoundary';
import { useWindowActions, type DesktopWindow } from '@/hooks/useWindowManager';
import { X, Minimize, Maximize } from 'lucide-react';
import { CustomIcon } from './CustomIcon';
import { Rnd, RndDragCallback, RndResizeCallback } from 'react-rnd';
import { cn } from '@/lib/utils';
import { adjustWindowToViewport, type WindowDimensions, type ViewportDimensions } from '@/lib/utils';
import { WINDOW_DEFAULTS } from '@/config/window';
import { ContextMenu } from '@/components/menu/ContextMenu';
import { generateShareUrl } from '@/config/routes';
import { toast } from 'sonner';
import { useWindowTransitions } from '@/hooks/useWindowTransitions';
import { useTheme } from '@/hooks/useTheme';
import { pointerFromDragEvent, resolveSnapZone, snapZoneRect, type SnapRect, type SnapZone } from '@/lib/windowSnap';
import { buildWindowMenu } from './windowMenu';
import { forgetTabWidth, parseStackMembers, reportTabWidth, useStackTabOffset } from '@/lib/windowStacks';

interface DraggableWindowProps {
  window: DesktopWindow;
  isActive: boolean;
  isTransitioning: boolean;
  /** Ids of this window's stack in strip order, comma-joined; null when it is not stacked. */
  stackMembers: string | null;
  /** Double-click on the title bar: maximize or shade, by the Config setting. */
  onTitleDoubleClick: (window: DesktopWindow) => void;
}

/**
 * Buttons inside the drag handle. react-draggable calls preventDefault on
 * touchstart anywhere in the handle, which cancels the tap's click; excluding
 * the buttons lets them get an ordinary click on touch and mouse alike, and a
 * press on them no longer starts a zero-length drag.
 */
const WINDOW_DRAG_CANCEL = '.window-menu-button, .window-controls';

/** Space BeOS keeps free at the right of a frame, so a strip of tabs never reaches the corner. */
const STACK_STRIP_MARGIN = 24;

/** The attention blink: three flashes, each this long off and on. */
const ATTENTION_FLASHES = 3;
const ATTENTION_PHASE_MS = 140;

export const DraggableWindow = memo(function DraggableWindow({ window: windowProps, isActive, isTransitioning, stackMembers, onTitleDoubleClick }: DraggableWindowProps) {
  const {
    closeWindow, focusWindow, maximizeWindow, restoreWindow,
    updateWindowPosition, updateWindowDimensions, updateWindowBounds,
    stackWindow, unstackWindow, updateStackBounds,
  } = useWindowActions();
  const { minimizeWithTransition, toggleShadeWithTransition } = useWindowTransitions();
  const { definition } = useTheme();
  // The palm layout shows one window at a time, each filling the screen.
  const fillsScreen = windowProps.maximized || definition.layout === 'palm';
  const [isInteracting, setIsInteracting] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  // Snapping: the zone under the pointer during a drag, and the rectangle previewed for it.
  const [snapPreview, setSnapPreview] = useState<SnapRect | null>(null);
  const snapZoneRef = useRef<SnapZone | null>(null);
  const shaded = Boolean(windowProps.shaded);

  // Attention: a launch that landed on this window while it was shaded. The
  // title bar flashes by dropping data-active for the off phases (every theme
  // has an inactive look) under a data-attention flag the lok theme styles.
  const [attentionOff, setAttentionOff] = useState(false);
  const [attentionOn, setAttentionOn] = useState(false);
  useEffect(() => {
    if (!windowProps.attention) return;
    setAttentionOn(true);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let phase = 0; phase < ATTENTION_FLASHES * 2; phase += 1) {
      timers.push(setTimeout(() => setAttentionOff(phase % 2 === 0), phase * ATTENTION_PHASE_MS));
    }
    timers.push(setTimeout(() => {
      setAttentionOff(false);
      setAttentionOn(false);
    }, ATTENTION_FLASHES * 2 * ATTENTION_PHASE_MS));
    return () => {
      timers.forEach(clearTimeout);
      setAttentionOff(false);
      setAttentionOn(false);
    };
  }, [windowProps.attention]);

  // Tab stacking (BeOS): a tab dropped on another window's tab joins its
  // frame, and the tabs line up in a strip. A stacked window drags its whole
  // stack along (the siblings follow through inline transforms until the drop
  // commits the move); Shift while dragging takes it out instead.
  const stacking = Boolean(definition.tabStacking) && !fillsScreen;
  const members = useMemo(() => parseStackMembers(stackMembers), [stackMembers]);
  const stacked = stacking && Boolean(windowProps.stack) && members.length > 1;
  const tabOffset = useStackTabOffset(members, windowProps.id, stacked);
  const titleRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<{ nodes: HTMLElement[]; transforms: string[] } | null>(null);
  const detachRef = useRef(false);
  const stackTargetRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const tab = titleRef.current;
    if (!stacked || !tab) return;
    const report = () => reportTabWidth(windowProps.id, tab.getBoundingClientRect().width);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(tab);
    return () => {
      observer.disconnect();
      forgetTabWidth(windowProps.id);
    };
  }, [stacked, windowProps.id]);

  /** The tab of another (unmaximized) window under the point, if any. */
  const stackTargetAt = useCallback((x: number, y: number): HTMLElement | null => {
    for (const element of document.elementsFromPoint(x, y)) {
      const tab = element.closest<HTMLElement>('.window-titlebar');
      if (!tab) continue;
      const surface = tab.parentElement;
      const id = surface?.dataset.windowSurfaceId;
      if (!id || id === windowProps.id || surface?.dataset.maximized) continue;
      return tab;
    }
    return null;
  }, [windowProps.id]);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    minimizeWithTransition(windowProps);
  };

  const handleMaximizeRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (windowProps.maximized) {
      restoreWindow(windowProps.id);
    } else {
      maximizeWindow(windowProps.id);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeWindow(windowProps.id);
  };

  // The icon button drops the window menu below itself; a right-click on the title bar opens it at the pointer.
  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.bottom });
  };

  const handleTitleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isActive) focusWindow(windowProps.id);
    setMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest(WINDOW_DRAG_CANCEL)) return;
    onTitleDoubleClick(windowProps);
  };

  // The link reopens this window as it is shown: apps report their view through onPropsChange.
  const copyShareUrl = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast('Link copied to clipboard');
    } catch (error) {
      console.warn('[Window] Could not copy the share link:', error);
      toast('Could not copy the link');
    }
  };

  const getContextMenuItems = () => {
    const shareUrl = generateShareUrl(windowProps.componentType || '', windowProps.props);
    return buildWindowMenu(windowProps, {
      minimize: () => minimizeWithTransition(windowProps),
      unminimize: () => focusWindow(windowProps.id),
      maximize: () => maximizeWindow(windowProps.id),
      restore: () => restoreWindow(windowProps.id),
      toggleShade: () => toggleShadeWithTransition(windowProps),
      close: () => closeWindow(windowProps.id),
      share: shareUrl ? () => void copyShareUrl(shareUrl) : null,
      detach: stacked ? () => {
        unstackWindow(windowProps.id);
        updateWindowPosition(windowProps.id, (windowProps.x ?? 0) + STACK_STRIP_MARGIN, (windowProps.y ?? 0) + STACK_STRIP_MARGIN);
      } : undefined,
    });
  };

  // Alt (Option) while dragging previews a half or quarter by pointer position;
  // reaching the desktop's left or right edge does the same without it.
  const handleDrag = useCallback<RndDragCallback>((e, data) => {
    if (windowProps.maximized) return;
    const group = groupRef.current;
    if (group) {
      for (const node of group.nodes) node.style.transform = `translate(${data.x}px, ${data.y}px)`;
    }
    const layer = data.node.parentElement;
    const pointer = pointerFromDragEvent(e as unknown as Event);
    if (!layer || !pointer) return;
    // A single tab over another window's tab lights it: dropping there stacks them.
    if (stacking && !group) {
      const target = stackTargetAt(pointer.clientX, pointer.clientY);
      if (target !== stackTargetRef.current) {
        stackTargetRef.current?.removeAttribute('data-stack-target');
        target?.setAttribute('data-stack-target', '');
        stackTargetRef.current = target;
      }
    }
    const layerRect = layer.getBoundingClientRect();
    const area = { width: layer.clientWidth, height: layer.clientHeight };
    const modifier = 'altKey' in e && Boolean((e as { altKey?: boolean }).altKey);
    const zone = resolveSnapZone({ x: pointer.clientX - layerRect.left, y: pointer.clientY - layerRect.top }, area, modifier);
    if (zone === snapZoneRef.current) return;
    snapZoneRef.current = zone;
    setSnapPreview(zone ? snapZoneRect(zone, area) : null);
  }, [stackTargetAt, stacking, windowProps.maximized]);

  const handleDragStop = useCallback<RndDragCallback>((_e, data) => {
    setIsInteracting(false);
    const zone = snapZoneRef.current;
    snapZoneRef.current = null;
    setSnapPreview(null);
    const group = groupRef.current;
    groupRef.current = null;
    const target = stackTargetRef.current;
    stackTargetRef.current = null;
    target?.removeAttribute('data-stack-target');
    const detaching = detachRef.current;
    detachRef.current = false;
    if (windowProps.maximized) return;

    const parentElement = data.node.parentElement;
    if (!parentElement) {
      updateWindowPosition(windowProps.id, data.x, data.y);
      return;
    }

    const viewport: ViewportDimensions = {
      width: parentElement.clientWidth,
      height: parentElement.clientHeight,
    };
    const minWidth = windowProps.minWidth ?? WINDOW_DEFAULTS.MIN_WIDTH;
    const minHeight = windowProps.minHeight ?? WINDOW_DEFAULTS.MIN_HEIGHT;
    const width = windowProps.width ?? WINDOW_DEFAULTS.DEFAULT_WIDTH;
    const height = windowProps.height ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT;

    if (group && windowProps.stack) {
      // The siblings followed through inline transforms; the state update places the whole stack for real.
      group.nodes.forEach((node, index) => { node.style.transform = group.transforms[index]; });
      const bounds = zone
        ? adjustWindowToViewport({ ...snapZoneRect(zone, viewport), minWidth, minHeight }, viewport)
        : adjustWindowToViewport({ x: data.x, y: data.y, width, height, minWidth, minHeight }, viewport);
      updateStackBounds(windowProps.stack, zone
        ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
        : { x: bounds.x, y: bounds.y });
      return;
    }

    if (detaching) unstackWindow(windowProps.id);
    const targetId = target?.parentElement?.dataset.windowSurfaceId;
    if (targetId) {
      stackWindow(windowProps.id, targetId);
      return;
    }

    if (zone) {
      const target = snapZoneRect(zone, viewport);
      const adjusted = adjustWindowToViewport({ ...target, minWidth, minHeight }, viewport);
      updateWindowBounds(windowProps.id, { x: adjusted.x, y: adjusted.y, width: adjusted.width, height: adjusted.height });
      return;
    }

    const currentWindowData: WindowDimensions = {
      x: data.x,
      y: data.y,
      width,
      // A shaded window is only as tall as its title bar; clamping with its full height would push it up.
      height: shaded ? data.node.offsetHeight : height,
      minWidth,
      minHeight: shaded ? 0 : minHeight,
    };
    const adjusted = adjustWindowToViewport(currentWindowData, viewport);
    updateWindowPosition(windowProps.id, adjusted.x, adjusted.y);
  }, [
    windowProps.id, windowProps.maximized, windowProps.width, windowProps.height, windowProps.minWidth, windowProps.minHeight, windowProps.stack,
    shaded, updateWindowPosition, updateWindowBounds, updateStackBounds, stackWindow, unstackWindow,
  ]);

  const handleResizeStop = useCallback<RndResizeCallback>((_e, _direction, ref, _delta, position) => {
    setIsInteracting(false);
    const parentElement = ref.parentElement;
    if (!parentElement) {
      updateWindowDimensions(windowProps.id, ref.offsetWidth, ref.offsetHeight);
      updateWindowPosition(windowProps.id, position.x, position.y);
      return;
    }

    const viewport: ViewportDimensions = {
      width: parentElement.clientWidth,
      height: parentElement.clientHeight,
    };
    const currentWindowData: WindowDimensions = {
      x: position.x,
      y: position.y,
      width: ref.offsetWidth,
      height: ref.offsetHeight,
      minWidth: windowProps.minWidth ?? WINDOW_DEFAULTS.MIN_WIDTH,
      minHeight: windowProps.minHeight ?? WINDOW_DEFAULTS.MIN_HEIGHT,
    };
    const adjusted = adjustWindowToViewport(currentWindowData, viewport);
    const bounds = { x: adjusted.x, y: adjusted.y, width: adjusted.width, height: adjusted.height };
    // A stacked window shares its frame: resizing it resizes the stack.
    if (stacked && windowProps.stack) updateStackBounds(windowProps.stack, bounds);
    else updateWindowBounds(windowProps.id, bounds);
  }, [windowProps.id, windowProps.minWidth, windowProps.minHeight, windowProps.stack, stacked, updateWindowDimensions, updateWindowPosition, updateWindowBounds, updateStackBounds]);

  // Focus on press. The title bar itself focuses through onDragStart; its
  // buttons are excluded from dragging (WINDOW_DRAG_CANCEL), so they focus here
  // along with presses anywhere in the content. Runs for touch as well: Rnd
  // forwards touchstart to onMouseDown before deciding whether to drag.
  const handleMouseDownFocus = useCallback((e: MouseEvent) => {
    if (isActive) return;
    const target = e.target as Element;
    const onDragHandle = target.closest('.window-titlebar') && !target.closest(WINDOW_DRAG_CANCEL);
    if (!onDragHandle) focusWindow(windowProps.id);
  }, [focusWindow, windowProps.id, isActive]);

  // Generic handler to focus window on drag/resize start if not active
  const handleInteractionStartFocus = useCallback(() => {
    setIsInteracting(true);
    if (!isActive) {
      focusWindow(windowProps.id);
    }
  }, [focusWindow, windowProps.id, isActive]);

  // A drag of a stacked tab takes the stack along, unless Shift is held to detach it.
  const handleDragStart = useCallback<RndDragCallback>((e) => {
    handleInteractionStartFocus();
    detachRef.current = stacked && 'shiftKey' in e && Boolean((e as { shiftKey?: boolean }).shiftKey);
    if (!stacked || detachRef.current) {
      groupRef.current = null;
      return;
    }
    const nodes = members
      .filter((member) => member !== windowProps.id)
      .map((member) => document.querySelector<HTMLElement>(`.window-surface[data-window-surface-id="${member}"]`)?.parentElement ?? null)
      .filter((node): node is HTMLElement => node !== null);
    groupRef.current = { nodes, transforms: nodes.map((node) => node.style.transform) };
  }, [handleInteractionStartFocus, members, stacked, windowProps.id]);

  const calculatedWidth = typeof windowProps.width === 'number' ? windowProps.width : WINDOW_DEFAULTS.DEFAULT_WIDTH;
  const calculatedHeight = typeof windowProps.height === 'number' ? windowProps.height : WINDOW_DEFAULTS.DEFAULT_HEIGHT;
  // Shaded: the frame is as tall as its title bar (the content area is display: none).
  const size = fillsScreen
    ? { width: '100%', height: shaded ? 'auto' : '100%' }
    : { width: calculatedWidth, height: shaded ? 'auto' : calculatedHeight };

  return (
    <>
      <Rnd
        className={cn(
          "draggable-window",
          isActive && "is-active",
          isInteracting && "is-interacting",
          windowProps.maximized && "is-maximized",
          windowProps.minimized && "is-minimized",
          shaded && "is-shaded",
          isTransitioning && "is-transitioning",
        )}
        size={size}
        position={fillsScreen ?
          { x: 0, y: 0 } :
          { x: windowProps.x ?? 50, y: windowProps.y ?? 50 }
        }
        minWidth={WINDOW_DEFAULTS.MIN_WIDTH}
        minHeight={shaded ? 0 : WINDOW_DEFAULTS.MIN_HEIGHT}
        bounds="parent"
        style={{
          zIndex: windowProps.zIndex,
        }}
        onMouseDown={handleMouseDownFocus}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResizeStart={handleInteractionStartFocus}
        onResizeStop={handleResizeStop}
        disableDragging={fillsScreen}
        enableResizing={!fillsScreen && !shaded}
        dragHandleClassName="window-titlebar"
        cancel={WINDOW_DRAG_CANCEL}
      >
        <div
          data-window-surface-id={windowProps.id}
          data-active={(isActive && !attentionOff) || undefined}
          data-attention={attentionOn || undefined}
          data-maximized={windowProps.maximized || undefined}
          data-shaded={shaded || undefined}
          className="window-surface flex flex-col w-full h-full overflow-hidden"
        >
          {/* Title bar - fixed height */}
          <div
            ref={titleRef}
            className="window-titlebar"
            data-stacked={stacked || undefined}
            style={stacked ? { marginLeft: tabOffset, minWidth: 0, maxWidth: `calc((100% - ${STACK_STRIP_MARGIN}px) / ${members.length})` } : undefined}
            onDoubleClick={handleTitleDoubleClick}
            onContextMenu={handleTitleContextMenu}
          >
            <button
              onClick={handleIconClick}
              className="window-menu-button flex items-center justify-center"
              title="Window menu"
              aria-haspopup="menu"
              aria-expanded={menuPosition !== null}
            >
              <CustomIcon iconType={windowProps.iconType} className="w-4 h-4" />
            </button>
            <span className="window-title flex-1 truncate">{windowProps.title}</span>
            <div className="window-controls flex gap-1">
              <button
                className="retro-button window-control"
                data-window-control="minimize"
                onClick={handleMinimize}
                title="Minimize"
                aria-label="Minimize"
              >
                <Minimize className="w-3 h-3" />
              </button>
              {windowProps.maximized ? (
                <button
                  className="retro-button window-control"
                  data-window-control="restore"
                  onClick={handleMaximizeRestore}
                  title="Restore"
                  aria-label="Restore"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 0H2C1.44772 0 1 0.447715 1 1V7C1 7.55228 1.44772 8 2 8H8C8.55228 8 9 7.55228 9 7V1C9 0.447715 8.55228 0 8 0ZM8 7H2V1H8V7ZM10 3H9V4H10V10H4V9H3V10C3 10.5523 3.44772 11 4 11H10C10.5523 11 11 10.5523 11 10V4C11 3.44772 10.5523 3 10 3Z" fill="currentColor" />
                  </svg>
                </button>
              ) : (
                <button
                  className="retro-button window-control"
                  data-window-control="maximize"
                  onClick={handleMaximizeRestore}
                  title="Maximize"
                  aria-label="Maximize"
                >
                  <Maximize className="w-3 h-3" />
                </button>
              )}
              <button
                className="retro-button window-control"
                data-window-control="close"
                onClick={handleClose}
                title="Close"
                aria-label="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Content area - with direct overflow styling */}
          <div className="window-content-area flex-1 overflow-auto" style={{ position: 'relative' }}>
            <WindowErrorBoundary>
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Loading...
                  </div>
                }
              >
                {windowProps.content}
              </Suspense>
            </WindowErrorBoundary>
          </div>
        </div>
      </Rnd>

      {snapPreview && (
        <div
          className="window-snap-preview"
          style={{ left: snapPreview.x, top: snapPreview.y, width: snapPreview.width, height: snapPreview.height }}
          aria-hidden="true"
        />
      )}

      {/* Window menu: from the title-bar icon or a right-click on the title bar */}
      <ContextMenu
        items={menuPosition ? getContextMenuItems() : []}
        isOpen={menuPosition !== null}
        position={menuPosition ?? { x: 0, y: 0 }}
        onClose={() => setMenuPosition(null)}
      />
    </>
  );
});
