import { describe, expect, it } from 'bun:test';
import { APPLICATION_LIST, APP_LIST, getApplicationDefinition } from '@/config/apps';
import { APP_MODULE_LOADERS } from '@/config/lazyApps';
import { ROUTES } from '@/config/routes';

describe('application catalog', () => {
  it('owns every lazy app loader exactly once', () => {
    const catalogLoaders = new Set(APPLICATION_LIST.map((application) => application.loader));
    expect(catalogLoaders.size).toBe(Object.keys(APP_MODULE_LOADERS).length);
    expect(catalogLoaders).toEqual(new Set(Object.values(APP_MODULE_LOADERS)));
  });

  it('derives the desktop list from catalog visibility', () => {
    const desktopTypes = APPLICATION_LIST
      .filter((application) => application.showOnDesktop)
      .map((application) => application.componentType);
    expect(APP_LIST.map((application) => application.componentType)).toEqual(desktopTypes);
  });

  it('resolves every deep-link identity through the catalog', () => {
    for (const route of ROUTES) {
      expect(getApplicationDefinition(route.componentType)).toBeDefined();
      expect('iconType' in route).toBeFalse();
      expect('singleInstance' in route).toBeFalse();
      expect('defaultWidth' in route).toBeFalse();
      expect('defaultHeight' in route).toBeFalse();
    }
  });
});
