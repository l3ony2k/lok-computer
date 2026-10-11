import { describe, expect, it } from 'bun:test';
import { APP_CONFIG } from '@/config/constants';
import { ROUTES, generateSharePath, matchRoute, parseWindowSpec } from '@/config/routes';

/** Open a share path the way RouteInterpreter does: match the route, then extract props. */
function reopen(path: string) {
  const { path: pathname, query } = parseWindowSpec(path.replace(/^\//, ''));
  const match = matchRoute('/' + pathname);
  if (!match) throw new Error(`No route matches ${path}`);
  return { route: match.route, props: match.route.extractProps(match.params, query) };
}

describe('share links', () => {
  it('route every empty-props share path back to the same Application', () => {
    for (const route of ROUTES) {
      const path = route.generateUrl?.({});
      if (!path) continue; // explorer and block links need their identifiers
      expect(reopen(path).route).toBe(route);
    }
  });

  it('carry the channel explorer view, and the owner only when it is not the default', () => {
    const props = {
      channelSlug: 'cool-stuff-on-web',
      username: APP_CONFIG.ARENA_USERNAME,
      initialGridSize: 'M',
      initialIsListView: true,
      initialPreviewMode: 'vertical',
      initialSelectedBlockId: 42,
    };
    const path = generateSharePath('ChannelExplorer', props)!;
    expect(path).not.toContain('user=');
    expect(reopen(path).props).toEqual(props);

    const theirs = generateSharePath('ChannelExplorer', { channelSlug: 'a/b c', username: 'someone' })!;
    expect(reopen(theirs).props).toMatchObject({ channelSlug: 'a/b c', username: 'someone' });
  });

  it('reopen a block, an image, and a channel gallery', () => {
    expect(reopen(generateSharePath('BlockViewer', { blockId: 123 })!).props).toEqual({ blockId: 123 });
    const url = 'https://example.com/a picture.png?x=1&y=2';
    expect(reopen(generateSharePath('ImageViewer', { imageUrl: url })!).props).toEqual({ imageUrl: url });
    expect(reopen(generateSharePath('ImageViewer', { arena: 'things-i-created', index: 3 })!).props)
      .toEqual({ arena: 'things-i-created', index: 3 });
    expect(reopen(generateSharePath('ImageViewer', { arena: 'things-i-created', index: 0 })!).props)
      .toEqual({ arena: 'things-i-created', index: 0 });
  });

  it('keep the About tab, the Config tab, the Shelf page, and the Web page', () => {
    expect(reopen(generateSharePath('About', { initialTab: 'projects' })!).props).toEqual({ initialTab: 'projects' });
    expect(reopen(generateSharePath('Config', { initialCategory: 'desktop' })!).props).toEqual({ initialCategory: 'desktop' });
    expect(generateSharePath('Config', {})).toBe('/config');
    expect(reopen(generateSharePath('Shelf', { initialTab: 'complete', initialPage: 3 })!).props)
      .toEqual({ initialTab: 'complete', initialPage: 3 });
    expect(generateSharePath('Shelf', { initialTab: 'complete', initialPage: 1 })).toBe('/shelf?tab=complete');
    const page = 'https://simone.computer/#/webdesktops';
    expect(reopen(generateSharePath('Web', { initialUrl: page })!).props).toEqual({ initialUrl: page });
  });

  it('turn the media player\'s current item into a play-once request', () => {
    const nowPlaying = { src: 'https://cdn.example/track one.mp3', title: 'Track & One' };
    const { props } = reopen(generateSharePath('MediaPlayer', { nowPlaying })!);
    expect(props.request).toMatchObject({ play: true, once: true, items: [nowPlaying] });
    expect(generateSharePath('MediaPlayer', {})).toBe('/media');
  });

  it('have no share path for unknown Applications', () => {
    expect(generateSharePath('Nope', {})).toBeNull();
  });
});
