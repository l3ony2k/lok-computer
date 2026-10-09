import { describe, expect, it } from 'bun:test';
import type { ArenaBlock, ArenaChannel } from '@/types/arena';
import {
  arenaBlockToMediaItem,
  formatArenaReference,
  getArenaImage,
  getArenaPlayableMedia,
  parseArenaReference,
} from './arenaLinks';

const block = (overrides: Partial<ArenaBlock> = {}): ArenaBlock => ({
  id: 85204,
  kind: 'attachment',
  title: 'Untitled',
  createdAt: '2013-03-10T00:00:00Z',
  updatedAt: '2013-03-10T00:00:00Z',
  state: 'available',
  visibility: 'public',
  descriptionHtml: null,
  descriptionPlain: null,
  owner: { id: 1, type: 'User', name: 'David', slug: 'david', avatar: null, initials: 'D' },
  source: null,
  image: null,
  connection: null,
  commentCount: 0,
  arenaUrl: 'https://www.are.na/block/85204',
  textHtml: null,
  textPlain: null,
  attachment: null,
  embed: null,
  ...overrides,
});

const image = (overrides: Partial<NonNullable<ArenaBlock['image']>> = {}): NonNullable<ArenaBlock['image']> => ({
  altText: null,
  blurhash: null,
  width: 612,
  height: 680,
  aspectRatio: 0.9,
  contentType: 'image/jpeg',
  filename: 'photo.jpg',
  fileSize: 1000,
  updatedAt: null,
  original: { src: 'https://images.are.na/original.jpg' },
  small: null,
  medium: { src: 'https://images.are.na/medium.jpg' },
  large: { src: 'https://images.are.na/large.jpg' },
  square: null,
  ...overrides,
});

describe('parseArenaReference', () => {
  it('reads channel links in every are.na form', () => {
    const expected = { type: 'channel', slug: 'physical-digital-surrealism' };
    expect(parseArenaReference('https://www.are.na/lok/physical-digital-surrealism')).toEqual(expected);
    expect(parseArenaReference('are.na/lok/physical-digital-surrealism?sort=desc')).toEqual(expected);
    expect(parseArenaReference('https://are.na/channel/physical-digital-surrealism')).toEqual(expected);
    expect(parseArenaReference('https://api.are.na/v3/channels/physical-digital-surrealism/contents')).toEqual(expected);
    expect(parseArenaReference('  physical-digital-surrealism  ')).toEqual(expected);
  });

  it('reads block links', () => {
    expect(parseArenaReference('https://www.are.na/block/85204')).toEqual({ type: 'block', id: 85204 });
    expect(parseArenaReference('are.na/lok/some-channel/block/85204')).toEqual({ type: 'block', id: 85204 });
    expect(parseArenaReference('https://api.are.na/v2/blocks/85204')).toEqual({ type: 'block', id: 85204 });
  });

  it('leaves media files, profiles, and site pages to the caller', () => {
    expect(parseArenaReference('https://attachments.are.na/85204/track.mp3')).toBeNull();
    expect(parseArenaReference('https://example.com/song.mp3')).toBeNull();
    expect(parseArenaReference('song.mp3')).toBeNull();
    expect(parseArenaReference('https://www.are.na/lok')).toBeNull();
    expect(parseArenaReference('https://www.are.na/explore/channels')).toBeNull();
    expect(parseArenaReference('https://www.are.na/block/not-a-number')).toBeNull();
    expect(parseArenaReference('12345')).toBeNull();
    expect(parseArenaReference('')).toBeNull();
  });

  it('round-trips through the canonical link', () => {
    for (const reference of [{ type: 'channel', slug: 'audio' }, { type: 'block', id: 85204 }] as const) {
      expect(parseArenaReference(formatArenaReference(reference))).toEqual(reference);
    }
  });
});

describe('getArenaPlayableMedia', () => {
  it('trusts the extension when Are.na only knows the file is binary', () => {
    const playable = getArenaPlayableMedia(block({
      title: 'maha_sara_005.mp3',
      attachment: {
        url: 'https://attachments.are.na/85204/e963.mp3?1362948675',
        fileName: 'e963.mp3',
        contentType: 'application/octet-stream',
        fileSize: 1440120,
      },
    }));
    expect(playable).toEqual({ src: 'https://attachments.are.na/85204/e963.mp3?1362948675', kind: 'audio', title: 'maha sara 005' });
  });

  it('uses the content type for video attachments and keeps human titles', () => {
    expect(getArenaPlayableMedia(block({
      title: '@armilk88 on Twitter',
      attachment: { url: 'https://attachments.are.na/1/clip.mp4', fileName: 'clip.mp4', contentType: 'video/quicktime', fileSize: 1 },
    }))).toMatchObject({ kind: 'video', title: '@armilk88 on Twitter' });
  });

  it('accepts direct media links and rejects everything else', () => {
    expect(getArenaPlayableMedia(block({
      kind: 'link',
      source: { url: 'https://example.com/show.webm', title: null, provider: null },
    }))).toMatchObject({ kind: 'video', src: 'https://example.com/show.webm' });
    expect(getArenaPlayableMedia(block({
      kind: 'attachment',
      attachment: { url: 'https://attachments.are.na/1/zine.pdf', fileName: 'zine.pdf', contentType: 'application/pdf', fileSize: 1 },
    }))).toBeNull();
    expect(getArenaPlayableMedia(block({
      kind: 'embed',
      source: { url: 'https://www.youtube.com/watch?v=abc', title: null, provider: null },
    }))).toBeNull();
    expect(getArenaPlayableMedia({ ...block(), kind: 'channel', slug: 'x', counts: { blocks: 0, channels: 0, contents: 0, collaborators: 0 } } as unknown as ArenaChannel)).toBeNull();
  });

  it('builds a credited playlist item', () => {
    const item = arenaBlockToMediaItem(block({
      attachment: { url: 'https://attachments.are.na/2/a.mp3', fileName: 'a.mp3', contentType: 'audio/mpeg', fileSize: 1 },
    }));
    expect(item).toMatchObject({
      src: 'https://attachments.are.na/2/a.mp3',
      kind: 'audio',
      title: 'a',
      artist: 'David · Are.na',
      sourceUrl: 'https://www.are.na/block/85204',
      origin: 'app',
    });
  });
});

describe('getArenaImage', () => {
  it('prefers the display rendition, but keeps GIFs animated', () => {
    expect(getArenaImage(block({ kind: 'image', title: 'Desk', image: image() })))
      .toEqual({ id: 85204, src: 'https://images.are.na/large.jpg', title: 'Desk', arenaUrl: 'https://www.are.na/block/85204' });
    expect(getArenaImage(block({ kind: 'image', image: image({ contentType: 'image/gif', filename: 'loop.gif' }) }))?.src)
      .toBe('https://images.are.na/original.jpg');
  });

  it('drops generated upload names as titles', () => {
    expect(getArenaImage(block({ kind: 'image', title: '99104199-5da4-4cfb-b977-cd3f5f4acadf.jpg', image: image() }))?.title).toBe('');
    expect(getArenaImage(block({ kind: 'image', title: 'liberty-800.jpg', image: image() }))?.title).toBe('liberty-800.jpg');
  });

  it('titles playable uploads with generated names by block', () => {
    const upload = (title: string) => block({
      title,
      attachment: { url: 'https://attachments.are.na/9/A554B4FF-2603-4E39-8593-2D2A309A3073.mov', fileName: `${title}`, contentType: 'video/quicktime', fileSize: 1 },
    });
    expect(arenaBlockToMediaItem(upload('A554B4FF-2603-4E39-8593-2D2A309A3073.mov'))?.title).toBe('Block 85204');
    expect(arenaBlockToMediaItem(upload('2024-01-01-12-30-00.mov'))?.title).toBe('2024-01-01-12-30-00');
    expect(arenaBlockToMediaItem(upload('Field recording'))?.title).toBe('Field recording');
  });

  it('includes image attachments and skips thumbnails of other blocks', () => {
    expect(getArenaImage(block({
      attachment: { url: 'https://attachments.are.na/3/scan.png', fileName: 'scan.png', contentType: 'image/png', fileSize: 1 },
    }))?.src).toBe('https://attachments.are.na/3/scan.png');
    expect(getArenaImage(block({ kind: 'link', image: image() }))).toBeNull();
  });
});
