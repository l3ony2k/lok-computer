import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  FolderOpen,
  ListMusic,
  Maximize2,
  Pause,
  PictureInPicture2,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DEFAULT_LIBRARY,
  DEFAULT_PLAYER_STATE,
  createMediaItem,
  formatMediaTime,
  inferMediaKind,
  mergeIntoPlaylist,
  normalizeMediaUrl,
  normalizePlayerState,
  pickNextIndex,
  type MediaItem,
  type MediaPlayerState,
  shouldLoopShortVideo,
} from './mediaLibrary';
import { arenaBlockToMediaItem, parseArenaReference, type ArenaReference } from '@/apps/arena/utils/arenaLinks';
import { collectFromArena, describeArenaError, isAbortError } from '@/apps/arena/utils/arenaImport';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';
import { useAudioGraph } from './useAudioGraph';
import './media-player.css';

interface IncomingRequest {
  id?: unknown;
  play?: unknown;
  items?: unknown;
  /** An Are.na channel or block link to import. */
  arena?: unknown;
  /** Stop after the requested item instead of continuing down the queue. */
  once?: unknown;
}

interface MediaPlayerAppProps {
  /** One-shot launch request from another app or a deep link. */
  request?: IncomingRequest;
  onPropsChange?: (props: Record<string, unknown>) => void;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const STORAGE_KEY = 'app:media-player';
const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.5, 0.75];
const SEEK_STEP = 5;
const POSITION_SAVE_INTERVAL_MS = 5000;
/** Playable blocks taken from one Are.na channel. */
const ARENA_IMPORT_LIMIT = 200;

const describeMediaError = (element: HTMLMediaElement | null) => {
  switch (element?.error?.code) {
    case MediaError.MEDIA_ERR_ABORTED: return 'Playback was aborted.';
    case MediaError.MEDIA_ERR_NETWORK: return 'A network error interrupted playback.';
    case MediaError.MEDIA_ERR_DECODE: return 'This file could not be decoded.';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: return 'This format or source is not supported by the browser.';
    default: return 'This source could not be played.';
  }
};

/** Accepts loosely typed request items from routes and other apps. */
const sanitizeRequestItems = (items: unknown): MediaItem[] => {
  if (!Array.isArray(items)) return [];
  return items.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const candidate = raw as Partial<MediaItem>;
    const src = typeof candidate.src === 'string' ? normalizeMediaUrl(candidate.src) : null;
    if (!src) return [];
    return [createMediaItem(src, {
      title: typeof candidate.title === 'string' ? candidate.title : undefined,
      artist: typeof candidate.artist === 'string' ? candidate.artist : undefined,
      kind: candidate.kind === 'audio' || candidate.kind === 'video' ? candidate.kind : undefined,
      credit: typeof candidate.credit === 'string' ? candidate.credit : undefined,
      sourceUrl: typeof candidate.sourceUrl === 'string' ? candidate.sourceUrl : undefined,
      origin: 'app',
    })];
  });
};

const isEditableTarget = (target: EventTarget | null) => (
  target instanceof HTMLElement
  && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
);

/** Buttons already activate on Space and Enter; the shortcut must not fire twice. */
const activatesNatively = (target: EventTarget | null, key: string) => (
  target instanceof HTMLElement && target.tagName === 'BUTTON' && (key === ' ' || key === 'enter')
);

export const MediaPlayerApp: React.FC<MediaPlayerAppProps> = ({ request, onPropsChange }) => {
  const isMobile = useIsMobile();
  const [state, setState, stateLoading] = usePersistedState<MediaPlayerState>({
    key: STORAGE_KEY,
    defaultValue: DEFAULT_PLAYER_STATE,
    debounceMs: 400,
    normalize: (stored, fallback) => normalizePlayerState(stored, fallback),
  });
  const { analyser, attach, detach, isAttached } = useAudioGraph();

  const [mediaElement, setMediaElement] = useState<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /** Items whose host rejected CORS; they replay without the analyzer. */
  const [plainSources, setPlainSources] = useState<Record<string, true>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlInvalid, setUrlInvalid] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playIntentRef = useRef(false);
  const resumeAtRef = useRef<number | null>(null);
  const restoredRef = useRef(false);
  const objectUrlsRef = useRef(new Set<string>());
  const dragDepthRef = useRef(0);
  const importRef = useRef<AbortController | null>(null);
  /** Latest state for async work (Are.na imports) that outlives the render it began in. */
  const stateRef = useRef(state);
  stateRef.current = state;

  const { playlist, currentId, volume, muted, repeat, shuffle, rate, showPlaylist, holdId } = state;
  const currentIndex = playlist.findIndex((item) => item.id === currentId);
  const current = currentIndex >= 0 ? playlist[currentIndex] : null;
  const usesCors = Boolean(current && !current.src.startsWith('blob:') && !plainSources[current.id]);
  const analyzerAvailable = Boolean(current && isAttached(mediaElement));

  // Resume the saved position once, when persisted state first arrives.
  useEffect(() => {
    if (stateLoading || restoredRef.current) return;
    restoredRef.current = true;
    if (state.position > 0) resumeAtRef.current = state.position;
  }, [state.position, stateLoading]);

  // Share Window and session restore describe the current item.
  useEffect(() => {
    if (!current || current.origin === 'file') return;
    onPropsChange?.({ nowPlaying: { src: current.src, title: current.title } });
  }, [current, onPropsChange]);

  useEffect(() => {
    if (!mediaElement) return;
    mediaElement.volume = volume;
    mediaElement.muted = muted;
    mediaElement.playbackRate = rate;
  }, [mediaElement, muted, rate, volume]);

  // Reset readouts only when the item changes; metadata updates keep the position.
  const currentKey = current?.id ?? null;
  const knownDurationRef = useRef(0);
  knownDurationRef.current = current?.duration ?? 0;
  useEffect(() => {
    setCurrentTime(0);
    setDuration(knownDurationRef.current);
    setBuffered(0);
    setErrorMessage(null);
    setLoadState(currentKey ? 'loading' : 'idle');
  }, [currentKey]);

  // Object URLs belong to this window; release them when it closes.
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const savePosition = useCallback((position: number) => {
    setState((prev) => (Math.abs(prev.position - position) < 0.5 ? prev : { ...prev, position }));
  }, [setState]);

  const startPlayback = useCallback(() => {
    const element = mediaElement;
    if (!element || !current) return;
    playIntentRef.current = false;
    // play() runs first, inside the gesture; the analyzer joins once its context is running.
    const playing = element.play();
    if (usesCors || current.src.startsWith('blob:')) void attach(element);
    void playing?.catch((error: unknown) => {
      // Autoplay policies reject without a gesture; the play button retries.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.warn('[App:Media] Playback was blocked:', error);
      setIsPlaying(false);
    });
  }, [attach, current, mediaElement, usesCors]);

  const pausePlayback = useCallback(() => {
    if (!mediaElement) return;
    mediaElement.pause();
    savePosition(mediaElement.currentTime);
  }, [mediaElement, savePosition]);

  const togglePlayback = useCallback(() => {
    if (!mediaElement || !current) return;
    if (mediaElement.paused) startPlayback();
    else pausePlayback();
  }, [current, mediaElement, pausePlayback, startPlayback]);

  const stopPlayback = useCallback(() => {
    if (!mediaElement) return;
    mediaElement.pause();
    mediaElement.currentTime = 0;
    setCurrentTime(0);
    savePosition(0);
  }, [mediaElement, savePosition]);

  const playItem = useCallback((id: string, autoplay = true) => {
    resumeAtRef.current = null;
    playIntentRef.current = autoplay;
    setSelectedId(id);
    if (id === currentId) {
      if (mediaElement) mediaElement.currentTime = 0;
      if (autoplay) startPlayback();
      return;
    }
    // Choosing another item lifts a one-shot request's hold on the queue.
    setState((prev) => ({ ...prev, currentId: id, position: 0, holdId: prev.holdId === id ? prev.holdId : null }));
  }, [currentId, mediaElement, setState, startPlayback]);

  // Reads an Are.na channel or block in the background and queues what plays.
  const playItemRef = useRef(playItem);
  playItemRef.current = playItem;
  const importFromArena = useCallback(async (reference: ArenaReference, autoplay: boolean) => {
    importRef.current?.abort();
    const controller = new AbortController();
    importRef.current = controller;
    const toastId = 'media-arena-import';
    const noun = reference.type === 'channel' ? 'channel' : 'block';
    setImporting(true);
    toast.loading(`Reading the Are.na ${noun}…`, { id: toastId });
    try {
      const result = await collectFromArena(reference, arenaBlockToMediaItem, {
        limit: ARENA_IMPORT_LIMIT,
        signal: controller.signal,
        onProgress: ({ scanned, total, found }) => {
          toast.loading(`Reading Are.na… ${scanned} of ${total} blocks, ${found} playable`, { id: toastId });
        },
      });
      if (controller.signal.aborted) return;
      if (!result.items.length) {
        toast.error(reference.type === 'channel'
          ? `“${result.title}” has no audio or video blocks.`
          : `“${result.title}” isn’t audio or video.`, { id: toastId });
        return;
      }

      const { firstId, added } = mergeIntoPlaylist(stateRef.current.playlist, result.items);
      setState((prev) => ({ ...prev, playlist: mergeIntoPlaylist(prev.playlist, result.items).playlist }));
      if (firstId && (autoplay || !stateRef.current.currentId)) playItemRef.current(firstId, autoplay);

      const count = result.items.length;
      const what = `${count} ${count === 1 ? 'item' : 'items'}`;
      const from = reference.type === 'channel' ? ` from “${result.title}”` : '';
      toast.success(added === 0
        ? `Already in the playlist: ${what}${from}.`
        : `Added ${added === count ? what : `${added} of ${what}`}${from}${result.truncated ? ` (first ${count})` : ''}.`, { id: toastId });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        toast.dismiss(toastId);
        return;
      }
      console.warn('[App:Media] Are.na import failed:', error);
      toast.error(describeArenaError(error, reference), { id: toastId });
    } finally {
      if (importRef.current === controller) {
        importRef.current = null;
        setImporting(false);
      }
    }
  }, [setState]);
  const importFromArenaRef = useRef(importFromArena);
  importFromArenaRef.current = importFromArena;

  // An import belongs to this window; stop reading when it closes.
  useEffect(() => () => importRef.current?.abort(), []);

  // Apply launch requests exactly once, even across window restores.
  useEffect(() => {
    if (stateLoading || !request || typeof request.id !== 'string') return;
    const requestId = request.id;
    if (state.handledRequests.includes(requestId)) return;

    const incoming = sanitizeRequestItems(request.items);
    const wantsPlay = request.play !== false && incoming.length > 0;
    const target = incoming.length ? state.playlist.find((item) => item.src === incoming[0].src) : undefined;
    setState((prev) => {
      const { playlist: nextPlaylist, firstId } = mergeIntoPlaylist(prev.playlist, incoming);
      return {
        ...prev,
        playlist: nextPlaylist,
        currentId: wantsPlay && firstId ? firstId : prev.currentId,
        position: wantsPlay && firstId ? 0 : prev.position,
        holdId: wantsPlay && firstId ? (request.once === true ? firstId : null) : prev.holdId,
        handledRequests: [...prev.handledRequests, requestId].slice(-20),
      };
    });
    const arenaReference = typeof request.arena === 'string' ? parseArenaReference(request.arena) : null;
    if (arenaReference) void importFromArenaRef.current(arenaReference, request.play !== false);
    if (!wantsPlay) return;
    resumeAtRef.current = null;
    playIntentRef.current = true;
    // The current item keeps its element, so no mount will pick up the intent.
    if (target && target.id === state.currentId && mediaElement?.isConnected) {
      mediaElement.currentTime = 0;
      startPlayback();
    }
  }, [mediaElement, request, setState, startPlayback, state.currentId, state.handledRequests, state.playlist, stateLoading]);

  // A newly mounted element starts as soon as playback was asked for. play() also
  // kicks off loading where preload is ignored (iOS), so it can't wait for canplay.
  useEffect(() => {
    if (!mediaElement || !current || !playIntentRef.current) return;
    if (!mediaElement.isConnected || mediaElement.getAttribute('src') !== current.src) return;
    startPlayback();
  }, [current, mediaElement, startPlayback]);

  const step = useCallback((direction: 1 | -1, fromEnded = false) => {
    if (!playlist.length) return;
    // Previous restarts the current item first, like a hardware deck.
    if (direction === -1 && !fromEnded && mediaElement && mediaElement.currentTime > 3) {
      mediaElement.currentTime = 0;
      return;
    }
    const next = pickNextIndex(
      playlist.length,
      Math.max(0, currentIndex),
      direction,
      // Manual skips always wrap; only the end of a track honors repeat-off.
      { repeat: fromEnded ? repeat : 'all', shuffle },
    );
    if (next === null) {
      stopPlayback();
      return;
    }
    // Skipping while paused only moves the cursor, as on a cassette deck.
    playItem(playlist[next].id, fromEnded || Boolean(mediaElement && !mediaElement.paused));
  }, [currentIndex, mediaElement, playItem, playlist, repeat, shuffle, stopPlayback]);

  const seekTo = useCallback((seconds: number) => {
    if (!mediaElement || !Number.isFinite(seconds)) return;
    const limit = Number.isFinite(mediaElement.duration) ? mediaElement.duration : seconds;
    mediaElement.currentTime = Math.max(0, Math.min(limit, seconds));
    setCurrentTime(mediaElement.currentTime);
  }, [mediaElement]);

  const updateState = useCallback((patch: Partial<MediaPlayerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, [setState]);

  const addItems = useCallback((items: MediaItem[], autoplay: boolean) => {
    if (!items.length) return;
    setState((prev) => ({
      ...prev,
      playlist: [...prev.playlist, ...items],
      currentId: autoplay || !prev.currentId ? items[0].id : prev.currentId,
      position: autoplay || !prev.currentId ? 0 : prev.position,
    }));
    if (autoplay) {
      resumeAtRef.current = null;
      playIntentRef.current = true;
    }
  }, [setState]);

  const idle = !isPlaying;

  const addFiles = useCallback((files: FileList | File[]) => {
    const items = Array.from(files).flatMap((file) => {
      const kind = inferMediaKind(file.name, file.type) ?? inferMediaKind(file.name);
      if (!kind) return [];
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return [createMediaItem(url, {
        title: file.name.replace(/\.[a-z0-9]{2,5}$/i, ''),
        kind,
        origin: 'file',
        artist: 'Local file',
      })];
    });
    if (!items.length) {
      toast.error('Those files are not audio or video.');
      return;
    }
    addItems(items, idle);
  }, [addItems, idle]);

  const addUrl = useCallback((value: string) => {
    const arenaReference = parseArenaReference(value);
    if (arenaReference) {
      setUrlInvalid(false);
      void importFromArena(arenaReference, idle);
      return true;
    }
    const url = normalizeMediaUrl(value);
    if (!url) {
      setUrlInvalid(true);
      toast.error('Enter a media file address or an Are.na channel or block link.');
      return false;
    }
    setUrlInvalid(false);
    const existing = playlist.find((item) => item.src === url);
    if (existing) {
      playItem(existing.id);
      return true;
    }
    addItems([createMediaItem(url, { origin: 'url' })], idle);
    return true;
  }, [addItems, idle, importFromArena, playItem, playlist]);

  const removeItem = useCallback((id: string) => {
    const item = playlist.find((candidate) => candidate.id === id);
    if (!item) return;
    if (item.src.startsWith('blob:')) {
      URL.revokeObjectURL(item.src);
      objectUrlsRef.current.delete(item.src);
    }
    setState((prev) => {
      const index = prev.playlist.findIndex((candidate) => candidate.id === id);
      const nextPlaylist = prev.playlist.filter((candidate) => candidate.id !== id);
      const nextCurrent = prev.currentId === id
        ? nextPlaylist[Math.min(index, nextPlaylist.length - 1)]?.id ?? null
        : prev.currentId;
      return { ...prev, playlist: nextPlaylist, currentId: nextCurrent, position: prev.currentId === id ? 0 : prev.position };
    });
    if (selectedId === id) setSelectedId(null);
  }, [playlist, selectedId, setState]);

  const restoreLibrary = useCallback(() => {
    setState((prev) => {
      const missing = DEFAULT_LIBRARY.filter((item) => !prev.playlist.some((candidate) => candidate.src === item.src));
      const nextPlaylist = [...prev.playlist, ...missing];
      return { ...prev, playlist: nextPlaylist, currentId: prev.currentId ?? nextPlaylist[0]?.id ?? null };
    });
  }, [setState]);

  const clearPlaylist = useCallback(() => {
    mediaElement?.pause();
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    setState((prev) => ({ ...prev, playlist: [], currentId: null, position: 0 }));
    setSelectedId(null);
  }, [mediaElement, setState]);

  // Persist the resume point periodically while playing.
  useEffect(() => {
    if (!isPlaying || !mediaElement) return;
    const timer = window.setInterval(() => savePosition(mediaElement.currentTime), POSITION_SAVE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, mediaElement, savePosition]);

  // OS media keys, lock screen, and notification controls.
  const sessionHandlers = useRef({ startPlayback, pausePlayback, step, seekTo, stopPlayback, mediaElement });
  sessionHandlers.current = { startPlayback, pausePlayback, step, seekTo, stopPlayback, mediaElement };
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => sessionHandlers.current.startPlayback()],
      ['pause', () => sessionHandlers.current.pausePlayback()],
      ['stop', () => sessionHandlers.current.stopPlayback()],
      ['previoustrack', () => sessionHandlers.current.step(-1)],
      ['nexttrack', () => sessionHandlers.current.step(1)],
      ['seekbackward', (details) => {
        const element = sessionHandlers.current.mediaElement;
        if (element) sessionHandlers.current.seekTo(element.currentTime - (details.seekOffset ?? SEEK_STEP * 2));
      }],
      ['seekforward', (details) => {
        const element = sessionHandlers.current.mediaElement;
        if (element) sessionHandlers.current.seekTo(element.currentTime + (details.seekOffset ?? SEEK_STEP * 2));
      }],
      ['seekto', (details) => {
        if (details.seekTime !== undefined) sessionHandlers.current.seekTo(details.seekTime);
      }],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Older browsers reject unknown actions.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // Ignore unsupported actions on teardown.
        }
      }
      session.metadata = null;
    };
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = current
      ? new MediaMetadata({
        title: current.title,
        artist: current.artist ?? 'lok.computer',
        album: 'lok.computer media',
        artwork: [{ src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' }],
      })
      : null;
  }, [current]);

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  const toggleFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.requestFullscreen?.().catch(() => undefined);
  }, []);

  const togglePictureInPicture = useCallback(() => {
    if (!mediaElement || current?.kind !== 'video') return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture();
    else void mediaElement.requestPictureInPicture?.().catch(() => undefined);
  }, [current?.kind, mediaElement]);

  const cycleRate = () => {
    const index = PLAYBACK_RATES.indexOf(rate);
    updateState({ rate: PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length] });
  };

  const cycleRepeat = () => {
    updateState({ repeat: repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off' });
  };

  // The track list is one tab stop; arrows move the selection (listbox pattern).
  const tracksId = useId();
  const trackOptionId = (index: number) => `${tracksId}-track-${index}`;
  const selectedIndex = playlist.findIndex((item) => item.id === selectedId);

  const handleTracksKeyDown = (event: React.KeyboardEvent<HTMLOListElement>) => {
    if (event.target !== event.currentTarget || !playlist.length) return;
    const last = playlist.length - 1;
    const anchorIndex = selectedIndex >= 0 ? selectedIndex : Math.max(0, currentIndex);
    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = selectedIndex < 0 ? anchorIndex : Math.min(last, anchorIndex + 1); break;
      case 'ArrowUp': next = selectedIndex < 0 ? anchorIndex : Math.max(0, anchorIndex - 1); break;
      case 'Home': next = 0; break;
      case 'End': next = last; break;
      default: return;
    }
    // Keep arrows from reaching the window's seek and volume shortcuts.
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(playlist[next].id);
    document.getElementById(trackOptionId(next))?.scrollIntoView({ block: 'nearest' });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (isEditableTarget(event.target) || activatesNatively(event.target, key)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const handled = (() => {
      switch (key) {
        case ' ':
        case 'k': togglePlayback(); return true;
        case 'arrowleft': seekTo(currentTime - SEEK_STEP); return true;
        case 'arrowright': seekTo(currentTime + SEEK_STEP); return true;
        case 'arrowup': updateState({ volume: Math.min(1, Math.round((volume + 0.05) * 100) / 100), muted: false }); return true;
        case 'arrowdown': updateState({ volume: Math.max(0, Math.round((volume - 0.05) * 100) / 100) }); return true;
        case 'm': updateState({ muted: !muted }); return true;
        case 'n': step(1); return true;
        case 'p': step(-1); return true;
        case 'f': toggleFullscreen(); return true;
        case 'l': updateState({ showPlaylist: !showPlaylist }); return true;
        case 'enter':
          if (selectedId) {
            playItem(selectedId);
            return true;
          }
          return false;
        case 'delete':
        case 'backspace':
          if (selectedId) {
            removeItem(selectedId);
            return true;
          }
          return false;
        default: return false;
      }
    })();
    if (handled) event.preventDefault();
  };

  const hasDraggableData = (event: React.DragEvent) => (
    Array.from(event.dataTransfer.types).some((type) => type === 'Files' || type === 'text/uri-list')
  );

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (event.dataTransfer.files.length) {
      addFiles(event.dataTransfer.files);
      return;
    }
    const uri = event.dataTransfer.getData('text/uri-list').split('\n').find((line) => line && !line.startsWith('#'));
    if (uri) addUrl(uri);
  };

  const totalDuration = useMemo(
    () => playlist.reduce((sum, item) => sum + (item.duration ?? 0), 0),
    [playlist],
  );
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const loopsShort = shouldLoopShortVideo(current?.kind, duration);
  const playsOnce = Boolean(current) && holdId === current?.id;
  const statusGlyph = errorMessage ? '!' : isPlaying ? '▶' : loadState === 'loading' && playIntentRef.current ? '…' : '❚❚';

  return (
    <div className="media-player-root" onKeyDown={handleKeyDown}>
      <WindowLayout
        className="media-player-window"
        hasPadding={false}
        isScrollable={false}
        toolbar={(
          <div className="app-toolbar-row media-player-toolbar">
            <form
              className="app-joined-control media-player-address"
              onSubmit={(event) => {
                event.preventDefault();
                if (addUrl(urlInput)) setUrlInput('');
              }}
            >
              <input
                type="url"
                inputMode="url"
                value={urlInput}
                onChange={(event) => {
                  setUrlInput(event.target.value);
                  setUrlInvalid(false);
                }}
                placeholder="Media URL or Are.na channel"
                aria-label="Media URL or Are.na link"
                aria-invalid={urlInvalid || undefined}
                className="search-input text-xs"
              />
              <RetroButton
                type="submit"
                size="sm"
                className="gap-1"
                title="Add to playlist. Are.na channel and block links queue their audio and video."
                disabled={importing}
              >
                <Plus className="h-3.5 w-3.5" /> {importing ? 'Reading…' : 'Add'}
              </RetroButton>
            </form>
            <RetroButton size="sm" className="gap-1" title="Open local audio or video files" onClick={() => fileInputRef.current?.click()}>
              <FolderOpen className="h-3.5 w-3.5" /> Open
            </RetroButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              multiple
              hidden
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </div>
        )}
        footer={(
          <div className="app-toolbar-stack media-player-controls">
            <div className="app-footer-row media-player-seek-row">
              <span className="app-readout media-player-time">{formatMediaTime(currentTime)}</span>
              <input
                type="range"
                className="media-player-seek"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                disabled={!duration}
                onChange={(event) => seekTo(Number(event.target.value))}
                aria-label="Seek"
                aria-valuetext={`${formatMediaTime(currentTime)} of ${formatMediaTime(duration)}`}
                style={{ '--media-progress': `${progress}%`, '--media-buffered': `${bufferedPercent}%` } as React.CSSProperties}
              />
              <span className="app-readout media-player-time">{formatMediaTime(duration)}</span>
            </div>
            <div className="app-footer-row media-player-transport-row">
              <div className="app-control-group">
                <RetroButton size="sm" title="Previous (P)" aria-label="Previous" onClick={() => step(-1)} disabled={!playlist.length}>
                  <SkipBack className="h-3.5 w-3.5" />
                </RetroButton>
                <RetroButton
                  size="sm"
                  className="media-player-play"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  onClick={togglePlayback}
                  disabled={!current}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </RetroButton>
                <RetroButton size="sm" title="Stop" aria-label="Stop" onClick={stopPlayback} disabled={!current}>
                  <Square className="h-3 w-3" />
                </RetroButton>
                <RetroButton size="sm" title="Next (N)" aria-label="Next" onClick={() => step(1)} disabled={!playlist.length}>
                  <SkipForward className="h-3.5 w-3.5" />
                </RetroButton>
              </div>
              <div className="app-control-group">
                <RetroButton
                  size="sm"
                  active={repeat !== 'off'}
                  title={`Repeat: ${repeat}`}
                  aria-label={`Repeat ${repeat}`}
                  onClick={cycleRepeat}
                >
                  <RepeatIcon className="h-3.5 w-3.5" />
                </RetroButton>
                <RetroButton
                  size="sm"
                  active={shuffle}
                  title={`Shuffle: ${shuffle ? 'on' : 'off'}`}
                  aria-label="Shuffle"
                  aria-pressed={shuffle}
                  onClick={() => updateState({ shuffle: !shuffle })}
                >
                  <Shuffle className="h-3.5 w-3.5" />
                </RetroButton>
              </div>
              <span className="media-player-spacer" />
              <RetroButton size="sm" className="media-player-rate" title="Playback speed" onClick={cycleRate}>
                {rate.toFixed(rate % 1 === 0 ? 1 : 2)}×
              </RetroButton>
              <div className="app-control-group media-player-volume">
                <RetroButton
                  size="sm"
                  title={muted ? 'Unmute (M)' : 'Mute (M)'}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  onClick={() => updateState({ muted: !muted })}
                >
                  <VolumeIcon className="h-3.5 w-3.5" />
                </RetroButton>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(event) => updateState({ volume: Number(event.target.value), muted: false })}
                  aria-label="Volume"
                  className="media-player-volume-slider"
                  style={{ '--media-progress': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
                />
              </div>
              <div className="app-control-group media-player-view-controls">
                {current?.kind === 'video' && document.pictureInPictureEnabled && (
                  <RetroButton size="sm" title="Picture in picture" aria-label="Picture in picture" onClick={togglePictureInPicture}>
                    <PictureInPicture2 className="h-3.5 w-3.5" />
                  </RetroButton>
                )}
                <RetroButton size="sm" title="Full screen (F)" aria-label="Full screen" onClick={toggleFullscreen} disabled={!current}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </RetroButton>
                <RetroButton
                  size="sm"
                  active={showPlaylist}
                  title="Playlist (L)"
                  aria-label="Playlist"
                  aria-pressed={showPlaylist}
                  onClick={() => updateState({ showPlaylist: !showPlaylist })}
                >
                  <ListMusic className="h-3.5 w-3.5" />
                </RetroButton>
              </div>
            </div>
          </div>
        )}
      >
        <div
          className="media-player-body"
          data-playlist={showPlaylist || undefined}
          tabIndex={-1}
          onDragEnter={(event) => {
            if (!hasDraggableData(event)) return;
            dragDepthRef.current += 1;
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            if (!hasDraggableData(event)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={() => {
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) setIsDragging(false);
          }}
          onDrop={handleDrop}
        >
          <div
            ref={stageRef}
            className="media-player-stage"
            data-kind={current?.kind}
            data-playing={isPlaying || undefined}
            onDoubleClick={toggleFullscreen}
          >
            {current && (
              <video
                key={`${current.id}:${usesCors ? 'cors' : 'plain'}`}
                ref={setMediaElement}
                className="media-player-video"
                src={current.src}
                crossOrigin={usesCors ? 'anonymous' : undefined}
                preload="metadata"
                playsInline
                loop={loopsShort}
                onClick={togglePlayback}
                onLoadedMetadata={(event) => {
                  const element = event.currentTarget;
                  const resumeAt = resumeAtRef.current;
                  resumeAtRef.current = null;
                  if (resumeAt && Number.isFinite(element.duration) && resumeAt < element.duration - 1) {
                    element.currentTime = resumeAt;
                  }
                  if (Number.isFinite(element.duration)) {
                    setDuration(element.duration);
                    if (Math.abs((current.duration ?? 0) - element.duration) > 0.5) {
                      setState((prev) => ({
                        ...prev,
                        playlist: prev.playlist.map((item) => (
                          item.id === current.id ? { ...item, duration: element.duration } : item
                        )),
                      }));
                    }
                  }
                }}
                onCanPlay={() => setLoadState('ready')}
                onWaiting={() => setLoadState('loading')}
                onPlaying={() => setLoadState('ready')}
                onPlay={() => setIsPlaying(true)}
                onPause={(event) => {
                  setIsPlaying(false);
                  savePosition(event.currentTarget.currentTime);
                }}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onProgress={(event) => {
                  const ranges = event.currentTarget.buffered;
                  if (ranges.length) setBuffered(ranges.end(ranges.length - 1));
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  if (repeat === 'one' && mediaElement) {
                    mediaElement.currentTime = 0;
                    startPlayback();
                    return;
                  }
                  // A clip opened from another app ends here; nobody asked for the rest of the queue.
                  if (holdId === current.id) {
                    if (mediaElement) mediaElement.currentTime = 0;
                    savePosition(0);
                    return;
                  }
                  step(1, true);
                }}
                onError={(event) => {
                  const element = event.currentTarget;
                  if (usesCors) {
                    // Hosts without CORS still play; only the analyzer is lost.
                    detach(element);
                    playIntentRef.current = playIntentRef.current || !element.paused;
                    setPlainSources((prev) => ({ ...prev, [current.id]: true }));
                    return;
                  }
                  setLoadState('error');
                  setIsPlaying(false);
                  setErrorMessage(describeMediaError(element));
                }}
              />
            )}

            {current?.kind === 'audio' && (
              <SpectrumAnalyzer analyser={analyzerAvailable ? analyser : null} playing={isPlaying} />
            )}

            {current ? (
              <div className="media-player-lcd" aria-live="polite">
                <span className="media-player-lcd-status" aria-hidden="true">{statusGlyph}</span>
                <span className="media-player-lcd-text">
                  <strong>{current.title}</strong>
                  <small>
                    {[current.artist, current.kind === 'video' ? 'Video' : 'Audio'].filter(Boolean).join(' · ')}
                    {current.credit && (
                      <>
                        {' · '}
                        {current.sourceUrl
                          ? <a href={current.sourceUrl} target="_blank" rel="noopener noreferrer">{current.credit}</a>
                          : current.credit}
                      </>
                    )}
                  </small>
                </span>
                <span className="media-player-lcd-readouts">
                  {loopsShort && (
                    <span className="media-player-lcd-meta" title="Clips this short loop, like a GIF">LOOP</span>
                  )}
                  {!loopsShort && playsOnce && (
                    <span className="media-player-lcd-meta" title="Opened from another app: plays once, then stops">ONCE</span>
                  )}
                  <span
                    className="media-player-lcd-meta"
                    title={current.kind === 'audio' && isPlaying && !analyzerAvailable
                      ? 'This host does not allow audio analysis (no CORS), so the spectrum is off.'
                      : 'Playback speed'}
                  >
                    {current.kind === 'audio' && isPlaying && !analyzerAvailable ? 'NO SCOPE' : `${rate}×`}
                  </span>
                </span>
              </div>
            ) : (
              <div className="media-player-empty">
                <strong>No media loaded</strong>
                <span>Paste a media URL or an Are.na channel, open files, or drop them here.</span>
                <RetroButton size="sm" onClick={restoreLibrary}>Load the starter library</RetroButton>
              </div>
            )}

            {errorMessage && (
              <div className="media-player-error" role="alert">
                <strong>Can’t play “{current?.title}”</strong>
                <span>{errorMessage}</span>
                <div className="media-player-error-actions">
                  {playlist.length > 1 && <RetroButton size="sm" onClick={() => step(1)}>Skip</RetroButton>}
                  {current && <RetroButton size="sm" onClick={() => removeItem(current.id)}>Remove</RetroButton>}
                </div>
              </div>
            )}
          </div>

          {showPlaylist && (
            <section className="media-player-playlist" aria-label="Playlist">
              <header className="media-player-playlist-header">
                <span>
                  {playlist.length} {playlist.length === 1 ? 'item' : 'items'}
                  {totalDuration > 0 && ` · ${formatMediaTime(totalDuration)}`}
                </span>
                <span className="media-player-playlist-actions">
                  <RetroButton size="sm" onClick={restoreLibrary} title="Add the starter library">Library</RetroButton>
                  <RetroButton size="sm" onClick={clearPlaylist} disabled={!playlist.length} title="Remove every item">Clear</RetroButton>
                </span>
              </header>
              {playlist.length === 0 ? (
                <p className="media-player-playlist-empty">Drop audio or video files or Are.na links here.</p>
              ) : (
                <ol
                  className="media-player-tracks"
                  role="listbox"
                  aria-label="Tracks"
                  tabIndex={0}
                  aria-activedescendant={selectedIndex >= 0 ? trackOptionId(selectedIndex) : undefined}
                  onKeyDown={handleTracksKeyDown}
                  onFocus={(event) => {
                    if (event.target === event.currentTarget && selectedIndex < 0) {
                      setSelectedId(current?.id ?? playlist[0].id);
                    }
                  }}
                >
                  {playlist.map((item, index) => {
                    const isCurrent = item.id === currentId;
                    return (
                      <li
                        key={item.id}
                        id={trackOptionId(index)}
                        role="option"
                        aria-selected={selectedId === item.id}
                        className="media-player-track"
                        data-current={isCurrent || undefined}
                        data-selected={selectedId === item.id || undefined}
                        onClick={() => (isMobile ? playItem(item.id) : setSelectedId(item.id))}
                        onDoubleClick={() => playItem(item.id)}
                        title={item.artist ? `${item.title} — ${item.artist}` : item.title}
                      >
                        <span className="media-player-track-index" aria-hidden="true">
                          {isCurrent ? (isPlaying ? '▶' : '❚❚') : index + 1}
                        </span>
                        <span className="media-player-track-text">
                          <strong>{item.title}</strong>
                          {item.artist && <small>{item.artist}</small>}
                        </span>
                        <span className="media-player-track-kind">{item.kind === 'video' ? 'VID' : 'AUD'}</span>
                        <span className="media-player-track-time">{formatMediaTime(item.duration)}</span>
                        <button
                          type="button"
                          className="media-player-track-remove"
                          aria-label={`Remove ${item.title}`}
                          title="Remove"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeItem(item.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}

          {isDragging && (
            <div className="media-player-dropzone" aria-hidden="true">
              <span>Drop to add to the playlist</span>
            </div>
          )}
        </div>
      </WindowLayout>
    </div>
  );
};

export default MediaPlayerApp;
