import { useCallback, useEffect, useRef, useState } from 'react';

type AudioContextConstructor = typeof AudioContext;

const getAudioContextConstructor = (): AudioContextConstructor | null => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
    ?? null;
};

/**
 * Lazily routes media elements through one AnalyserNode.
 *
 * An element is only connected while the context is running: a connected
 * element is silent whenever its context is suspended, and a cross-origin
 * element without CORS is silent forever. Callers therefore attach only
 * same-origin or CORS-approved elements, after calling play() inside the
 * gesture. attach() never blocks playback: without user activation resume()
 * stays pending, and the element keeps playing directly until it settles.
 */
export const useAudioGraph = () => {
  const contextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef(new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>());
  const pendingRef = useRef(new WeakMap<HTMLMediaElement, Promise<boolean>>());
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Attachment lives in refs; bumping this re-renders readers of isAttached.
  const [, setRevision] = useState(0);

  const attach = useCallback((element: HTMLMediaElement): Promise<boolean> => {
    const AudioContextImpl = getAudioContextConstructor();
    if (!AudioContextImpl) return Promise.resolve(false);

    let context: AudioContext;
    let resumed: Promise<void>;
    try {
      if (!contextRef.current) {
        const created = new AudioContextImpl();
        const node = created.createAnalyser();
        node.fftSize = 2048;
        node.smoothingTimeConstant = 0.72;
        node.connect(created.destination);
        contextRef.current = created;
        analyserRef.current = node;
        setAnalyser(node);
      }
      context = contextRef.current;
      // Resume even for attached elements: after an interruption they play silently until it runs.
      resumed = context.state === 'running' ? Promise.resolve() : context.resume();
    } catch (error) {
      console.warn('[App:Media] Audio analysis unavailable:', error);
      return Promise.resolve(false);
    }

    if (sourcesRef.current.has(element)) return resumed.then(() => true, () => true);
    const pending = pendingRef.current.get(element);
    if (pending) return pending;

    const connection = resumed
      .then(() => {
        if (sourcesRef.current.has(element)) return true;
        if (context !== contextRef.current || context.state !== 'running' || !analyserRef.current) return false;
        const source = context.createMediaElementSource(element);
        source.connect(analyserRef.current);
        sourcesRef.current.set(element, source);
        setRevision((value) => value + 1);
        return true;
      })
      .catch((error: unknown) => {
        console.warn('[App:Media] Audio analysis unavailable:', error);
        return false;
      })
      .finally(() => pendingRef.current.delete(element));
    pendingRef.current.set(element, connection);
    return connection;
  }, []);

  const detach = useCallback((element: HTMLMediaElement | null) => {
    if (!element) return;
    const source = sourcesRef.current.get(element);
    if (!source) return;
    source.disconnect();
    sourcesRef.current.delete(element);
    setRevision((value) => value + 1);
  }, []);

  const isAttached = useCallback((element: HTMLMediaElement | null) => (
    Boolean(element && sourcesRef.current.has(element))
  ), []);

  useEffect(() => () => {
    void contextRef.current?.close().catch(() => undefined);
    contextRef.current = null;
  }, []);

  return { analyser, attach, detach, isAttached };
};
