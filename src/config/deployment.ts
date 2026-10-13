/**
 * Deployment settings: the values that change between lok.computer and a fork.
 *
 * Set them as build environment variables (the Cloudflare Pages dashboard, or a
 * local `.env`; see `.env.example`). Anything unset falls back to lok.computer's
 * own value, so the live site needs none of them. They are compiled into the
 * public bundle and `index.html`: configuration, never secrets.
 *
 * This module is read by `vite.config.ts` (for `index.html`) and by the app
 * (`src/config/site.ts`), so it must stay free of browser and Node APIs.
 */

export const DEPLOYMENT_DEFAULTS = {
  /** Public origin of the site, without a trailing slash. Canonical and social-card URLs, the Umami domain guard. */
  VITE_SITE_URL: 'https://lok.computer',
  /** Umami tracker script. Empty disables analytics. */
  VITE_UMAMI_SRC: 'https://stats.130170.xyz/script.js',
  /** Umami website ID. Empty disables analytics. */
  VITE_UMAMI_WEBSITE_ID: '67f89e27-5ede-4ccd-8073-1c88ff24974f',
  /** The Are.na account the desktop browses, warms at boot, and deep-links to by default. */
  VITE_ARENA_USERNAME: 'lok',
  /** The Bluesky account (DID or handle) shown in the Bsky app. */
  VITE_BSKY_ACTOR: 'did:plc:2p3gp2g2teuwpuv4skhiik3i',
  /** The fediverse account the Fedi app shows; the instance is the Worker's FEDI_INSTANCE. */
  VITE_FEDI_USERNAME: 'lok',
  /** guestbooks.meadow.cafe guestbook ID. */
  VITE_GUESTBOOK_ID: '671',
} as const;

export type DeploymentKey = keyof typeof DEPLOYMENT_DEFAULTS;
export type Deployment = Record<DeploymentKey, string>;

/** Settings where an empty value means "off" instead of "use the default". */
const OPTIONAL_KEYS: ReadonlySet<DeploymentKey> = new Set(['VITE_UMAMI_SRC', 'VITE_UMAMI_WEBSITE_ID']);

/**
 * Resolves the settings from an environment object (`import.meta.env` in the
 * app, Vite's `loadEnv` result in the config). An unset key takes the default;
 * an empty optional key stays empty (disabled), an empty required key takes the default.
 */
export function resolveDeployment(env: Partial<Record<string, unknown>> = {}): Deployment {
  const resolved = {} as Deployment;
  for (const key of Object.keys(DEPLOYMENT_DEFAULTS) as DeploymentKey[]) {
    const raw = env[key];
    const value = typeof raw === 'string' ? raw.trim() : undefined;
    if (value === undefined) resolved[key] = DEPLOYMENT_DEFAULTS[key];
    else if (value === '' && !OPTIONAL_KEYS.has(key)) resolved[key] = DEPLOYMENT_DEFAULTS[key];
    else resolved[key] = value;
  }
  resolved.VITE_SITE_URL = resolved.VITE_SITE_URL.replace(/\/+$/, '');
  return resolved;
}

/** The Umami tag for `index.html`, or an empty string when analytics is off. */
export function renderAnalyticsTag(deployment: Deployment): string {
  const src = deployment.VITE_UMAMI_SRC;
  const websiteId = deployment.VITE_UMAMI_WEBSITE_ID;
  if (!src || !websiteId) return '';
  // data-domains keeps a fork that forgot to change these, local development,
  // and preview deployments from reporting into this site's statistics.
  const host = new URL(deployment.VITE_SITE_URL).hostname;
  const attribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<script defer src="${attribute(src)}" data-website-id="${attribute(websiteId)}" data-domains="${attribute(host)}" data-auto-pageview="false"></script>`;
}
