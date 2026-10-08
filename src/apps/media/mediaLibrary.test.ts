import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_LIBRARY,
  DEFAULT_PLAYER_STATE,
  createMediaItem,
  createMediaRequest,
  formatMediaTime,
  inferMediaKind,
  isPlayableMedia,
  normalizeMediaUrl,
  normalizePlayerState,
  pickNextIndex,
  titleFromSource,
} from './mediaLibrary';

describe('media sources', () => {
  test('infers kind from MIME type before extension', () => {
    expect(inferMediaKind('https://a.test/clip', 'video/mp4')).toBe('video');
    expect(inferMediaKind('https://a.test/clip.mp4', 'audio/mp4')).toBe('audio');
    expect(inferMediaKind('https://a.test/file.ogg', 'application/ogg')).toBe('audio');
    expect(inferMediaKind('https://a.test/doc.pdf', 'application/pdf')).toBeNull();
    expect(inferMediaKind('https://a.test/song.MP3?download=1')).toBe('audio');
    expect(inferMediaKind('https://a.test/movie.webm#t=10')).toBe('video');
    expect(inferMediaKind('https://a.test/page')).toBeNull();
    expect(isPlayableMedia(null)).toBeFalse();
  });

  test('derives readable titles and accepts only web URLs', () => {
    expect(titleFromSource('https://a.test/music/My_Song%20Mix.mp3')).toBe('My Song Mix');
    expect(titleFromSource('https://a.test/')).toBe('a.test');
    expect(normalizeMediaUrl('a.test/x.mp3')).toBe('https://a.test/x.mp3');
    expect(normalizeMediaUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeMediaUrl('   ')).toBeNull();
  });

  test('creates items and one-shot requests with unique ids', () => {
    const item = createMediaItem('https://a.test/clip.mp4', { origin: 'app' });
    expect(item).toMatchObject({ kind: 'video', title: 'clip', origin: 'app' });
    const first = createMediaRequest([item]);
    const second = createMediaRequest([item], false);
    expect(first.id).not.toBe(second.id);
    expect(second.play).toBeFalse();
  });

  test('ships a library of licensed, CORS-served media', () => {
    expect(DEFAULT_LIBRARY.length).toBeGreaterThan(0);
    for (const item of DEFAULT_LIBRARY) {
      expect(item.src).toStartWith('https://upload.wikimedia.org/');
      expect(item.credit).toBeTruthy();
      expect(item.sourceUrl).toStartWith('https://commons.wikimedia.org/wiki/File:');
    }
  });
});

describe('player state', () => {
  test('drops object URLs and repairs the current item on restore', () => {
    const blob = { id: 'b', title: 'Local', src: 'blob:http://x/1', kind: 'audio', origin: 'file' };
    const remote = { id: 'r', title: 'Remote', src: 'https://a.test/r.mp3', kind: 'audio', origin: 'url' };
    const state = normalizePlayerState({
      playlist: [blob, remote, { id: 'bad' }],
      currentId: 'b',
      volume: 4,
      rate: 0,
      repeat: 'sometimes',
      position: 42,
      handledRequests: ['a', 3],
    });
    expect(state.playlist.map((item) => item.id)).toEqual(['r']);
    expect(state.currentId).toBe('r');
    expect(state.position).toBe(0);
    expect(state.volume).toBe(1);
    expect(state.rate).toBe(0.25);
    expect(state.repeat).toBe(DEFAULT_PLAYER_STATE.repeat);
    expect(state.handledRequests).toEqual(['a']);
  });

  test('keeps an intentionally empty playlist', () => {
    expect(normalizePlayerState({ playlist: [], currentId: null }).playlist).toEqual([]);
    expect(normalizePlayerState(null)).toBe(DEFAULT_PLAYER_STATE);
  });

  test('steps through tracks according to repeat and shuffle', () => {
    expect(pickNextIndex(3, 0, 1, { repeat: 'off', shuffle: false })).toBe(1);
    expect(pickNextIndex(3, 2, 1, { repeat: 'off', shuffle: false })).toBeNull();
    expect(pickNextIndex(3, 2, 1, { repeat: 'all', shuffle: false })).toBe(0);
    expect(pickNextIndex(3, 0, -1, { repeat: 'all', shuffle: false })).toBe(2);
    expect(pickNextIndex(3, 1, 1, { repeat: 'off', shuffle: true }, () => 0)).toBe(2);
    expect(pickNextIndex(3, 1, 1, { repeat: 'off', shuffle: true }, () => 0.99)).toBe(0);
    expect(pickNextIndex(0, 0, 1, { repeat: 'all', shuffle: false })).toBeNull();
  });

  test('formats clock readouts', () => {
    expect(formatMediaTime(0)).toBe('00:00');
    expect(formatMediaTime(65.9)).toBe('01:05');
    expect(formatMediaTime(3725)).toBe('1:02:05');
    expect(formatMediaTime(Number.NaN)).toBe('--:--');
  });
});
