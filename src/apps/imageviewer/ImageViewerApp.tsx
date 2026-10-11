import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { FEATURED_CHANNELS, imageChannelLabel, isImageChannel } from '@/config/channels';
import { getUserChannels } from '@/lib/api';
import {
  formatArenaReference,
  getArenaImage,
  parseArenaReference,
  type ArenaReference,
} from '@/apps/arena/utils/arenaLinks';
import { collectFromArena, describeArenaError, isAbortError } from '@/apps/arena/utils/arenaImport';
import './image-viewer.css';

interface ImageViewerAppProps {
  imageUrl?: string;
  /** Are.na channel or block link. Channels open as a gallery. */
  arena?: string;
  /** Gallery page, zero-based. */
  index?: number;
  /** Open the gallery at this block when it is one of the images. */
  startBlockId?: number;
  onPropsChange?: (props: Record<string, unknown>) => void;
}

interface GalleryImage {
  src: string;
  title: string;
  id?: number;
  arenaUrl?: string;
}

/** What the viewer shows: one address, or a set of images to page through. */
type ViewerSource =
  | { kind: 'url'; url: string }
  | {
    kind: 'gallery';
    /** Canonical Are.na link; null for local files, which can't be restored. */
    reference: string | null;
    title: string;
    images: GalleryImage[];
    index: number;
    truncated: boolean;
  };

type GalleryStatus =
  | { state: 'idle' }
  | { state: 'loading'; message: string }
  | { state: 'error'; message: string };

// Zoom step for +/- buttons (10%)
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const GALLERY_LIMIT = 500;

interface SuggestedChannel {
  slug: string;
  title: string;
}

/** The 🜳-marked channels of a list, as buttons for the empty screen. */
const toSuggestions = (channels: ReadonlyArray<{ slug: string; title: string }>): SuggestedChannel[] =>
  channels.filter(isImageChannel).map((channel) => ({ slug: channel.slug, title: imageChannelLabel(channel) }));

/** Shown until the live channel list (cached at boot) arrives; it also stands in offline. */
const SNAPSHOT_SUGGESTIONS = toSuggestions(FEATURED_CHANNELS);

const normalizeHttpUrl = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const clampIndex = (index: unknown, length: number) => (
  typeof index === 'number' && Number.isInteger(index) ? Math.min(Math.max(index, 0), Math.max(length - 1, 0)) : 0
);

const isEditableTarget = (target: EventTarget | null) => (
  target instanceof HTMLElement
  && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
);

export const ImageViewerApp: React.FC<ImageViewerAppProps> = ({
  imageUrl,
  arena,
  index: initialIndex,
  startBlockId,
  onPropsChange,
}) => {
  const [source, setSource] = useState<ViewerSource | null>(() => (
    !arena && imageUrl ? { kind: 'url', url: imageUrl } : null
  ));
  // A restored gallery starts out loading, so nothing reads the window as empty meanwhile.
  const [galleryStatus, setGalleryStatus] = useState<GalleryStatus>(() => (
    arena && parseArenaReference(arena) ? { state: 'loading', message: 'Reading Are.na…' } : { state: 'idle' }
  ));
  const [imageFailed, setImageFailed] = useState(false);
  const [address, setAddress] = useState(() => arena ?? (imageUrl && !imageUrl.startsWith('blob:') ? imageUrl : ''));
  const [addressInvalid, setAddressInvalid] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedChannel[]>(SNAPSHOT_SUGGESTIONS);

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadRef = useRef<AbortController | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const dropDepthRef = useRef(0);

  const gallery = source?.kind === 'gallery' ? source : null;
  const currentImage: GalleryImage | null = source?.kind === 'gallery'
    ? source.images[source.index] ?? null
    : source?.kind === 'url' ? { src: source.url, title: '' } : null;
  const currentUrl = currentImage?.src;

  const releaseObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => () => {
    loadRef.current?.abort();
    releaseObjectUrls();
  }, [releaseObjectUrls]);

  const showSource = useCallback((next: ViewerSource | null) => {
    loadRef.current?.abort();
    loadRef.current = null;
    setGalleryStatus({ state: 'idle' });
    // Object URLs from an earlier pick die with the source that used them.
    const keep = next?.kind === 'gallery' && !next.reference ? new Set(next.images.map((image) => image.src)) : new Set<string>();
    objectUrlsRef.current.forEach((url) => {
      if (keep.has(url)) return;
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    });
    setSource(next);
  }, []);

  /** Reads an Are.na channel or block into a gallery. */
  const openArena = useCallback(async (reference: ArenaReference, options: { index?: number; blockId?: number } = {}) => {
    loadRef.current?.abort();
    const controller = new AbortController();
    loadRef.current = controller;
    const canonical = formatArenaReference(reference);
    setAddress(canonical);
    setAddressInvalid(false);
    setGalleryStatus({ state: 'loading', message: `Reading the Are.na ${reference.type}…` });
    try {
      const result = await collectFromArena(reference, getArenaImage, {
        limit: GALLERY_LIMIT,
        signal: controller.signal,
        onProgress: ({ scanned, total, found }) => {
          if (!controller.signal.aborted) {
            setGalleryStatus({ state: 'loading', message: `Reading Are.na… ${scanned} of ${total} blocks, ${found} images` });
          }
        },
      });
      if (controller.signal.aborted) return;
      if (!result.items.length) {
        setGalleryStatus({
          state: 'error',
          message: reference.type === 'channel'
            ? `“${result.title}” has no image blocks.`
            : `“${result.title}” isn’t an image.`,
        });
        return;
      }
      const images: GalleryImage[] = result.items;
      const byBlock = options.blockId !== undefined ? images.findIndex((image) => image.id === options.blockId) : -1;
      loadRef.current = null;
      setGalleryStatus({ state: 'idle' });
      releaseObjectUrls();
      setSource({
        kind: 'gallery',
        reference: canonical,
        title: result.title,
        images,
        index: byBlock >= 0 ? byBlock : clampIndex(options.index, images.length),
        truncated: result.truncated,
      });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      console.warn('[App:ImageViewer] Are.na gallery failed:', error);
      setGalleryStatus({ state: 'error', message: describeArenaError(error, reference) });
    } finally {
      if (loadRef.current === controller) loadRef.current = null;
    }
  }, [releaseObjectUrls]);

  // Launch props: an Are.na gallery restores by link; a single image needs no fetch.
  const launchedRef = useRef(false);
  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;
    const reference = arena ? parseArenaReference(arena) : null;
    if (reference) void openArena(reference, { index: initialIndex, blockId: startBlockId });
  }, [arena, initialIndex, openArena, startBlockId]);

  // Suggestions follow the live channel list: whatever lok marks with 🜳 now.
  useEffect(() => {
    let cancelled = false;
    getUserChannels()
      .then((channels) => {
        const live = toSuggestions(channels);
        if (!cancelled && live.length) setSuggestions(live);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Report what's open so the window restores and shares it. Local files can't be.
  useEffect(() => {
    if (!onPropsChange || !source) return;
    if (source.kind === 'url') {
      onPropsChange({ imageUrl: source.url.startsWith('blob:') ? undefined : source.url, arena: undefined, index: undefined, startBlockId: undefined });
      return;
    }
    onPropsChange({ imageUrl: undefined, arena: source.reference ?? undefined, index: source.index, startBlockId: undefined });
  }, [onPropsChange, source]);

  const openAddress = useCallback((value: string) => {
    const reference = parseArenaReference(value);
    if (reference) {
      void openArena(reference);
      return true;
    }
    const url = normalizeHttpUrl(value);
    if (!url) {
      setAddressInvalid(true);
      return false;
    }
    setAddressInvalid(false);
    setAddress(url);
    showSource({ kind: 'url', url });
    return true;
  }, [openArena, showSource]);

  const openFiles = useCallback((files: FileList | File[]) => {
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
      setGalleryStatus({ state: 'error', message: 'Those files aren’t images.' });
      return;
    }
    const entries = images.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return { src: url, title: file.name };
    });
    setAddress('');
    setAddressInvalid(false);
    showSource({
      kind: 'gallery',
      reference: null,
      title: entries.length === 1 ? entries[0].title : `${entries.length} local images`,
      images: entries,
      index: 0,
      truncated: false,
    });
  }, [showSource]);

  const goTo = useCallback((next: number) => {
    setSource((prev) => {
      if (prev?.kind !== 'gallery' || prev.images.length < 2) return prev;
      const length = prev.images.length;
      return { ...prev, index: ((next % length) + length) % length };
    });
  }, []);

  const step = useCallback((direction: 1 | -1) => {
    if (gallery) goTo(gallery.index + direction);
  }, [gallery, goTo]);

  // Load image to get natural dimensions and auto-fit on first load
  useEffect(() => {
    setImageFailed(false);
    if (!currentUrl) {
      setNaturalSize(null);
      return;
    }
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
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
      if (!active) return;
      setNaturalSize(null);
      setImageFailed(true);
    };
    img.src = currentUrl;
    return () => {
      active = false;
    };
  }, [currentUrl]);

  // Warm the neighbours so paging feels instant.
  useEffect(() => {
    if (!gallery || gallery.images.length < 2) return;
    const length = gallery.images.length;
    [gallery.index + 1, gallery.index - 1].forEach((neighbour) => {
      const image = gallery.images[(neighbour + length) % length];
      if (image && !image.src.startsWith('blob:')) new Image().src = image.src;
    });
  }, [gallery]);

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
    // preventDefault stops the click from focusing the stage; arrow keys need it focused.
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.focus({ preventScroll: true });
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

  // Touch handlers for touchscreen panning
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; // Only single touch
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
  }, [panOffset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault(); // Prevent page scroll
    const touch = e.touches[0];
    setPanOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) return;
    const handled = (() => {
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
          if (!gallery) return false;
          step(1);
          return true;
        case 'ArrowLeft':
        case 'PageUp':
          if (!gallery) return false;
          step(-1);
          return true;
        case 'Home':
          if (!gallery) return false;
          goTo(0);
          return true;
        case 'End':
          if (!gallery) return false;
          goTo(gallery.images.length - 1);
          return true;
        case '+':
        case '=':
          handleZoomIn();
          return true;
        case '-':
          handleZoomOut();
          return true;
        case '1':
          handleReset();
          return true;
        default:
          return false;
      }
    })();
    if (handled) event.preventDefault();
  };

  const hasDroppableData = (event: React.DragEvent) => (
    Array.from(event.dataTransfer.types).some((type) => type === 'Files' || type === 'text/uri-list')
  );

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    dropDepthRef.current = 0;
    setIsDropping(false);
    if (event.dataTransfer.files.length) {
      openFiles(event.dataTransfer.files);
      return;
    }
    const uri = event.dataTransfer.getData('text/uri-list').split('\n').find((line) => line && !line.startsWith('#'));
    if (uri) openAddress(uri);
  };

  const isGallery = Boolean(gallery && gallery.images.length > 1);
  const caption = gallery
    ? [gallery.title, currentImage?.title && currentImage.title !== gallery.title ? currentImage.title : null].filter(Boolean).join(' · ')
    : null;
  const loadingGallery = galleryStatus.state === 'loading';

  const renderStageMessage = () => {
    if (galleryStatus.state === 'loading') {
      return (
        <div className="image-viewer-message" role="status">
          <span>{galleryStatus.message}</span>
        </div>
      );
    }
    if (galleryStatus.state === 'error') {
      return (
        <div className="image-viewer-message" role="alert">
          <strong>Nothing to show</strong>
          <span>{galleryStatus.message}</span>
          <RetroButton size="sm" onClick={() => setGalleryStatus({ state: 'idle' })}>OK</RetroButton>
        </div>
      );
    }
    if (!source) {
      return (
        <div className="image-viewer-message">
          <strong>No image open</strong>
          <span>Paste an image URL or an Are.na channel above, open a file, or drop one here.</span>
          {suggestions.length > 0 && (
            <div className="image-viewer-suggestions" aria-label="Galleries from lok's Are.na">
              {suggestions.map((channel) => (
                <RetroButton
                  key={channel.slug}
                  size="sm"
                  onClick={() => void openArena({ type: 'channel', slug: channel.slug })}
                >
                  {channel.title}
                </RetroButton>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (imageFailed) {
      return (
        <div className="image-viewer-message" role="alert">
          <strong>Can’t show this image</strong>
          <span>The address didn’t return an image the browser can display.</span>
          {isGallery && <RetroButton size="sm" onClick={() => step(1)}>Next image</RetroButton>}
        </div>
      );
    }
    return null;
  };

  return (
    <WindowLayout
      hasPadding={false}
      isScrollable={false}
      className="image-viewer-window"
      toolbar={
        <div className="app-toolbar-stack">
          <div className="app-toolbar-row image-viewer-open-row">
            <form
              className="app-joined-control image-viewer-address"
              onSubmit={(event) => {
                event.preventDefault();
                openAddress(address);
              }}
            >
              <input
                type="text"
                inputMode="url"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  setAddressInvalid(false);
                }}
                placeholder="Image URL or Are.na channel"
                aria-label="Image URL or Are.na link"
                aria-invalid={addressInvalid || undefined}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="search-input text-xs"
              />
              <RetroButton type="submit" size="sm" disabled={loadingGallery} title="Open an image, or an Are.na channel as a gallery">
                {loadingGallery ? 'Reading…' : 'Open'}
              </RetroButton>
            </form>
            <RetroButton size="sm" className="gap-1" title="Open local images" onClick={() => fileInputRef.current?.click()}>
              <FolderOpen className="h-3.5 w-3.5" /> File
            </RetroButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                if (event.target.files) openFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </div>
          <div className="app-toolbar-row justify-between">
            {/* Zoom controls group - no gaps */}
            <div className="app-control-group">
              <RetroButton size="sm" onClick={handleZoomOut} title="Zoom Out (-)">
                −
              </RetroButton>
              <RetroButton size="sm" onClick={handleZoomIn} title="Zoom In (+)">
                +
              </RetroButton>
              <span className="app-readout min-w-[50px]">
                {Math.round(scale * 100)}%
              </span>
              <RetroButton size="sm" onClick={handleReset} title="Reset to 100% (actual size)">
                1:1
              </RetroButton>
            </div>
            {isGallery && gallery && (
              <div className="app-control-group" aria-label="Gallery">
                <RetroButton size="sm" onClick={() => step(-1)} title="Previous image (←)" aria-label="Previous image">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </RetroButton>
                <span className="app-readout image-viewer-counter" aria-live="polite">
                  {gallery.index + 1} / {gallery.images.length}{gallery.truncated ? '+' : ''}
                </span>
                <RetroButton size="sm" onClick={() => step(1)} title="Next image (→)" aria-label="Next image">
                  <ChevronRight className="h-3.5 w-3.5" />
                </RetroButton>
              </div>
            )}
            {/* Fit controls group - aligned right */}
            <div className="app-control-group">
              <RetroButton size="sm" onClick={handleFitWidth} title="Fit Width to Window">
                ↔ W
              </RetroButton>
              <RetroButton size="sm" onClick={handleFitHeight} title="Fit Height to Window">
                ↕ H
              </RetroButton>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="app-footer-row image-viewer-footer text-xs text-muted-foreground gap-2">
          {caption && (
            <span className="image-viewer-caption" title={caption}>
              {caption}
              {currentImage?.arenaUrl && (
                <>
                  {' '}
                  <a href={currentImage.arenaUrl} target="_blank" rel="noopener noreferrer">Are.na ↗</a>
                </>
              )}
            </span>
          )}
          <span className="image-viewer-dims">
            {naturalSize ? (
              <>
                <span>{naturalSize.width} × {naturalSize.height}</span>
                <span className="opacity-50"> @ </span>
                <span>{displayWidth} × {displayHeight} px</span>
              </>
            ) : currentUrl && !imageFailed ? (
              <span>Loading image...</span>
            ) : null}
          </span>
        </div>
      }
    >
      <div
        ref={containerRef}
        className="image-viewer-stage h-full w-full overflow-hidden bg-background relative touch-none"
        style={{ cursor: naturalSize ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        tabIndex={0}
        aria-label={isGallery ? 'Image. Arrow keys page through the gallery.' : 'Image'}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragEnter={(event) => {
          if (!hasDroppableData(event)) return;
          dropDepthRef.current += 1;
          setIsDropping(true);
        }}
        onDragOver={(event) => {
          if (!hasDroppableData(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={() => {
          dropDepthRef.current = Math.max(0, dropDepthRef.current - 1);
          if (dropDepthRef.current === 0) setIsDropping(false);
        }}
        onDrop={handleDrop}
      >
        {naturalSize && currentUrl && !imageFailed && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
          >
            <img
              src={currentUrl}
              alt={currentImage?.title || 'Viewed content'}
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
        {renderStageMessage()}
        {isDropping && (
          <div className="image-viewer-dropzone" aria-hidden="true">
            <span>Drop to open</span>
          </div>
        )}
      </div>
    </WindowLayout>
  );
};

export default ImageViewerApp;
