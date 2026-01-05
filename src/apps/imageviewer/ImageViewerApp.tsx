import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';

interface ImageViewerAppProps {
  imageUrl?: string;
}

// Zoom step for +/- buttons (10%)
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

export const ImageViewerApp: React.FC<ImageViewerAppProps> = ({
  imageUrl = "https://placehold.co/600x400?text=No+Image"
}) => {
  // Scale: 1.0 = 100% = image displayed at its natural pixel size
  const [scale, setScale] = useState<number>(1);
  // Natural dimensions of the image (actual file dimensions)
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  // Pan position offset in pixels
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Load image to get natural dimensions and auto-fit on first load
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const natWidth = img.naturalWidth;
      const natHeight = img.naturalHeight;
      setNaturalSize({ width: natWidth, height: natHeight });
      setPanOffset({ x: 0, y: 0 });

      // Auto-fit to window: use the smaller scale so entire image is visible
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;

          // Calculate scale needed to fit each dimension
          const scaleToFitWidth = containerWidth / natWidth;
          const scaleToFitHeight = containerHeight / natHeight;

          // Use the smaller scale so image fits entirely (no cropping)
          const initialScale = Math.min(scaleToFitWidth, scaleToFitHeight);

          setScale(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +initialScale.toFixed(2))));
        } else {
          setScale(1);
        }
      });
    };
    img.onerror = () => {
      setNaturalSize(null);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculated display size in pixels (absolute, not affected by window size)
  const displayWidth = naturalSize ? Math.round(naturalSize.width * scale) : 0;
  const displayHeight = naturalSize ? Math.round(naturalSize.height * scale) : 0;

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_ZOOM, +(prev + ZOOM_STEP).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(MIN_ZOOM, +(prev - ZOOM_STEP).toFixed(2)));
  }, []);

  // Reset to 100% (actual pixel size)
  const handleReset = useCallback(() => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Fit to current window width
  const handleFitWidth = useCallback(() => {
    if (!containerRef.current || !naturalSize) return;
    const containerWidth = containerRef.current.clientWidth;
    const newScale = containerWidth / naturalSize.width;
    setScale(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +newScale.toFixed(2))));
    setPanOffset({ x: 0, y: 0 });
  }, [naturalSize]);

  // Fit to current window height
  const handleFitHeight = useCallback(() => {
    if (!containerRef.current || !naturalSize) return;
    const containerHeight = containerRef.current.clientHeight;
    const newScale = containerHeight / naturalSize.height;
    setScale(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +newScale.toFixed(2))));
    setPanOffset({ x: 0, y: 0 });
  }, [naturalSize]);

  // Mouse drag handlers for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse wheel for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((prev) => {
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
      return +newScale.toFixed(2);
    });
  }, []);

  return (
    <WindowLayout
      hasPadding={false}
      isScrollable={false}
      toolbar={
        <div className="p-1 border-b border-border flex items-center justify-between select-none bg-background">
          {/* Zoom controls group - no gaps */}
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" onClick={handleZoomOut} title="Zoom Out">
              −
            </RetroButton>
            <RetroButton size="sm" onClick={handleZoomIn} title="Zoom In">
              +
            </RetroButton>
            <span className="text-xs px-2 min-w-[50px] text-center border border-border h-[18px] flex items-center justify-center">
              {Math.round(scale * 100)}%
            </span>
            <RetroButton size="sm" onClick={handleReset} title="Reset to 100% (actual size)">
              1:1
            </RetroButton>
          </div>
          {/* Fit controls group - aligned right */}
          <div className="flex items-center space-x-0">
            <RetroButton size="sm" onClick={handleFitWidth} title="Fit Width to Window">
              ↔ W
            </RetroButton>
            <RetroButton size="sm" onClick={handleFitHeight} title="Fit Height to Window">
              ↕ H
            </RetroButton>
          </div>
        </div>
      }
      footer={
        <div className="p-1 border-t border-border text-xs text-muted-foreground flex items-center gap-2 select-none bg-background">
          {naturalSize ? (
            <>
              <span>{naturalSize.width} × {naturalSize.height}</span>
              <span className="opacity-50">@</span>
              <span>{displayWidth} × {displayHeight} px</span>
            </>
          ) : (
            <span>Loading image...</span>
          )}
        </div>
      }
    >
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden bg-background relative"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        {naturalSize && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
          >
            <img
              src={imageUrl}
              alt="Viewed content"
              draggable={false}
              style={{
                display: 'block',
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                minWidth: `${displayWidth}px`,
                minHeight: `${displayHeight}px`,
                maxWidth: `${displayWidth}px`,
                maxHeight: `${displayHeight}px`,
                flexShrink: 0,
                imageRendering: scale > 1 ? 'pixelated' : 'auto',
                pointerEvents: 'none',
              }}
            />
          </div>
        )}
      </div>
    </WindowLayout>
  );
};

export default ImageViewerApp;