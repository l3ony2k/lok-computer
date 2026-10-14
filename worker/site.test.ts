import { describe, expect, test } from "bun:test";
import { DISCOVERY_LINKS, handleSiteRequest, isKnownUiPath } from "./site";
import { ROUTES } from "../src/config/routes";

const shell = `<!doctype html><html><head><title>lok.computer</title></head><body><div id="root"></div><noscript id="agent-static-content"><main>old fallback</main></noscript></body></html>`;

function createContext(
  path: string,
  init: RequestInit = {},
  assetResponse = new Response(shell, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=0, must-revalidate",
      ETag: '"shell"',
      Vary: "Accept-Encoding",
    },
  }),
) {
  const assetPaths: string[] = [];
  const request = new Request(`https://lok.computer${path}`, init);
  const assets = {
    fetch: async (input: Request | URL | string) => {
      const url = input instanceof Request ? input.url : String(input);
      assetPaths.push(new URL(url).pathname);
      return assetResponse;
    },
  };
  return {
    handle: () => handleSiteRequest(request, assets),
    getAssetCalls: () => assetPaths.length,
    getAssetPaths: () => assetPaths,
  };
}

describe("agent-facing site routing", () => {
  test("serves meaningful raw homepage HTML without changing the app shell", async () => {
    const { handle, getAssetCalls } = createContext("/", {
      headers: { Accept: "text/html" },
    });

    const response = await handle();
    const html = await response.text();
    const visibleFallback = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("vary")?.toLowerCase()).toContain("accept");
    expect(response.headers.get("vary")?.toLowerCase()).toContain("accept-encoding");
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("<h1>lok.computer</h1>");
    expect(visibleFallback.length).toBeGreaterThan(500);
    expect(getAssetCalls()).toBe(1);
  });

  test("negotiates homepage Markdown and does not fetch the HTML asset", async () => {
    const { handle, getAssetCalls } = createContext("/", {
      headers: { Accept: "text/markdown" },
    });

    const response = await handle();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("vary")).toContain("Accept");
    expect(response.headers.get("vary")).toContain("Accept-Encoding");
    expect(body).toStartWith("# lok.computer\n");
    expect(body).toContain("## When to use lok.computer");
    expect(body.length).toBeGreaterThan(1000);
    expect(getAssetCalls()).toBe(0);
  });

  test("honors a q=0 Markdown exclusion", async () => {
    const { handle, getAssetCalls } = createContext("/", {
      headers: { Accept: "text/markdown;q=0, text/html" },
    });

    const response = await handle();

    expect(response.headers.get("content-type")).toContain("text/html");
    expect(getAssetCalls()).toBe(1);
  });

  test("returns a real Markdown 404 for an unknown path", async () => {
    const { handle, getAssetCalls } = createContext("/definitely-not-a-resource");

    const response = await handle();
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(body).toContain("# 404: resource not found");
    expect(body).toContain("/sitemap.xml");
    expect(getAssetCalls()).toBe(0);
  });

  test("knows every route the desktop can open", () => {
    for (const { pattern } of ROUTES) {
      const path = "/" + pattern.replace(/:[a-zA-Z]+/g, "example");
      expect(isKnownUiPath(path), `${pattern} is not a known UI path`).toBeTrue();
    }
    expect(isKnownUiPath("/open")).toBeTrue();
  });

  test("preserves static and dynamic desktop deep links", async () => {
    for (const path of ["/arena", "/explorer/example-channel", "/block/123", "/media", "/open"]) {
      const { handle, getAssetCalls } = createContext(path, {
        headers: { Accept: "text/html" },
      });
      const response = await handle();

      expect(response.status).toBe(200);
      expect(getAssetCalls()).toBe(1);
    }
  });

  test("injects substantial no-JavaScript trust and developer content", async () => {
    for (const path of ["/about", "/contact", "/privacy", "/developers"]) {
      const { handle } = createContext(path, {
        headers: { Accept: "text/html" },
      });
      const response = await handle();
      const html = await response.text();
      const fallback = html.match(
        /<noscript id="agent-static-content">([\s\S]*?)<\/noscript>/,
      )?.[1];
      const text = fallback?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";

      expect(response.status).toBe(200);
      expect(html).toContain("<h1>");
      expect(text.length).toBeGreaterThan(500);
    }
  });

  test("serves every deep link from the shell at / and never caches it", async () => {
    const { handle, getAssetPaths } = createContext("/explorer/example-channel", {
      headers: { Accept: "text/html" },
    });

    const response = await handle();

    expect(getAssetPaths()).toEqual(["/"]);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-cache, no-store, must-revalidate");
    expect(response.headers.get("etag")).toBeNull();
    expect(response.headers.get("link")).toBe(DISCOVERY_LINKS);
  });

  test("answers HEAD with the shell's headers and no body", async () => {
    const { handle } = createContext("/about", { method: "HEAD" });

    const response = await handle();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-length")).toBeNull();
    expect(await response.text()).toBe("");
  });

  test("returns the Markdown 404 for a missing file, never the shell", async () => {
    for (const path of ["/assets/index-missing.js", "/theme-previews/missing.webp", "/index.htm"]) {
      const { handle, getAssetCalls } = createContext(path);

      const response = await handle();

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
      expect(getAssetCalls()).toBe(0);
    }
  });

  test("static files carry the same discovery links from public/_headers", async () => {
    const headers = await Bun.file("public/_headers").text();
    const allFiles = headers.match(/^\/\*\n((?:[ \t]+.*\n)+)/m)?.[1] ?? "";

    expect(allFiles).toContain(`Link: ${DISCOVERY_LINKS}`);
    expect(allFiles).toContain("X-Content-Type-Options: nosniff");
  });

  test("rejects unsupported methods without invoking the app", async () => {
    const { handle, getAssetCalls } = createContext("/", { method: "POST" });

    const response = await handle();

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
    expect(getAssetCalls()).toBe(0);
  });
});
