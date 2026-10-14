import { describe, expect, test } from "bun:test";
import worker from "./worker.js";

function request(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`https://lok.computer${path}`, init), {}, {});
}

describe("public Worker discovery", () => {
  test("returns API discovery without credentials", async () => {
    const response = await request("/api");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("link")).toContain("/openapi.json");
    expect(response.headers.get("vary")).toBe("Accept, Accept-Encoding");
    expect(body).toEqual({
      name: "lok.computer public API",
      description: "Public REST endpoints used by the lok.computer browser desktop.",
      documentation: "https://lok.computer/developers",
      openapi: "https://lok.computer/openapi.json",
      status: "https://lok.computer/api/status",
    });
  });

  test("returns a credential-free health response", async () => {
    const response = await request("/api/status");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: "lok.computer public API",
      status: "ok",
    });
  });

  test("rejects unsupported status methods", async () => {
    const response = await request("/api/status", { method: "POST" });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
    expect(await response.json()).toEqual({ error: "Method not allowed" });
  });

  test("rejects non-read methods before contacting upstream providers", async () => {
    for (const path of [
      "/api/fedi/account?username=lok",
      "/api/fedi/statuses?accountId=1",
      "/api/neodb/shelf",
    ]) {
      const response = await request(path, { method: "POST" });

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET, HEAD");
      expect(await response.json()).toEqual({ error: "Method not allowed" });
    }
  });

  test("no longer serves the removed chat and Bluesky routes", async () => {
    for (const [path, method] of [["/api/chat", "POST"], ["/api/bsky/feed", "GET"]] as const) {
      const response = await request(path, { method, headers: { Accept: "application/json" } });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Not Found" });
    }
  });

  test("negotiates a Markdown API 404", async () => {
    const response = await request("/api/not-real", {
      headers: { Accept: "text/markdown" },
    });
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("vary")).toBe("Accept, Accept-Encoding");
    expect(body).toContain("# 404: API resource not found");
    expect(body).toContain("/openapi.json");
  });

  test("retains JSON for ordinary API 404 responses", async () => {
    const response = await request("/api/not-real", {
      headers: { Accept: "application/json" },
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.json()).toEqual({ error: "Not Found" });
  });
});

describe("proxy rate limiting", () => {
  const proxyPaths = ["/api/fedi/account?username=lok", "/api/fedi/statuses?accountId=1", "/api/neodb/shelf"];

  test("answers 429 from the proxy budget before reading configuration", async () => {
    const keys: string[] = [];
    const limiter = { limit: async ({ key }: { key: string }) => { keys.push(key); return { success: false }; } };
    for (const path of proxyPaths) {
      const response = await worker.fetch(new Request(`https://lok.computer${path}`, {
        headers: { "CF-Connecting-IP": "203.0.113.7" },
      }), { PROXY_RATE_LIMITER: limiter }, {});

      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({ error: "Too many requests. Try again in a minute." });
    }
    expect(keys).toEqual(["203.0.113.7", "203.0.113.7", "203.0.113.7"]);
  });

  test("lets requests through on budget and ignores the Ask AI limiter", async () => {
    const env = {
      PROXY_RATE_LIMITER: { limit: async () => ({ success: true }) },
      JEV_RATE_LIMITER: { limit: async () => ({ success: false }) },
    };
    for (const path of proxyPaths) {
      const response = await worker.fetch(new Request(`https://lok.computer${path}`), env, {});

      // No upstream credentials in tests: the route reaches its configuration check.
      expect(response.status).toBe(500);
    }
  });
});

describe("NeoDB shelf proxy", () => {
  test("reads the shelf of the configured NeoDB user", async () => {
    const realFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ data: [] }), { headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try {
      const env = { NEODB_ACCESS_TOKEN: "token", NEODB_USERNAME: "someone else" };
      const response = await worker.fetch(new Request("https://lok.computer/api/neodb/shelf?type=complete"), env, {});

      expect(response.status).toBe(200);
      expect(calls).toEqual(["https://neodb.social/api/user/someone%20else/shelf/complete?page=1&page_size=20"]);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("refuses without a NeoDB user", async () => {
    const response = await worker.fetch(new Request("https://lok.computer/api/neodb/shelf"), { NEODB_ACCESS_TOKEN: "token" }, {});

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "NEODB_USERNAME not configured" });
  });
});

describe("one Worker for the site and the API", () => {
  const assets = (calls: string[]) => ({
    fetch: async (input: Request | URL | string) => {
      calls.push(new URL(input instanceof Request ? input.url : String(input)).pathname);
      return new Response("<!doctype html><html><body></body></html>", {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  });

  test("sends /api and everything under it to the API, never to the assets", async () => {
    const calls: string[] = [];
    for (const path of ["/api", "/api/", "/api/status"]) {
      const response = await worker.fetch(new Request(`https://lok.computer${path}`), { ASSETS: assets(calls) }, {});

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    }
    expect(calls).toEqual([]);
  });

  test("serves the site through the assets binding", async () => {
    const calls: string[] = [];
    const response = await worker.fetch(new Request("https://lok.computer/about"), { ASSETS: assets(calls) }, {});

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<noscript id="agent-static-content">');
    expect(calls).toEqual(["/"]);
  });

  test("does not mistake a path that only starts with api for the API", async () => {
    const response = await worker.fetch(new Request("https://lok.computer/apiary"), { ASSETS: assets([]) }, {});

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });
});
