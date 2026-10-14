import { describe, expect, test } from "bun:test";

interface OpenApiOperation {
  operationId?: string;
  description?: string;
  parameters?: Array<{ description?: string; schema?: { type?: string } }>;
  requestBody?: { content?: Record<string, { schema?: object }> };
  responses?: Record<
    string,
    { $ref?: string; description?: string; content?: Record<string, { schema?: object }> }
  >;
}

describe("machine-readable agent resources", () => {
  test("OpenAPI is parseable, typed, and function-calling compatible", async () => {
    const spec = await Bun.file("public/openapi.json").json();
    const operationIds: string[] = [];

    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toContain("lok.computer");
    expect(spec.security).toEqual([]);
    expect(Object.keys(spec.paths).length).toBeGreaterThanOrEqual(7);

    for (const pathItem of Object.values(spec.paths) as Array<Record<string, OpenApiOperation>>) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
        expect(operation.operationId).toBeTruthy();
        expect(operation.description?.length).toBeGreaterThan(20);
        expect(operation.responses).toBeDefined();
        operationIds.push(operation.operationId!);

        for (const parameter of operation.parameters ?? []) {
          expect(parameter.description).toBeTruthy();
          expect(parameter.schema?.type).toBeTruthy();
        }

        if (operation.requestBody) {
          expect(operation.requestBody.content?.["application/json"]?.schema).toBeDefined();
        }

        for (const response of Object.values(operation.responses ?? {})) {
          expect(response.$ref || response.description).toBeTruthy();
          if (response.content?.["application/json"]) {
            expect(response.content["application/json"].schema).toBeDefined();
          }
        }
      }
    }

    expect(new Set(operationIds).size).toBe(operationIds.length);
  });

  test("llms.txt includes selection guidance and all primary resources", async () => {
    const llms = await Bun.file("public/llms.txt").text();

    expect(llms.replaceAll("\r\n", "\n")).toStartWith("# lok.computer\n");
    expect(llms).toContain("## When to use this");
    expect(llms).toContain("https://lok.computer/developers");
    expect(llms).toContain("https://lok.computer/openapi.json");
    expect(llms).toContain("https://lok.computer/agent-instructions.md");
    expect(llms).toContain("https://lok.computer/about");
  });

  test("sitemap is valid XML-shaped content with lastmod dates", async () => {
    const sitemap = await Bun.file("public/sitemap.xml").text();
    const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    const lastModified = [...sitemap.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(
      (match) => match[1],
    );

    expect(sitemap).toStartWith('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(locations).toEqual([
      "https://lok.computer/",
      "https://lok.computer/about",
      "https://lok.computer/contact",
      "https://lok.computer/privacy",
      "https://lok.computer/developers",
    ]);
    expect(lastModified).toHaveLength(locations.length);
    expect(lastModified.every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))).toBe(true);
  });

  test("source homepage contains an H1 and more than 500 characters without JavaScript", async () => {
    const html = await Bun.file("index.html").text();
    const fallback = html.match(
      /<noscript id="agent-static-content">([\s\S]*?)<\/noscript>/,
    )?.[1];
    const text = fallback?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";

    expect(fallback).toContain("<h1>lok.computer</h1>");
    expect(text.length).toBeGreaterThan(500);
    expect(fallback).toContain('href="/developers"');
    expect(fallback).toContain('href="/openapi.json"');
  });

  test("the Worker serves the built site and runs first only where it must", async () => {
    const config = Bun.TOML.parse(await Bun.file("wrangler.toml").text()) as {
      main: string;
      assets: { directory: string; binding: string; not_found_handling: string; run_worker_first: string[] };
    };

    expect(config.main).toBe("worker/worker.js");
    expect(config.assets.directory).toBe("dist");
    expect(config.assets.binding).toBe("ASSETS");
    // A missing file reaches the Worker (Markdown 404), never an SPA fallback.
    expect(config.assets.not_found_handling).toBe("none");
    expect(config.assets.run_worker_first).toEqual(["/", "/api", "/api/*"]);
  });

  test("no Pages-only routing file is published as a static asset", async () => {
    expect(await Bun.file("public/_routes.json").exists()).toBe(false);
  });
});
