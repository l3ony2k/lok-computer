import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { DEPLOYMENT_DEFAULTS, renderAnalyticsTag, resolveDeployment } from './deployment';

describe('deployment settings', () => {
  test('fall back to lok.computer when nothing is set', () => {
    expect(resolveDeployment({})).toEqual({ ...DEPLOYMENT_DEFAULTS });
    expect(resolveDeployment(undefined)).toEqual({ ...DEPLOYMENT_DEFAULTS });
  });

  test('take values from the environment, trimmed, without a trailing slash on the site URL', () => {
    const deployment = resolveDeployment({ VITE_SITE_URL: ' https://example.com/ ', VITE_ARENA_USERNAME: 'someone' });
    expect(deployment.VITE_SITE_URL).toBe('https://example.com');
    expect(deployment.VITE_ARENA_USERNAME).toBe('someone');
    expect(deployment.VITE_BSKY_ACTOR).toBe(DEPLOYMENT_DEFAULTS.VITE_BSKY_ACTOR);
  });

  test('an empty analytics setting turns analytics off; an empty account falls back', () => {
    const deployment = resolveDeployment({ VITE_UMAMI_WEBSITE_ID: '', VITE_ARENA_USERNAME: '' });
    expect(deployment.VITE_UMAMI_WEBSITE_ID).toBe('');
    expect(deployment.VITE_ARENA_USERNAME).toBe(DEPLOYMENT_DEFAULTS.VITE_ARENA_USERNAME);
    expect(renderAnalyticsTag(deployment)).toBe('');
  });

  test('the analytics tag only reports from the configured domain', () => {
    const tag = renderAnalyticsTag(resolveDeployment({ VITE_SITE_URL: 'https://example.com' }));
    expect(tag).toContain(`src="${DEPLOYMENT_DEFAULTS.VITE_UMAMI_SRC}"`);
    expect(tag).toContain(`data-website-id="${DEPLOYMENT_DEFAULTS.VITE_UMAMI_WEBSITE_ID}"`);
    expect(tag).toContain('data-domains="example.com"');
    expect(tag).toContain('data-auto-pageview="false"');
  });

  test('index.html takes the site URL and analytics tag from the settings', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain('%ANALYTICS_TAG%');
    expect(html).toContain('<link rel="canonical" href="%SITE_URL%" />');
    expect(html).not.toContain(DEPLOYMENT_DEFAULTS.VITE_UMAMI_WEBSITE_ID);
    expect(html).not.toContain('content="https://lok.computer');
  });
});
