import {
  getAgentDocument,
  makeDeepLinkDocument,
  renderMarkdown,
  renderNoScript,
} from "./agent-content";

/** The static assets binding (`[assets] binding = "ASSETS"` in wrangler.toml). */
export interface AssetFetcher {
  fetch(input: Request | URL | string): Promise<Response>;
}

const UI_PATHS = new Set([
  "/",
  "/about",
  "/ai",
  "/arena",
  "/bsky",
  "/config",
  "/console",
  "/contact",
  "/developers",
  "/docs",
  "/fedi",
  "/guestbook",
  "/image",
  "/links",
  "/media",
  "/open",
  "/privacy",
  "/shelf",
  "/weather",
  "/notepad",
  "/clock",
  "/calculator",
  "/chance",
  "/web",
]);

// public/_headers sends the same value on every static file (site.test.ts checks).
export const DISCOVERY_LINKS = [
  '</llms.txt>; rel="alternate"; type="text/markdown"',
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(", ");

function normalizePath(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

export function isKnownUiPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return (
    UI_PATHS.has(path) ||
    /^\/explorer\/[^/]+$/.test(path) ||
    /^\/block\/[^/]+$/.test(path)
  );
}

export function acceptsMarkdown(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.split(",").some((entry) => {
    const [mediaType, ...parameters] = entry.trim().toLowerCase().split(";");
    if (mediaType !== "text/markdown") return false;
    const quality = parameters
      .map((parameter) => parameter.trim())
      .find((parameter) => parameter.startsWith("q="));
    return quality ? Number.parseFloat(quality.slice(2)) > 0 : true;
  });
}

function addVary(headers: Headers): void {
  const values = (headers.get("vary") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const normalized = new Set(values.map((value) => value.toLowerCase()));

  if (!normalized.has("accept")) values.push("Accept");
  if (!normalized.has("accept-encoding")) values.push("Accept-Encoding");
  headers.set("Vary", values.join(", "));
}

function responseHeaders(contentType: string): Headers {
  const headers = new Headers({
    "Cache-Control": "public, max-age=300",
    "Content-Type": contentType,
    Link: DISCOVERY_LINKS,
    "X-Content-Type-Options": "nosniff",
  });
  addVary(headers);
  return headers;
}

function textResponse(request: Request, body: string, status = 200): Response {
  return new Response(request.method === "HEAD" ? null : body, {
    status,
    headers: responseHeaders("text/markdown; charset=utf-8"),
  });
}

function notFoundResponse(request: Request): Response {
  const body = [
    "# 404: resource not found",
    "",
    "The requested lok.computer resource does not exist.",
    "",
    "- [Agent index](/llms.txt)",
    "- [Developer resources](/developers)",
    "- [Sitemap](/sitemap.xml)",
    "",
  ].join("\n");
  return textResponse(request, body, 404);
}

function methodNotAllowedResponse(request: Request): Response {
  const response = textResponse(
    request,
    "# 405: method not allowed\n\nThis site resource supports GET and HEAD.\n",
    405,
  );
  response.headers.set("Allow", "GET, HEAD");
  return response;
}

// The HTML shell is never cached: a stale shell would point at hashed assets
// from an older build.
const SHELL_CACHE_CONTROL = "no-cache, no-store, must-revalidate";

function withDiscoveryHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Link", DISCOVERY_LINKS);
  headers.set("X-Content-Type-Options", "nosniff");
  addVary(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function injectAgentContent(html: string, content: string): string {
  const marker = /<noscript id="agent-static-content">[\s\S]*?<\/noscript>/;
  if (marker.test(html)) return html.replace(marker, content);
  return html.replace("</body>", `${content}</body>`);
}

/**
 * Everything outside /api. Static files never reach this: the asset layer
 * serves them first (with the headers in public/_headers) and runs the Worker
 * only for "/" (`run_worker_first`) and for paths no file matches. Those are
 * the desktop's deep links, which get the HTML shell with agent-readable
 * content (or Markdown on request), and everything else, which is a 404.
 */
export async function handleSiteRequest(request: Request, assets: AssetFetcher): Promise<Response> {
  const url = new URL(request.url);
  const pathname = normalizePath(url.pathname);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return methodNotAllowedResponse(request);
  }

  if (!isKnownUiPath(pathname)) {
    return notFoundResponse(request);
  }

  const document = getAgentDocument(pathname) ?? makeDeepLinkDocument(pathname);
  if (acceptsMarkdown(request)) {
    return textResponse(request, renderMarkdown(document));
  }

  // Every deep link is the same single-page shell: index.html, served at "/".
  const shellResponse = await assets.fetch(new Request(new URL("/", url), request));
  const contentType = shellResponse.headers.get("content-type") ?? "";
  if (!shellResponse.ok || !contentType.includes("text/html")) {
    return withDiscoveryHeaders(shellResponse);
  }

  const headers = new Headers(shellResponse.headers);
  headers.delete("Content-Length");
  headers.delete("ETag");
  // The asset layer sends a bare "text/html"; name the charset as Pages did.
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", SHELL_CACHE_CONTROL);
  headers.set("Link", DISCOVERY_LINKS);
  headers.set("X-Content-Type-Options", "nosniff");
  addVary(headers);

  if (request.method === "HEAD") {
    return new Response(null, { status: shellResponse.status, headers });
  }

  const html = injectAgentContent(await shellResponse.text(), renderNoScript(document));
  return new Response(html, {
    status: shellResponse.status,
    statusText: shellResponse.statusText,
    headers,
  });
}
