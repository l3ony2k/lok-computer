import {
  getAgentDocument,
  makeDeepLinkDocument,
  renderMarkdown,
  renderNoScript,
} from "./agent-content";

interface PagesContext {
  request: Request;
  next(): Promise<Response>;
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

const STATIC_PATHS = new Set([
  "/80x15-dark.gif",
  "/80x15-light.gif",
  "/80x15.gif",
  "/88x31-dark.gif",
  "/88x31-light.gif",
  "/88x31.gif",
  "/agent-instructions.md",
  "/apple-touch-icon.png",
  "/favicon-96x96.png",
  "/favicon.ico",
  "/favicon.svg",
  "/llms-full.txt",
  "/llms.txt",
  "/og-image.webp",
  "/openapi.json",
  "/robots.txt",
  "/site.webmanifest",
  "/sitemap.xml",
  "/sw.js",
  "/system-version.json",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
]);

const DISCOVERY_LINKS = [
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

function withDiscoveryHeaders(response: Response, includeVary: boolean): Response {
  const headers = new Headers(response.headers);
  headers.set("Link", DISCOVERY_LINKS);
  headers.set("X-Content-Type-Options", "nosniff");
  if (includeVary) addVary(headers);
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

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = normalizePath(url.pathname);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return methodNotAllowedResponse(request);
  }

  if (STATIC_PATHS.has(pathname)) {
    return withDiscoveryHeaders(await context.next(), false);
  }

  if (!isKnownUiPath(pathname)) {
    return notFoundResponse(request);
  }

  const document = getAgentDocument(pathname) ?? makeDeepLinkDocument(pathname);
  if (acceptsMarkdown(request)) {
    return textResponse(request, renderMarkdown(document));
  }

  const assetResponse = await context.next();
  const contentType = assetResponse.headers.get("content-type") ?? "";
  if (request.method === "HEAD" || !contentType.includes("text/html")) {
    return withDiscoveryHeaders(assetResponse, true);
  }

  const headers = new Headers(assetResponse.headers);
  headers.delete("Content-Length");
  headers.delete("ETag");
  headers.set("Link", DISCOVERY_LINKS);
  headers.set("X-Content-Type-Options", "nosniff");
  addVary(headers);

  const html = injectAgentContent(await assetResponse.text(), renderNoScript(document));
  return new Response(html, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}
