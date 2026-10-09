import { describe, expect, test } from "bun:test";
import { onRequest, isKnownUiPath } from "./[[path]]";
import { ROUTES } from "../src/config/routes";

const shell = `<!doctype html><html><head><title>lok.computer</title></head><body><div id="root"></div><noscript id="agent-static-content"><main>old fallback</main></noscript></body></html>`;

function createContext(
  path: string,
  init: RequestInit = {},
  assetResponse = new Response(shell, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Vary: "Accept-Encoding",
    },
  }),
) {
  let nextCalls = 0;
  return {
    context: {
      request: new Request(`https://lok.computer${path}`, init),
      next: async () => {
        nextCalls += 1;
        return assetResponse;
      },
    },
    getNextCalls: () => nextCalls,
  };
}

describe("agent-facing Pages routing", () => {
  test("serves meaningful raw homepage HTML without changing the app shell", async () => {
    const { context, getNextCalls } = createContext("/", {
      headers: { Accept: "text/html" },
    });

    const response = await onRequest(context);
    const html = await response.text();
    const visibleFallback = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("vary")?.toLowerCase()).toContain("accept");
    expect(response.headers.get("vary")?.toLowerCase()).toContain("accept-encoding");
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("<h1>lok.computer</h1>");
    expect(visibleFallback.length).toBeGreaterThan(500);
    expect(getNextCalls()).toBe(1);
  });

  test("negotiates homepage Markdown and does not fetch the HTML asset", async () => {
    const { context, getNextCalls } = createContext("/", {
      headers: { Accept: "text/markdown" },
    });

    const response = await onRequest(context);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("vary")).toContain("Accept");
    expect(response.headers.get("vary")).toContain("Accept-Encoding");
    expect(body).toStartWith("# lok.computer\n");
    expect(body).toContain("## When to use lok.computer");
    expect(body.length).toBeGreaterThan(1000);
    expect(getNextCalls()).toBe(0);
  });

  test("honors a q=0 Markdown exclusion", async () => {
    const { context, getNextCalls } = createContext("/", {
      headers: { Accept: "text/markdown;q=0, text/html" },
    });

    const response = await onRequest(context);

    expect(response.headers.get("content-type")).toContain("text/html");
    expect(getNextCalls()).toBe(1);
  });

  test("returns a real Markdown 404 for an unknown path", async () => {
    const { context, getNextCalls } = createContext("/definitely-not-a-resource");

    const response = await onRequest(context);
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(body).toContain("# 404: resource not found");
    expect(body).toContain("/sitemap.xml");
    expect(getNextCalls()).toBe(0);
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
      const { context, getNextCalls } = createContext(path, {
        headers: { Accept: "text/html" },
      });
      const response = await onRequest(context);

      expect(response.status).toBe(200);
      expect(getNextCalls()).toBe(1);
    }
  });

  test("injects substantial no-JavaScript trust and developer content", async () => {
    for (const path of ["/about", "/contact", "/privacy", "/developers"]) {
      const { context } = createContext(path, {
        headers: { Accept: "text/html" },
      });
      const response = await onRequest(context);
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

  test("passes predictable machine-readable files to static assets", async () => {
    const asset = new Response("# lok.computer", {
      headers: { "Content-Type": "text/plain" },
    });
    const { context, getNextCalls } = createContext("/llms.txt", {}, asset);

    const response = await onRequest(context);

    expect(response.status).toBe(200);
    expect(response.headers.get("link")).toContain("/openapi.json");
    expect(await response.text()).toBe("# lok.computer");
    expect(getNextCalls()).toBe(1);
  });

  test("rejects unsupported methods without invoking the app", async () => {
    const { context, getNextCalls } = createContext("/", { method: "POST" });

    const response = await onRequest(context);

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
    expect(getNextCalls()).toBe(0);
  });
});
