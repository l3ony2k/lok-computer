import {
  USER_AGENT,
  errorResponse,
  isRateLimited,
  jsonResponse,
  methodNotAllowedResponse,
  rateLimitedResponse,
  type RateLimiter,
} from "./http";

/** The settings once checked: every one is set. */
type Present<Config> = { [Name in keyof Config]: string };

/** What one credentialed read-only proxy route needs. */
export interface ProxyRoute<Config extends Record<string, string | undefined>> {
  /** The provider's name in client messages and logs ("Fedi", "NeoDB"). */
  service: string;
  limiter: RateLimiter | undefined;
  /** Every setting the route needs; any missing one answers 503. */
  config: Config;
  /** The secret sent as `Authorization: Bearer`. */
  token: (config: Present<Config>) => string;
  /** The upstream URL, or `{ invalid }` (a client-safe message) for a 400. */
  upstream: (url: URL, config: Present<Config>) => string | { invalid: string };
  /** Extra request headers for this provider. */
  headers?: Record<string, string>;
  /** Reshapes the upstream JSON before it reaches the client. */
  transform?: (data: unknown) => unknown;
}

function missingSettings(config: Record<string, string | undefined>): string[] {
  return Object.entries(config)
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

/**
 * The steps every proxy route shares: GET/HEAD only, the per-IP budget, the
 * configuration check, the authenticated upstream fetch, and one error shape.
 * Upstream replies and exception text are logged, never sent to the client.
 * A failed upstream reply keeps its status; a network failure or unreadable
 * reply is a 502, missing configuration a 503.
 */
export async function proxyJson<Config extends Record<string, string | undefined>>(
  request: Request,
  route: ProxyRoute<Config>,
): Promise<Response> {
  const { service } = route;
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return methodNotAllowedResponse("GET, HEAD");
    }
    if (await isRateLimited(request, route.limiter)) return rateLimitedResponse();

    const missing = missingSettings(route.config);
    if (missing.length > 0) {
      console.error(`${service} proxy is missing configuration:`, missing.join(", "));
      return errorResponse(`${service} is not configured on this server.`, 503);
    }
    const config = route.config as Present<Config>;

    const target = route.upstream(new URL(request.url), config);
    if (typeof target !== "string") return errorResponse(target.invalid, 400);

    let response: Response;
    try {
      response = await fetch(target, {
        headers: {
          Authorization: `Bearer ${route.token(config)}`,
          ...route.headers,
          "User-Agent": USER_AGENT,
        },
      });
    } catch (error) {
      console.error(`${service} is unreachable:`, error);
      return errorResponse(`${service} is unreachable right now.`, 502);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`${service} API error:`, response.status, detail);
      return errorResponse(`${service} request failed (${response.status}).`, response.status);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      console.error(`${service} returned an unreadable reply:`, error);
      return errorResponse(`${service} returned an unreadable reply.`, 502);
    }

    return jsonResponse(route.transform ? route.transform(data) : data);
  } catch (error) {
    console.error(`Error in ${service} proxy:`, error);
    return errorResponse("Internal server error", 500);
  }
}
