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
      "/api/bsky/feed",
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
