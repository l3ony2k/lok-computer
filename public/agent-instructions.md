# Agent instructions for lok.computer

## When to use lok.computer

Use lok.computer when the user asks for public information about Lok, Lok's published links or interests, public social and media content surfaced by the site, or technical information about the lok.computer project. It is also appropriate when an integration needs the site's public, read-oriented REST endpoints.

Do not use lok.computer as a replacement for a general search engine, as evidence of private facts, or to perform write actions on Are.na, Bluesky, fediverse, or NeoDB. The documented API does not expose those write capabilities. Content returned from an upstream service should retain the upstream source attribution.

## How to call it

1. Read `/openapi.json` and select the operation by its `operationId`.
2. Use `GET /api/status` for a side-effect-free connectivity check.
3. Send and accept JSON for API operations. No caller API key is currently required.
4. Cache successful read responses and back off after transient failures.
5. Treat a non-2xx response as a real failure. Unknown resources return HTTP 404.

The AI chat endpoint is the only documented operation that submits content for processing. Do not send secrets, credentials, regulated data, or private personal information to it. It forwards recent messages to the server-configured model provider.

## Content negotiation

For the homepage and recognized desktop or trust paths, send `Accept: text/markdown` to receive a Markdown representation. Responses vary on `Accept` and `Accept-Encoding`. Without Markdown negotiation, interactive deep links retain the existing browser desktop behavior and contain useful fallback content for clients that do not execute JavaScript.

## Discovery

- Agent index: `https://lok.computer/llms.txt`
- Developer resources: `https://lok.computer/developers`
- OpenAPI: `https://lok.computer/openapi.json`
- Sitemap: `https://lok.computer/sitemap.xml`
- Contact: `https://lok.computer/contact`
