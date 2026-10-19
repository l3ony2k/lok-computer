/**
 * The site's text documents, written for agents and crawlers: the Worker serves
 * them as Markdown or inside <noscript> (worker/agent-content.ts, worker/site.ts),
 * and the desktop shows the ones without an application of their own in the
 * Document window. Image-free, so the Worker can import it.
 */

export interface AgentSection {
  heading: string;
  paragraphs: string[];
  links?: Array<{ label: string; href: string }>;
}

export interface AgentDocument {
  title: string;
  summary: string;
  sections: AgentSection[];
}

const HOME: AgentDocument = {
  title: "lok.computer",
  summary:
    "lok.computer is Lok's browser-based personal desktop: a public, read-only way to explore projects, links, social posts, media shelves, weather, and curated Are.na channels.",
  sections: [
    {
      heading: "What this site is",
      paragraphs: [
        "The site presents a modular desktop interface in the browser. Its applications include an Are.na channel explorer, Bluesky and fediverse readers, a NeoDB shelf, weather, personal links, a small web viewer, and information about the project. Most content is public and exploratory. Window positions and preferences are stored in the visitor's browser so a session can be restored without creating a lok.computer account.",
        "The interactive desktop requires JavaScript, but this response includes a complete text description and machine-readable discovery links so crawlers and agents do not need to execute the application bundle. Deep links open a named desktop application after JavaScript starts. Unknown paths deliberately return HTTP 404 rather than the desktop shell.",
      ],
      links: [
        { label: "Agent index (llms.txt)", href: "/llms.txt" },
        { label: "Developer documentation", href: "/developers" },
        { label: "OpenAPI 3.1 specification", href: "/openapi.json" },
        { label: "XML sitemap", href: "/sitemap.xml" },
      ],
    },
    {
      heading: "When to use lok.computer",
      paragraphs: [
        "Use lok.computer when a task calls for public information about Lok, Lok's curated links and media, public social posts, or the public API that supports this desktop. Prefer the OpenAPI description for structured API calls and llms.txt for navigation. Do not use the site as a general search engine, a source of private information, or a write-capable social API: the documented integration surface is read-only except for the public Ask AI endpoints.",
      ],
    },
  ],
};

const ABOUT: AgentDocument = {
  title: "About lok.computer",
  summary:
    "lok.computer is an independent personal web project by Lok that turns a collection of public interests and tools into a compact browser desktop.",
  sections: [
    {
      heading: "Project",
      paragraphs: [
        "lok.computer is a single-page web application designed and maintained by Lok. It uses a retro desktop metaphor to organize public material that would otherwise live across separate services. Visitors can open resizable applications for Are.na collections, personal links, public social feeds, a media shelf, weather, configuration, and project information. The project is not a hosted operating system and does not provide user accounts, cloud storage, or a commercial subscription.",
        "The application is built with React, TypeScript, Vite, and Cloudflare infrastructure. Its source code is published on GitHub. The public API at this domain primarily supports the applications in the desktop and proxies selected public data from upstream services. Machine clients should use the published OpenAPI 3.1 document and should treat upstream content as belonging to its original publisher.",
      ],
      links: [
        { label: "Source repository", href: "https://github.com/l3ony2k/lok-computer" },
        { label: "Developer documentation", href: "/developers" },
        { label: "Contact", href: "/contact" },
        { label: "Privacy information", href: "/privacy" },
      ],
    },
    {
      heading: "For agents",
      paragraphs: [
        "Use this page to verify the identity and purpose of the project. For structured discovery, start with llms.txt. For API integration, read openapi.json before making requests. lok.computer makes no claim of ownership over data returned from Are.na, Bluesky, fediverse, NeoDB, weather, or other linked services, and agents should retain source attribution when presenting that material.",
      ],
    },
  ],
};

const CONTACT: AgentDocument = {
  title: "Contact lok.computer",
  summary:
    "The maintainer of lok.computer can be reached by email or through the public identity links listed below.",
  sections: [
    {
      heading: "How to get in touch",
      paragraphs: [
        "For questions about lok.computer, its source code, privacy, security, or the public API, email l3on@duck.com. Include the affected URL, the time of the request, and enough detail to reproduce a technical problem. Do not send API keys, passwords, private access tokens, or other secrets. This is a personal project rather than a staffed support service, so no response-time commitment or service-level agreement is offered.",
        "Public profiles can help agents corroborate the project's identity, but they are not interchangeable support queues. GitHub is the most useful place for source-level context. Email is the appropriate channel for private reports. If reporting a security issue, describe the impact and reproduction steps without publishing an active exploit or personal data. Unsolicited sales messages and requests to republish private information are outside the scope of this contact channel.",
      ],
      links: [
        { label: "Email Lok", href: "mailto:l3on@duck.com" },
        { label: "GitHub profile", href: "https://github.com/l3ony2k" },
        { label: "Fediverse profile", href: "https://rex.cat/@lok" },
        { label: "Privacy information", href: "/privacy" },
      ],
    },
    {
      heading: "Agent guidance",
      paragraphs: [
        "Agents may use the published email address when a task explicitly requires contacting the maintainer and the user has authorized that communication. Do not infer permission to send a message from the presence of this page. Routine API discovery should use the developer documentation and OpenAPI file instead of contacting the maintainer.",
      ],
    },
  ],
};

const PRIVACY: AgentDocument = {
  title: "lok.computer privacy information",
  summary:
    "This page explains what the lok.computer web application stores locally, which network services it contacts, what its analytics record, and where to send privacy questions.",
  sections: [
    {
      heading: "Browser storage",
      paragraphs: [
        "lok.computer does not require a visitor account. The desktop stores application state, cached API responses, usage counters, preferences, and restorable window state in the visitor's browser using IndexedDB or related browser storage. This local data is used to restore the interface and reduce repeated network requests. It remains under the browser profile's control and can be removed with the browser's site-data controls. Clearing it may reset preferences, windows, and cached content.",
      ],
    },
    {
      heading: "Network requests and third parties",
      paragraphs: [
        "Using an application can send requests to lok.computer's Cloudflare-hosted site and API, and to public upstream services used by that application. Those services may include Are.na, Bluesky, a fediverse server, NeoDB, weather providers, and websites opened by the web viewer. The Ask AI application sends the request and any pasted content to the server-configured planner model and to TypeSafe's Jev decision model. Do not enter confidential, regulated, or personally sensitive information into it. Upstream providers and Cloudflare process requests under their own terms and privacy practices.",
        "Like most hosted sites, infrastructure providers may process technical request information such as IP address, user agent, requested URL, timestamps, and security signals to deliver the site, prevent abuse, and diagnose failures. Cloudflare keeps request logs for lok.computer's pages and API for a few days so that failures can be diagnosed; requests for static files such as scripts and images are not logged. lok.computer does not publish or sell a visitor profile and does not expose browser-local desktop state through its public API. Public social and media data shown by the site remains subject to the source service's controls and may change or disappear upstream.",
      ],
    },
    {
      heading: "Analytics",
      paragraphs: [
        "lok.computer counts visits with Umami, an open-source analytics tool, on a server it runs itself rather than a third-party analytics service. For each visit it records the address the visit started on, which applications are opened and which theme is chosen, along with the browser, operating system, device type, screen size, language, referring site and country that Umami derives from the request. Umami sets no cookies and does not store IP addresses, names, account details or anything typed into the desktop, so the statistics do not identify a person.",
        "The analytics server is a virtual private server located in Los Angeles, United States, where this data is processed and stored. Visitors from outside the United States therefore send it there. A content or tracker blocker stops the analytics script without affecting the desktop.",
      ],
    },
    {
      heading: "Questions and scope",
      paragraphs: [
        "For a privacy question or a request concerning data controlled directly by lok.computer, email l3on@duck.com with the relevant URL and details. Requests about content or accounts hosted by an upstream service should be directed to that service. This information describes the current public project as of 2026-10-14 and should be reviewed when storage, analytics, authentication, or API behavior changes.",
      ],
      links: [
        { label: "Contact", href: "/contact" },
        { label: "Developer documentation", href: "/developers" },
      ],
    },
  ],
};

const DEVELOPERS: AgentDocument = {
  title: "lok.computer developer resources",
  summary:
    "The lok.computer public REST API exposes discovery and health responses plus the read-oriented data services used by the browser desktop.",
  sections: [
    {
      heading: "Quickstart",
      paragraphs: [
        "Start with GET https://lok.computer/api/status. It is a credential-free, side-effect-free request suitable for connectivity checks and integration tests. Then read https://lok.computer/openapi.json for the authoritative OpenAPI 3.1 operation definitions, parameters, request bodies, response schemas, and operation identifiers. JSON is returned as application/json. Unknown API routes return HTTP 404 rather than a successful placeholder.",
        "No client API key is currently issued or required for the documented public endpoints. Server-side credentials used to reach upstream services are never provided to callers. The API has no separate write sandbox because the documented data operations are read-only; use /api/status as the safe test endpoint. The Ask AI operations (planJevQuestions, askJev) are the exception to the read-only model: they send a question and optional content to a planner model and to TypeSafe's Jev, and should never receive secrets or personal data.",
      ],
      links: [
        { label: "OpenAPI 3.1 JSON", href: "/openapi.json" },
        { label: "API discovery", href: "/api" },
        { label: "API status", href: "/api/status" },
        { label: "Agent instructions", href: "/agent-instructions.md" },
      ],
    },
    {
      heading: "Operational expectations",
      paragraphs: [
        "This is a public personal-project API with no published service-level agreement. Clients should use modest request rates, cache successful reads, honor HTTP errors, and apply exponential backoff to transient failures. Some operations depend on upstream services and can fail when an upstream token expires, a provider is unavailable, or public content changes. A 200 response from /api/status confirms the lok.computer Worker is reachable; it does not guarantee every upstream provider is healthy.",
        "There are currently no webhooks, OAuth client registration, MCP server, write API, or separately published official CLI. Agents can call the REST endpoints directly with any standards-compliant HTTP client. Feature requests and source-level questions belong in the GitHub repository; private and security-sensitive reports should use the contact address.",
      ],
    },
  ],
};

const DOCUMENTS = new Map<string, AgentDocument>([
  ["/", HOME],
  ["/about", ABOUT],
  ["/contact", CONTACT],
  ["/privacy", PRIVACY],
  ["/developers", DEVELOPERS],
  ["/docs", DEVELOPERS],
]);

export function getAgentDocument(pathname: string): AgentDocument | undefined {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  return DOCUMENTS.get(normalized);
}

export function renderMarkdown(document: AgentDocument): string {
  const lines = [`# ${document.title}`, "", `> ${document.summary}`];

  for (const section of document.sections) {
    // A section without links already ends on a blank line.
    if (lines.at(-1) !== "") lines.push("");
    lines.push(`## ${section.heading}`, "");
    for (const paragraph of section.paragraphs) {
      lines.push(paragraph, "");
    }
    for (const link of section.links ?? []) {
      lines.push(`- [${link.label}](${link.href})`);
    }
  }

  return `${lines.join("\n").trim()}\n`;
}
