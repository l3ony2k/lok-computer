import { describe, expect, test } from 'bun:test';
import { APP_CONFIG } from './constants';

describe('social API configuration', () => {
  test('uses the current Bluesky DID', () => {
    const expectedDid = 'did:plc:2p3gp2g2teuwpuv4skhiik3i';

    expect(new URL(APP_CONFIG.BSKY_PROFILE_URL).searchParams.get('actor')).toBe(expectedDid);
    expect(new URL(APP_CONFIG.BSKY_FEED_URL).searchParams.get('actor')).toBe(expectedDid);
  });
});
