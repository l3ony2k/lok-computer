import { describe, expect, it } from 'bun:test';
import { FEATURED_CHANNELS, IMAGE_CHANNEL_MARK, imageChannelLabel, isImageChannel } from '@/config/channels';

describe('image channel mark', () => {
  it('picks the marked channels out of the snapshot', () => {
    const marked = FEATURED_CHANNELS.filter(isImageChannel).map((channel) => channel.slug);
    expect(marked).toEqual(['ephemeral-visions', 'physical-digital-surrealism', 'it-s-really-cute']);
  });

  it('labels a marked channel without the mark', () => {
    expect(imageChannelLabel({ title: `${IMAGE_CHANNEL_MARK} ephemeral visions` })).toBe('ephemeral visions');
    expect(imageChannelLabel({ title: 'terminal tools' })).toBe('terminal tools');
  });
});
