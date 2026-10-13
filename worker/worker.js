import { JevError, planQuestions, runJevRequest } from './jev.js';

/**
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
 */

/**
 * A Cloudflare rate limiting binding.
 * @typedef {{ limit(options: { key: string }): Promise<{ success: boolean }> }} RateLimiter
 */

/**
 * The Worker's environment. Every entry is optional: routes check for what
 * they need and answer 503 when it is missing.
 * @typedef {object} Env
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

// Helper to set CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or your specific Pages domain for better security
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const discoveryLinks = [
  '</llms.txt>; rel="alternate"; type="text/markdown"',
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</developers>; rel="help"',
].join(', ');

// Function to create a JSON response with CORS headers
function makeJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Link': discoveryLinks,
      'Vary': 'Accept, Accept-Encoding',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders,
    }
  });
}

const readJsonBody = async (request) => {
  try {
    return await request.json();
  } catch {
    throw new JevError('Request body must be JSON.', 400);
  }
};

// Each client IP gets a budget: Ask AI calls spend planner and Jev credits
// (JEV_RATE_LIMITER); the Fedi and NeoDB proxies spend a personal token's API
// quota (PROXY_RATE_LIMITER). Without the binding, as in tests, there is no limit.
/**
 * @param {Request} request
 * @param {RateLimiter | undefined} limiter
 */
const isRateLimited = async (request, limiter) => {
  if (!limiter) return false;
  const key = request.headers.get('CF-Connecting-IP') ?? 'anonymous';
  const { success } = await limiter.limit({ key });
  return !success;
};

const makeRateLimitedResponse = () =>
  makeJsonResponse({ error: 'Too many requests. Try again in a minute.' }, 429);

const makeJevErrorResponse = (error) => {
  if (error instanceof JevError) {
    if (error.details) console.error('Jev upstream detail:', error.details);
    return makeJsonResponse({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status);
  }
  console.error('Error in Jev endpoint:', error);
  return makeJsonResponse({ error: 'Internal server error' }, 500);
};

function makeMethodNotAllowedResponse(allow) {
  const response = makeJsonResponse({ error: 'Method not allowed' }, 405);
  response.headers.set('Allow', allow);
  return response;
}

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
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Link': discoveryLinks,
        'Vary': 'Accept, Accept-Encoding',
        'X-Content-Type-Options': 'nosniff',
        ...corsHeaders,
      },
    });
  }

  return makeJsonResponse({ error: 'Not Found' }, 404);
}

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {unknown} ctx
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Credential-free discovery endpoints for agents and integration checks.
    if (url.pathname === '/api' || url.pathname === '/api/') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return makeMethodNotAllowedResponse('GET, HEAD');
      }

      return makeJsonResponse({
        name: 'lok.computer public API',
        description: 'Public REST endpoints used by the lok.computer browser desktop.',
        documentation: 'https://lok.computer/developers',
        openapi: 'https://lok.computer/openapi.json',
        status: 'https://lok.computer/api/status',
      });
    }

    if (url.pathname === '/api/status') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return makeMethodNotAllowedResponse('GET, HEAD');
      }

      return makeJsonResponse({
        service: 'lok.computer public API',
        status: 'ok',
      });
    }

    // Ask AI: decide how Jev should answer a question (plan, ask for input, answer it directly, or refuse), without calling Jev.
    if (url.pathname === '/api/jev/plan') {
      if (request.method !== 'POST') {
        return makeMethodNotAllowedResponse('POST');
      }
      try {
        if (await isRateLimited(request, env.JEV_RATE_LIMITER)) return makeRateLimitedResponse();
        const started = Date.now();
        const body = await readJsonBody(request);
        // `kind` is "plan", "needs_input" (ask the person for more), "answer" (the planner answered itself), or "refuse".
        const { plannerModel, ...outcome } = await planQuestions(body ?? {}, env);
        return makeJsonResponse({
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
        return makeMethodNotAllowedResponse('POST');
      }
      try {
        if (await isRateLimited(request, env.JEV_RATE_LIMITER)) return makeRateLimitedResponse();
        const body = await readJsonBody(request);
        return makeJsonResponse(await runJevRequest(body ?? {}, env));
      } catch (error) {
        return makeJevErrorResponse(error);
      }
    }

    // Route for Fedi/GoToSocial account lookup
    if (url.pathname === '/api/fedi/account') {
      try {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return makeMethodNotAllowedResponse('GET, HEAD');
        }
        if (await isRateLimited(request, env.PROXY_RATE_LIMITER)) return makeRateLimitedResponse();

        const fediInstance = env.FEDI_INSTANCE;
        const fediToken = env.FEDI_ACCESS_TOKEN;

        if (!fediInstance || !fediToken) {
          return makeJsonResponse({ error: 'Fedi configuration missing' }, 500);
        }

        const username = url.searchParams.get('username');
        if (!username) {
          return makeJsonResponse({ error: 'Missing username parameter' }, 400);
        }

        const upstreamUrl = `${fediInstance}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`;
        const response = await fetch(upstreamUrl, {
          headers: {
            'Authorization': `Bearer ${fediToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'lok-computer-worker/1.0',
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          return makeJsonResponse({ error: 'Failed to fetch account', details: errorText }, response.status);
        }

        const data = await response.json();
        return makeJsonResponse(data);
      } catch (error) {
        console.error('Error in Fedi account proxy:', error);
        return makeJsonResponse({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, 500);
      }
    }

    // Route for Fedi/GoToSocial statuses proxy
    if (url.pathname.startsWith('/api/fedi/statuses')) {
      try {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return makeMethodNotAllowedResponse('GET, HEAD');
        }
        if (await isRateLimited(request, env.PROXY_RATE_LIMITER)) return makeRateLimitedResponse();

        const fediInstance = env.FEDI_INSTANCE;
        const fediToken = env.FEDI_ACCESS_TOKEN;

        if (!fediInstance) {
          return makeJsonResponse({ error: 'FEDI_INSTANCE not configured' }, 500);
        }
        if (!fediToken) {
          return makeJsonResponse({ error: 'FEDI_ACCESS_TOKEN not configured' }, 500);
        }

        const accountId = url.searchParams.get('accountId');
        const maxId = url.searchParams.get('max_id');
        const limit = url.searchParams.get('limit') || '20';

        if (!accountId) {
          return makeJsonResponse({ error: 'Missing accountId parameter' }, 400);
        }

        const upstreamUrl = new URL(`${fediInstance}/api/v1/accounts/${encodeURIComponent(accountId)}/statuses`);
        upstreamUrl.searchParams.append('limit', limit);
        if (maxId) {
          upstreamUrl.searchParams.append('max_id', maxId);
        }

        const response = await fetch(upstreamUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${fediToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'lok-computer-worker/1.0',
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Fedi API error:', response.status, errorText);
          return makeJsonResponse({ error: 'Failed to fetch from Fedi instance', details: errorText }, response.status);
        }

        const data = await response.json();

        // SECURITY: Filter out private and direct posts at the API level
        // This ensures private content is never sent to the client
        const publicStatuses = data.filter(status =>
          status.visibility === 'public' || status.visibility === 'unlisted'
        );

        return makeJsonResponse(publicStatuses);

      } catch (error) {
        console.error('Error in Fedi proxy:', error);
        return makeJsonResponse({ error: 'Internal server error in Fedi proxy', details: error instanceof Error ? error.message : String(error) }, 500);
      }
    }

    // Route for NeoDB shelf
    if (url.pathname === '/api/neodb/shelf') {
      try {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return makeMethodNotAllowedResponse('GET, HEAD');
        }
        if (await isRateLimited(request, env.PROXY_RATE_LIMITER)) return makeRateLimitedResponse();

        const neodbToken = env.NEODB_ACCESS_TOKEN;

        if (!neodbToken) {
          return makeJsonResponse({ error: 'NEODB_ACCESS_TOKEN not configured' }, 500);
        }

        const neodbUser = env.NEODB_USERNAME;

        if (!neodbUser) {
          return makeJsonResponse({ error: 'NEODB_USERNAME not configured' }, 500);
        }

        const shelfType = url.searchParams.get('type') || 'wishlist';
        const page = url.searchParams.get('page') || '1';
        const pageSize = url.searchParams.get('page_size') || '20';

        // Validate shelf type
        const validTypes = ['wishlist', 'progress', 'complete', 'dropped'];
        if (!validTypes.includes(shelfType)) {
          return makeJsonResponse({ error: 'Invalid shelf type. Must be: wishlist, progress, complete, or dropped' }, 400);
        }

        const upstreamUrl = `https://neodb.social/api/user/${encodeURIComponent(neodbUser)}/shelf/${shelfType}?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`;
        const response = await fetch(upstreamUrl, {
          headers: {
            'Authorization': `Bearer ${neodbToken}`,
            'Accept': 'application/json',
            'User-Agent': 'lok-computer-worker/1.0',
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('NeoDB API error:', response.status, errorText);
          return makeJsonResponse({ error: 'Failed to fetch from NeoDB', details: errorText }, response.status);
        }

        const data = await response.json();
        return makeJsonResponse(data);

      } catch (error) {
        console.error('Error in NeoDB shelf proxy:', error);
        return makeJsonResponse({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, 500);
      }
    }

    return makeNotFoundResponse(request);
  },
};
