import { memo, Suspense, useCallback, useState } from 'react';
import { WindowErrorBoundary } from './WindowErrorBoundary';
import { useWindowActions, type DesktopWindow } from '@/hooks/useWindowManager';
import { X, Minimize, Maximize } from 'lucide-react';
import { CustomIcon } from './CustomIcon';
import { Rnd, RndDragCallback, RndResizeCallback } from 'react-rnd';
import { cn } from '@/lib/utils';
import { adjustWindowToViewport, type WindowDimensions, type ViewportDimensions } from '@/lib/utils';
import { WINDOW_DEFAULTS } from '@/config/window';
import { ContextMenu, type ContextMenuItem } from '@/components/menu/ContextMenu';
import { generateShareUrl } from '@/config/routes';
import { toast } from 'sonner';
import { useWindowTransitions } from '@/hooks/useWindowTransitions';

interface DraggableWindowProps {
  window: DesktopWindow;
  isActive: boolean;
  isTransitioning: boolean;
}

/**
 * Buttons inside the drag handle. react-draggable calls preventDefault on
 * touchstart anywhere in the handle, which cancels the tap's click; excluding
 * the buttons lets them get an ordinary click on touch and mouse alike, and a
 * press on them no longer starts a zero-length drag.
 */
const WINDOW_DRAG_CANCEL = '.window-menu-button, .window-controls';

export const DraggableWindow = memo(function DraggableWindow({ window: windowProps, isActive, isTransitioning }: DraggableWindowProps) {
  const { closeWindow, focusWindow, maximizeWindow, restoreWindow, updateWindowPosition, updateWindowDimensions } = useWindowActions();
  const { minimizeWithTransition } = useWindowTransitions();
  const [isInteracting, setIsInteracting] = useState(false);

  // Context menu state
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

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

  // Handle app icon click to show context menu
  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenuPosition({ x: rect.left, y: rect.bottom });
    setContextMenuOpen(true);
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

  // Build context menu items
  const getContextMenuItems = (): ContextMenuItem[] => {
    const shareUrl = generateShareUrl(windowProps.componentType || '', windowProps.props);
    const windowSubItems: ContextMenuItem[] = [
      {
        type: 'item',
        label: 'Restore',
        icon: 'maximize',
        action: () => restoreWindow(windowProps.id),
        disabled: !windowProps.maximized, // Only enabled when maximized
      },
      {
        type: 'item',
        label: 'Minimize',
        icon: 'minimize',
        action: () => minimizeWithTransition(windowProps),
      },
      {
        type: 'item',
        label: 'Maximize',
        icon: 'maximize',
        action: () => maximizeWindow(windowProps.id),
        disabled: windowProps.maximized, // Disabled when already maximized
      },
      { type: 'divider' },
      {
        type: 'item',
        label: 'Close',
        icon: 'close',
        action: () => closeWindow(windowProps.id),
      },
    ];

    return [
      {
        type: 'item',
        label: 'Window',
        subItems: windowSubItems,
      },
      {
        type: 'item',
        label: 'Share Window',
        disabled: !shareUrl,
        action: () => {
          if (shareUrl) void copyShareUrl(shareUrl);
        },
      },
    ];
  };

  const handleDragStop = useCallback<RndDragCallback>((_e, data) => {
    setIsInteracting(false);
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
    const currentWindowData: WindowDimensions = {
      x: data.x,
      y: data.y,
      width: windowProps.width ?? WINDOW_DEFAULTS.DEFAULT_WIDTH,
      height: windowProps.height ?? WINDOW_DEFAULTS.DEFAULT_HEIGHT,
      minWidth: windowProps.minWidth ?? WINDOW_DEFAULTS.MIN_WIDTH,
      minHeight: windowProps.minHeight ?? WINDOW_DEFAULTS.MIN_HEIGHT,
    };
    const adjusted = adjustWindowToViewport(currentWindowData, viewport);
    updateWindowPosition(windowProps.id, adjusted.x, adjusted.y);
  }, [windowProps.id, windowProps.maximized, windowProps.width, windowProps.height, windowProps.minWidth, windowProps.minHeight, updateWindowPosition]);

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
    updateWindowDimensions(windowProps.id, adjusted.width, adjusted.height);
    updateWindowPosition(windowProps.id, adjusted.x, adjusted.y);
  }, [windowProps.id, windowProps.minWidth, windowProps.minHeight, updateWindowDimensions, updateWindowPosition]);

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

  const calculatedWidth = typeof windowProps.width === 'number' ? windowProps.width : WINDOW_DEFAULTS.DEFAULT_WIDTH;
  const calculatedHeight = typeof windowProps.height === 'number' ? windowProps.height : WINDOW_DEFAULTS.DEFAULT_HEIGHT;

  return (
    <>
      <Rnd
        className={cn(
          "draggable-window",
          isInteracting && "is-interacting",
          windowProps.maximized && "is-maximized",
          windowProps.minimized && "is-minimized",
          isTransitioning && "is-transitioning",
        )}
        size={windowProps.maximized ?
          { width: '100%', height: '100%' } :
          { width: calculatedWidth, height: calculatedHeight }
        }
        position={windowProps.maximized ?
          { x: 0, y: 0 } :
          { x: windowProps.x ?? 50, y: windowProps.y ?? 50 }
        }
        minWidth={WINDOW_DEFAULTS.MIN_WIDTH}
        minHeight={WINDOW_DEFAULTS.MIN_HEIGHT}
        bounds="parent"
        style={{
          zIndex: windowProps.zIndex,
        }}
        onMouseDown={handleMouseDownFocus}
        onDragStart={handleInteractionStartFocus}
        onDragStop={handleDragStop}
        onResizeStart={handleInteractionStartFocus}
        onResizeStop={handleResizeStop}
        disableDragging={windowProps.maximized}
        enableResizing={!windowProps.maximized}
        dragHandleClassName="window-titlebar"
        cancel={WINDOW_DRAG_CANCEL}
      >
        <div
          data-window-surface-id={windowProps.id}
          data-active={isActive || undefined}
          data-maximized={windowProps.maximized || undefined}
          className="window-surface flex flex-col w-full h-full overflow-hidden"
        >
          {/* Title bar - fixed height */}
          <div
            className="window-titlebar"
            onDoubleClick={() => windowProps.maximized
              ? restoreWindow(windowProps.id)
              : maximizeWindow(windowProps.id)}
          >
            <button
              onClick={handleIconClick}
              className="window-menu-button flex items-center justify-center"
              title="Window menu"
              aria-haspopup="menu"
              aria-expanded={contextMenuOpen}
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

      {/* Title bar context menu */}
      <ContextMenu
        items={getContextMenuItems()}
        isOpen={contextMenuOpen}
        position={contextMenuPosition}
        onClose={() => setContextMenuOpen(false)}
      />
    </>
  );
});
