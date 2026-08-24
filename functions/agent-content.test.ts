import { describe, expect, test } from "bun:test";
import { getAgentDocument, renderMarkdown } from "./agent-content";

describe("agent documents", () => {
  test("publishes substantial trust anchors with product-specific titles", () => {
    for (const path of ["/about", "/contact", "/privacy"]) {
      const document = getAgentDocument(path);
      expect(document).toBeDefined();
      const markdown = renderMarkdown(document!);
      expect(markdown.length).toBeGreaterThan(500);
      expect(markdown.toLowerCase()).toContain("lok.computer");
    }
  });

  test("publishes developer quickstart, authentication, and sandbox guidance", () => {
    const markdown = renderMarkdown(getAgentDocument("/developers")!);

    expect(markdown).toContain("GET https://lok.computer/api/status");
    expect(markdown).toContain("No client API key");
    expect(markdown).toContain("no separate write sandbox");
    expect(markdown).toContain("https://lok.computer/openapi.json");
  });
});
