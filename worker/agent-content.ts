import type { AgentDocument } from "../src/config/documents.ts";

export {
  getAgentDocument,
  renderMarkdown,
  type AgentDocument,
  type AgentSection,
} from "../src/config/documents.ts";

export function makeDeepLinkDocument(pathname: string): AgentDocument {
  return {
    title: `lok.computer desktop deep link: ${pathname}`,
    summary:
      "This URL opens a specific application inside the lok.computer browser desktop when JavaScript is available.",
    sections: [
      {
        heading: "Machine-readable alternatives",
        paragraphs: [
          "Agents should use llms.txt to discover stable text resources and openapi.json for structured API access. The desktop deep link is intended for interactive browsing; it does not add a separate API operation. The root document describes the site's purpose and the developer resource lists the public integration surface.",
        ],
        links: [
          { label: "Agent index", href: "/llms.txt" },
          { label: "Developer resources", href: "/developers" },
          { label: "OpenAPI", href: "/openapi.json" },
        ],
      },
    ],
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderNoScript(document: AgentDocument): string {
  const sections = document.sections
    .map((section) => {
      const paragraphs = section.paragraphs
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join("");
      const links = section.links?.length
        ? `<ul>${section.links
            .map(
              (link) =>
                `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`,
            )
            .join("")}</ul>`
        : "";
      return `<section><h2>${escapeHtml(section.heading)}</h2>${paragraphs}${links}</section>`;
    })
    .join("");

  return `<noscript id="agent-static-content"><style>#initial-boot-screen{display:none!important}#agent-document{max-width:760px;margin:0 auto;padding:32px 20px;color:#222;background:#f0f0f0;font:16px/1.6 system-ui,sans-serif}#agent-document h1,#agent-document h2{letter-spacing:0}#agent-document a{color:#0645ad}</style><main id="agent-document"><h1>${escapeHtml(document.title)}</h1><p>${escapeHtml(document.summary)}</p>${sections}</main></noscript>`;
}
