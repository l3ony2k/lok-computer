/**
 * Response building blocks shared by the API (worker.js), the upstream proxies
 * (proxy.ts) and the site (site.ts).
 */

/**
 * The agent discovery links, sent on every response the Worker builds and, via
 * public/_headers, on every static file (site.test.ts checks).
 */
export const DISCOVERY_LINKS = [
  '</llms.txt>; rel="alternate"; type="text/markdown"',
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</developers>; rel="help"',
].join(", ");

/** Sent to every upstream service the Worker calls on a visitor's behalf. */
export const USER_AGENT = "lok-computer-worker/1.0";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** The headers every Worker-built response carries, for a given body type. */
export function baseHeaders(contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    Link: DISCOVERY_LINKS,
    Vary: "Accept, Accept-Encoding",
    "X-Content-Type-Options": "nosniff",
  };
}

/** A JSON API response, open to any origin. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...baseHeaders("application/json; charset=utf-8"), ...CORS_HEADERS },
  });
}

/**
 * The one error shape of the API: `{ error }`, plus `code` when a client can act
 * on the reason. `message` is shown to visitors, so it never carries upstream
 * replies, stack text or configuration names; log those instead.
 */
export function errorResponse(message: string, status: number, code?: string): Response {
  return jsonResponse(code ? { error: message, code } : { error: message }, status);
}

export function methodNotAllowedResponse(allow: string): Response {
  const response = errorResponse("Method not allowed", 405);
  response.headers.set("Allow", allow);
  return response;
}

export const rateLimitedResponse = (): Response =>
  errorResponse("Too many requests. Try again in a minute.", 429);

/** A Cloudflare rate limiting binding. */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Each client IP gets a budget: Ask AI calls spend planner and Jev credits
 * (JEV_RATE_LIMITER); the Fedi and NeoDB proxies spend a personal token's API
 * quota (PROXY_RATE_LIMITER). Without the binding, as in tests, there is no limit.
 */
export async function isRateLimited(request: Request, limiter: RateLimiter | undefined): Promise<boolean> {
  if (!limiter) return false;
  const key = request.headers.get("CF-Connecting-IP") ?? "anonymous";
  const { success } = await limiter.limit({ key });
  return !success;
}
