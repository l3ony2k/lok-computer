import { describe, expect, test } from "bun:test";
import { DISCOVERY_LINKS, USER_AGENT } from "./http";
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

  test("builds the discovery URLs from the origin the client reached", async () => {
    for (const origin of ["http://localhost:8787", "https://lok-computer-worker.example.workers.dev"]) {
      const response = await worker.fetch(new Request(`${origin}/api`), {}, {});
      const body = await response.json();

      expect(body.documentation).toBe(`${origin}/developers`);
      expect(body.openapi).toBe(`${origin}/openapi.json`);
      expect(body.status).toBe(`${origin}/api/status`);
    }
    const source = await Bun.file("worker/worker.js").text();
    expect(source).not.toContain("https://lok.computer");
  });

  test("sends the same discovery links as the site and the static files", async () => {
    for (const path of ["/api", "/api/status", "/api/not-real"]) {
      const response = await request(path);
      expect(response.headers.get("link")).toBe(DISCOVERY_LINKS);
    }
    const markdown404 = await request("/api/not-real", { headers: { Accept: "text/markdown" } });
    expect(markdown404.headers.get("link")).toBe(DISCOVERY_LINKS);
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
      expect(response.status).toBe(503);
    }
  });
});

/** Replaces fetch and console.error for one test, recording both. */
async function withUpstream(
  reply: (url: string) => Response | Promise<Response>,
  run: (seen: { calls: { url: string; headers: Headers }[]; logged: string }) => Promise<void>,
) {
  const realFetch = globalThis.fetch;
  const realError = console.error;
  const seen = { calls: [] as { url: string; headers: Headers }[], logged: "" };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    seen.calls.push({ url, headers: new Headers(init?.headers) });
    return reply(url);
  }) as typeof fetch;
  console.error = (...args: unknown[]) => {
    seen.logged += args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(" ") + "\n";
  };
  try {
    await run(seen);
  } finally {
    globalThis.fetch = realFetch;
    console.error = realError;
  }
}

const FEDI_ENV = { FEDI_INSTANCE: "https://fedi.example", FEDI_ACCESS_TOKEN: "fedi-token" };
const NEODB_ENV = { NEODB_ACCESS_TOKEN: "neodb-token", NEODB_USERNAME: "lok" };
const proxyCases = [
  { path: "/api/fedi/account?username=lok", env: FEDI_ENV, service: "Fedi" },
  { path: "/api/fedi/statuses?accountId=1", env: FEDI_ENV, service: "Fedi" },
  { path: "/api/neodb/shelf", env: NEODB_ENV, service: "NeoDB" },
];
const jsonReply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("proxy routes share one helper", () => {
  test("answer upstream JSON with the API's headers", async () => {
    await withUpstream(() => jsonReply({ id: "1" }), async () => {
      for (const { path, env } of [proxyCases[0], proxyCases[2]]) {
        const response = await worker.fetch(new Request(`https://lok.computer${path}`), env, {});

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ id: "1" });
        expect(Object.fromEntries(response.headers)).toEqual({
          "access-control-allow-headers": "Content-Type",
          "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
          "access-control-allow-origin": "*",
          "content-type": "application/json; charset=utf-8",
          link: DISCOVERY_LINKS,
          vary: "Accept, Accept-Encoding",
          "x-content-type-options": "nosniff",
        });
      }
    });
  });

  test("send the bearer token, the Worker's User-Agent and each provider's headers", async () => {
    await withUpstream(() => jsonReply([]), async ({ calls }) => {
      for (const { path, env } of proxyCases) {
        await worker.fetch(new Request(`https://lok.computer${path}`), env, {});
      }

      expect(calls.map(({ url }) => url)).toEqual([
        "https://fedi.example/api/v1/accounts/lookup?acct=lok",
        "https://fedi.example/api/v1/accounts/1/statuses?limit=20",
        "https://neodb.social/api/user/lok/shelf/wishlist?page=1&page_size=20",
      ]);
      for (const { headers } of calls) expect(headers.get("user-agent")).toBe(USER_AGENT);
      expect(calls[0].headers.get("authorization")).toBe("Bearer fedi-token");
      expect(calls[0].headers.get("content-type")).toBe("application/json");
      expect(calls[1].headers.get("content-type")).toBe("application/json");
      expect(calls[2].headers.get("authorization")).toBe("Bearer neodb-token");
      expect(calls[2].headers.get("accept")).toBe("application/json");
    });
  });

  test("statuses pass max_id and limit on and drop private and direct posts", async () => {
    const statuses = ["public", "unlisted", "private", "direct"].map((visibility, id) => ({ id: String(id), visibility }));
    await withUpstream(() => jsonReply(statuses), async ({ calls }) => {
      const response = await worker.fetch(
        new Request("https://lok.computer/api/fedi/statuses?accountId=a%2Fb&max_id=9&limit=5"), FEDI_ENV, {});

      expect(calls[0].url).toBe("https://fedi.example/api/v1/accounts/a%2Fb/statuses?limit=5&max_id=9");
      expect(await response.json()).toEqual([statuses[0], statuses[1]]);
    });
  });

  test("missing configuration is a 503 that names no setting", async () => {
    await withUpstream(() => jsonReply({}), async (seen) => {
      for (const { path, service } of proxyCases) {
        const response = await worker.fetch(new Request(`https://lok.computer${path}`), {}, {});

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ error: `${service} is not configured on this server.` });
      }
      expect(seen.calls).toEqual([]);
      expect(seen.logged).toContain("FEDI_ACCESS_TOKEN");
      expect(seen.logged).toContain("NEODB_USERNAME");
    });
  });

  test("invalid parameters are a 400 before any upstream call", async () => {
    await withUpstream(() => jsonReply({}), async ({ calls }) => {
      for (const [path, env, error] of [
        ["/api/fedi/account", FEDI_ENV, "Missing username parameter"],
        ["/api/fedi/statuses", FEDI_ENV, "Missing accountId parameter"],
        ["/api/neodb/shelf?type=secret", NEODB_ENV, "Invalid shelf type. Must be: wishlist, progress, complete, or dropped"],
      ] as const) {
        const response = await worker.fetch(new Request(`https://lok.computer${path}`), env, {});

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error });
      }
      expect(calls).toEqual([]);
    });
  });

  test("a failed upstream reply keeps its status but never its body", async () => {
    const secret = "token abc123 expired at internal-host:5432";
    await withUpstream(() => new Response(secret, { status: 401 }), async (seen) => {
      for (const { path, env, service } of proxyCases) {
        const response = await worker.fetch(new Request(`https://lok.computer${path}`), env, {});
        const text = await response.text();

        expect(response.status).toBe(401);
        expect(JSON.parse(text)).toEqual({ error: `${service} request failed (401).` });
        expect(text).not.toContain("abc123");
      }
      expect(seen.logged).toContain(secret);
    });
  });

  test("an unreachable or unreadable upstream is a 502 without the exception text", async () => {
    const replies = [
      () => Promise.reject(new Error("connect ECONNREFUSED 10.0.0.7:443")),
      () => new Response("<html>gateway</html>", { status: 200 }),
    ];
    for (const reply of replies) {
      await withUpstream(reply, async (seen) => {
        for (const { path, env } of proxyCases) {
          const response = await worker.fetch(new Request(`https://lok.computer${path}`), env, {});
          const text = await response.text();

          expect(response.status).toBe(502);
          expect(Object.keys(JSON.parse(text))).toEqual(["error"]);
          expect(text).not.toContain("ECONNREFUSED");
          expect(text).not.toContain("JSON");
        }
        expect(seen.logged.length).toBeGreaterThan(0);
      });
    }
  });

  test("an unexpected failure is a plain 500", async () => {
    // A statuses reply that is not a list breaks the visibility filter.
    await withUpstream(() => jsonReply({ error: "stack at secret.js:1" }), async (seen) => {
      const response = await worker.fetch(new Request("https://lok.computer/api/fedi/statuses?accountId=1"), FEDI_ENV, {});

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Internal server error" });
      expect(seen.logged).toContain("Error in Fedi proxy");
    });
  });

  test("matches proxy paths exactly", async () => {
    await withUpstream(() => jsonReply([]), async ({ calls }) => {
      for (const path of ["/api/fedi/statuses/extra?accountId=1", "/api/fedi/statusesx?accountId=1", "/api/neodb/shelf/x"]) {
        const response = await worker.fetch(new Request(`https://lok.computer${path}`), FEDI_ENV, {});
        expect(response.status).toBe(404);
      }
      expect(calls).toEqual([]);
    });
  });

  test("only the shared modules name the User-Agent or call fetch", async () => {
    const workerSource = await Bun.file("worker/worker.js").text();
    const jevSource = await Bun.file("worker/jev.js").text();

    expect(workerSource).not.toContain("lok-computer-worker/");
    expect(jevSource).not.toContain("lok-computer-worker/");
    expect(workerSource).not.toMatch(/(?:await|return|=)\s+fetch\(/);
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
    await withUpstream(() => jsonReply({}), async ({ calls }) => {
      const response = await worker.fetch(new Request("https://lok.computer/api/neodb/shelf"), { NEODB_ACCESS_TOKEN: "token" }, {});

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "NeoDB is not configured on this server." });
      expect(calls).toEqual([]);
    });
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

  test("asks search engines not to list the workers.dev copy", async () => {
    for (const path of ["/", "/about", "/missing", "/api/status"]) {
      const copy = await worker.fetch(new Request(`https://lok-computer-worker.l3on.workers.dev${path}`), { ASSETS: assets([]) }, {});
      const real = await worker.fetch(new Request(`https://lok.computer${path}`), { ASSETS: assets([]) }, {});

      expect(copy.headers.get("x-robots-tag")).toBe("noindex");
      expect(real.headers.get("x-robots-tag")).toBeNull();
      expect(copy.status).toBe(real.status);
    }
  });

  test("does not mistake a path that only starts with api for the API", async () => {
    const response = await worker.fetch(new Request("https://lok.computer/apiary"), { ASSETS: assets([]) }, {});

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });
});
