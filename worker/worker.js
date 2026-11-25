import { JevError, planQuestions, runJevRequest } from './jev.js';
import {
  CORS_HEADERS,
  baseHeaders,
  errorResponse,
  isRateLimited,
  jsonResponse,
  methodNotAllowedResponse,
  rateLimitedResponse,
} from './http.ts';
import { proxyJson } from './proxy.ts';
import { handleSiteRequest } from './site.ts';

/**
 * lok.computer's one Worker: the static site (the built `dist/`, through the
 * ASSETS binding and `site.ts`) and the credentialed API under /api.
 *
 * Available Environment Variables:
 *
 * Ask AI (Jev) Configuration:
 * - AI_BASE_URL: OpenAI-compatible endpoint that serves the planner model
 * - AI_API_KEY: API key for that endpoint
 * - JEV_PLANNER_MODEL: planner model on AI_BASE_URL (required)
 * - JEV_PLANNER_REASONING_EFFORT: planner reasoning_effort (default: none)
 * - TYPESAFE_API_KEY: TypeSafe API key for the Jev decision model
 * - JEV_MODEL: Jev model or alias (default: jev-latest)
 * - JEV_RATE_LIMITER: rate limiting binding for both Ask AI endpoints (wrangler.toml)
 *
 * Fedi Configuration:
 * - FEDI_INSTANCE: URL of the Mastodon/GoToSocial instance (e.g., https://rex.cat)
 * - FEDI_ACCESS_TOKEN: Access token for the instance
 *
 * NeoDB Configuration:
 * - NEODB_ACCESS_TOKEN: NeoDB access token
 * - NEODB_USERNAME: NeoDB user whose shelf is read (e.g., lok)
 *
 * Fedi and NeoDB proxies:
 * - PROXY_RATE_LIMITER: rate limiting binding shared by the proxy routes (wrangler.toml)
 *
 * Site:
 * - ASSETS: the static assets binding over `dist/` (wrangler.toml)
 */

/** @typedef {import('./http.ts').RateLimiter} RateLimiter */

/**
 * The Worker's environment. Every API entry is optional: routes check for what
 * they need and answer 503 when it is missing.
 * @typedef {object} Env
 * @property {import('./site.ts').AssetFetcher} [ASSETS]
 * @property {string} [AI_BASE_URL]
 * @property {string} [AI_API_KEY]
 * @property {string} [JEV_PLANNER_MODEL]
 * @property {string} [JEV_PLANNER_REASONING_EFFORT]
 * @property {string} [TYPESAFE_API_KEY]
 * @property {string} [JEV_MODEL]
 * @property {RateLimiter} [JEV_RATE_LIMITER]
 * @property {string} [FEDI_INSTANCE]
 * @property {string} [FEDI_ACCESS_TOKEN]
 * @property {string} [NEODB_ACCESS_TOKEN]
 * @property {string} [NEODB_USERNAME]
 * @property {RateLimiter} [PROXY_RATE_LIMITER]
 */

const readJsonBody = async (request) => {
  try {
    return await request.json();
  } catch {
    throw new JevError('Request body must be JSON.', 400);
  }
};

const makeJevErrorResponse = (error) => {
  if (error instanceof JevError) {
    if (error.details) console.error('Jev upstream detail:', error.details);
    return errorResponse(error.message, error.status, error.code);
  }
  console.error('Error in Jev endpoint:', error);
  return errorResponse('Internal server error', 500);
};

function makeNotFoundResponse(request) {
  if ((request.headers.get('Accept') || '').toLowerCase().includes('text/markdown')) {
    return new Response([
      '# 404: API resource not found',
      '',
      'The requested lok.computer API resource does not exist.',
      '',
      '- [OpenAPI specification](/openapi.json)',
      '- [Developer resources](/developers)',
      '',
    ].join('\n'), {
      status: 404,
      headers: { ...baseHeaders('text/markdown; charset=utf-8'), ...CORS_HEADERS },
    });
  }

  return errorResponse('Not Found', 404);
}

const NEODB_SHELF_TYPES = ['wishlist', 'progress', 'complete', 'dropped'];

/**
 * Private and direct posts are dropped here, so they never reach the client.
 * @param {unknown} data
 */
const onlyPublicStatuses = (data) =>
  /** @type {Array<{ visibility?: string }>} */ (data).filter((status) =>
    status.visibility === 'public' || status.visibility === 'unlisted');

/**
 * The credentialed read-only proxies, by exact path. Each names only what
 * differs: its settings, the upstream URL, and the provider's own headers.
 * @type {Record<string, (request: Request, env: Env) => Promise<Response>>}
 */
const PROXY_ROUTES = {
  // Fedi/GoToSocial account lookup.
  '/api/fedi/account': (request, env) => proxyJson(request, {
    service: 'Fedi',
    limiter: env.PROXY_RATE_LIMITER,
    config: { FEDI_INSTANCE: env.FEDI_INSTANCE, FEDI_ACCESS_TOKEN: env.FEDI_ACCESS_TOKEN },
    token: (config) => config.FEDI_ACCESS_TOKEN,
    headers: { 'Content-Type': 'application/json' },
    upstream: (url, config) => {
      const username = url.searchParams.get('username');
      if (!username) return { invalid: 'Missing username parameter' };
      return `${config.FEDI_INSTANCE}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`;
    },
  }),

  // Fedi/GoToSocial statuses, public and unlisted only.
  '/api/fedi/statuses': (request, env) => proxyJson(request, {
    service: 'Fedi',
    limiter: env.PROXY_RATE_LIMITER,
    config: { FEDI_INSTANCE: env.FEDI_INSTANCE, FEDI_ACCESS_TOKEN: env.FEDI_ACCESS_TOKEN },
    token: (config) => config.FEDI_ACCESS_TOKEN,
    headers: { 'Content-Type': 'application/json' },
    upstream: (url, config) => {
      const accountId = url.searchParams.get('accountId');
      if (!accountId) return { invalid: 'Missing accountId parameter' };
      const upstreamUrl = new URL(`${config.FEDI_INSTANCE}/api/v1/accounts/${encodeURIComponent(accountId)}/statuses`);
      upstreamUrl.searchParams.append('limit', url.searchParams.get('limit') || '20');
      const maxId = url.searchParams.get('max_id');
      if (maxId) upstreamUrl.searchParams.append('max_id', maxId);
      return upstreamUrl.toString();
    },
    transform: onlyPublicStatuses,
  }),

  // One page of the configured user's NeoDB shelf.
  '/api/neodb/shelf': (request, env) => proxyJson(request, {
    service: 'NeoDB',
    limiter: env.PROXY_RATE_LIMITER,
    config: { NEODB_ACCESS_TOKEN: env.NEODB_ACCESS_TOKEN, NEODB_USERNAME: env.NEODB_USERNAME },
    token: (config) => config.NEODB_ACCESS_TOKEN,
    headers: { Accept: 'application/json' },
    upstream: (url, config) => {
      const shelfType = url.searchParams.get('type') || 'wishlist';
      const page = url.searchParams.get('page') || '1';
      const pageSize = url.searchParams.get('page_size') || '20';
      if (!NEODB_SHELF_TYPES.includes(shelfType)) {
        return { invalid: 'Invalid shelf type. Must be: wishlist, progress, complete, or dropped' };
      }
      return `https://neodb.social/api/user/${encodeURIComponent(config.NEODB_USERNAME)}/shelf/${shelfType}?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`;
    },
  }),
};

/**
 * @param {Request} request
 * @param {Env} env
 */
async function handleApiRequest(request, env) {
  const url = new URL(request.url);

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Credential-free discovery endpoints for agents and integration checks.
  if (url.pathname === '/api' || url.pathname === '/api/') {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return methodNotAllowedResponse('GET, HEAD');
    }

    return jsonResponse({
      name: 'lok.computer public API',
      description: 'Public REST endpoints used by the lok.computer browser desktop.',
      // The origin the client reached, so forks, previews and dev point at themselves.
      documentation: `${url.origin}/developers`,
      openapi: `${url.origin}/openapi.json`,
      status: `${url.origin}/api/status`,
    });
  }

  if (url.pathname === '/api/status') {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return methodNotAllowedResponse('GET, HEAD');
    }

    return jsonResponse({
      service: 'lok.computer public API',
      status: 'ok',
    });
  }

  // Ask AI: decide how Jev should answer a question (plan, ask for input, answer it directly, or refuse), without calling Jev.
  if (url.pathname === '/api/jev/plan') {
    if (request.method !== 'POST') {
      return methodNotAllowedResponse('POST');
    }
    try {
      if (await isRateLimited(request, env.JEV_RATE_LIMITER)) return rateLimitedResponse();
      const started = Date.now();
      const body = await readJsonBody(request);
      // `kind` is "plan", "needs_input" (ask the person for more), "answer" (the planner answered itself), or "refuse".
      const { plannerModel, ...outcome } = await planQuestions(body ?? {}, env);
      return jsonResponse({
        ...outcome,
        planner: plannerModel ? { model: plannerModel } : null,
        timing: { plannerMs: Date.now() - started },
      });
    } catch (error) {
      return makeJevErrorResponse(error);
    }
  }

  // Ask AI: answer a question (or a supplied plan) with Jev: best answer plus per-question evidence.
  if (url.pathname === '/api/jev') {
    if (request.method !== 'POST') {
      return methodNotAllowedResponse('POST');
    }
    try {
      if (await isRateLimited(request, env.JEV_RATE_LIMITER)) return rateLimitedResponse();
      const body = await readJsonBody(request);
      return jsonResponse(await runJevRequest(body ?? {}, env));
    } catch (error) {
      return makeJevErrorResponse(error);
    }
  }

  const proxy = Object.hasOwn(PROXY_ROUTES, url.pathname) ? PROXY_ROUTES[url.pathname] : undefined;
  if (proxy) return proxy(request, env);

  return makeNotFoundResponse(request);
}

/**
 * The workers.dev address and every version preview URL serve a full copy of
 * the site; ask search engines to list only the real domain. public/_headers
 * does the same for the static files.
 * @param {URL} url
 * @param {Response} response
 */
function withWorkersDevNoIndex(url, response) {
  if (!url.hostname.endsWith('.workers.dev')) return response;
  const marked = new Response(response.body, response);
  marked.headers.set('X-Robots-Tag', 'noindex');
  return marked;
}

/**
 * @param {Request} request
 * @param {Env} env
 */
function route(request, env) {
  const { pathname } = new URL(request.url);
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return handleApiRequest(request, env);
  }
  if (!env.ASSETS) {
    return new Response('The ASSETS binding is missing.', { status: 500 });
  }
  return handleSiteRequest(request, env.ASSETS);
}

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {unknown} ctx
   */
  async fetch(request, env, ctx) {
    return withWorkersDevNoIndex(new URL(request.url), await route(request, env));
  },
};
