import { describe, expect, test } from 'bun:test';
import { RECENT_LIMIT, normalizeRecent, pickRecentProps, pushRecent, recentKey, type RecentEntry } from './recentApps';

const entry = (componentType: string, title: string, props?: Record<string, unknown>, openedAt = 1): RecentEntry => (
  { componentType, title, props, openedAt }
);

describe('pickRecentProps', () => {
  test('keeps only the props that identify a window', () => {
    expect(pickRecentProps({ channelSlug: 'books', username: 'lok', onPropsChange: () => undefined, request: { items: [] } }))
      .toEqual({ channelSlug: 'books', username: 'lok' });
    expect(pickRecentProps({ items: [1, 2, 3] })).toBeUndefined();
    expect(pickRecentProps(undefined)).toBeUndefined();
  });
});

describe('pushRecent', () => {
  test('puts the newest first and collapses the same window', () => {
    const list = pushRecent([entry('About', 'About')], entry('ChannelExplorer', 'Books', { channelSlug: 'books' }, 2));
    const again = pushRecent(list, entry('About', 'About', undefined, 3));
    expect(again.map((item) => item.title)).toEqual(['About', 'Books']);
    expect(again).toHaveLength(2);
  });

  test('tells channels apart by slug and trims to the limit', () => {
    let list: RecentEntry[] = [];
    for (let index = 0; index < RECENT_LIMIT + 3; index += 1) {
      list = pushRecent(list, entry('ChannelExplorer', `Channel ${index}`, { channelSlug: `c${index}` }, index));
    }
    expect(list).toHaveLength(RECENT_LIMIT);
    expect(list[0].title).toBe(`Channel ${RECENT_LIMIT + 2}`);
    expect(recentKey('ChannelExplorer', { channelSlug: 'a' })).not.toBe(recentKey('ChannelExplorer', { channelSlug: 'b' }));
  });
});

describe('normalizeRecent', () => {
  test('drops junk and keeps well-formed entries', () => {
    expect(normalizeRecent([{ componentType: 'About', title: 'About', openedAt: 5 }, null, 'x', { title: 'no type' }]))
      .toEqual([{ componentType: 'About', title: 'About', iconType: undefined, props: undefined, openedAt: 5 }]);
    expect(normalizeRecent('nope')).toEqual([]);
  });
});
