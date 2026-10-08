# Worker & API

lok.computer uses a Cloudflare Worker as an API proxy for authenticated services.

## Architecture

```
Browser App
     │
     ├── Direct API calls (Are.na - public)
     │
     └── Worker API calls (authenticated services)
            │
            ▼
     Cloudflare Worker (worker.js)
            │
            ├── /api/chat → OpenAI-compatible API
            ├── /api/jev/plan → planner LLM (typed questions)
            ├── /api/jev → planner LLM + TypeSafe Jev
            ├── /api/bsky/feed → Bluesky
            ├── /api/fedi/* → Fediverse (Mastodon/GoToSocial)
            └── /api/neodb/shelf → NeoDB
```

## Why a Worker?

1. **Secrets**: API keys never exposed to browser
2. **CORS**: Worker adds proper CORS headers
3. **Security**: Filter private posts server-side
4. **Rate limiting**: Central point for control

---

## Endpoints

### POST /api/chat
AI chat completion proxy.

```typescript
// Request
{ messages: [{ role: 'user', content: 'Hello' }] }

// Response
{ choices: [{ message: { content: 'Hi!' } }] }
```

### POST /api/jev/plan
Compiles a request into typed Jev questions with the fast planner model (no Jev call).

```typescript
// Request
{ prompt: 'Is it urgent and which team owns it?', state?: 'Payouts failed for 3 days!' }

// Response
{ plan: { summary, state, questions: { is_urgent: { type: 'noul', instructions, criteria } } }, planner: { model }, timing }
```

### POST /api/jev
Plans (unless `plan` is supplied), asks Jev, and forms the requested properties.

```typescript
// Request: { prompt, state? } or { plan }
// Response
{
  model: 'jev-1.13.0',
  result: { is_urgent: true, owning_team: 'billing', customer_mood: 2.88 },
  properties: { is_urgent: { type: 'noul', value: true, probability: 0.97 }, ... },
  plan, planner, usage, timing
}
```

Errors are `{ error, code? }`: 400 bad input, 422 `refused` or `invalid_plan`, 429 over the per-IP budget, 502 upstream failure (including unreachable or unreadable upstreams), 503 not configured or Jev overloaded. Limits: prompt 2,000 chars, content 20,000 chars, 8 questions, 24 choice options, 10 score levels of up to 600 chars each, 16,000 chars of questions in total. Both endpoints share the `JEV_RATE_LIMITER` binding in `wrangler.toml` (20 calls per minute per client IP; one Ask is two calls); without the binding, as in tests, there is no limit. The planner prompt and validation live in `jev.js`; tests in `jev.test.ts`.

### GET /api/bsky/feed
Bluesky author feed.

```
/api/bsky/feed?limit=50&cursor=xxx
```

### GET /api/fedi/account
Fediverse account lookup.

```
/api/fedi/account?username=lok
```

### GET /api/fedi/statuses
Fediverse statuses.

```
/api/fedi/statuses?accountId=123&limit=20&max_id=xxx
```

### GET /api/neodb/shelf
NeoDB shelf items.

```
/api/neodb/shelf?type=wishlist&page=1&page_size=20
```

---

## Configuration

### wrangler.toml

```toml
name = "lok-computer-worker"
main = "worker.js"
compatibility_date = "2025-05-15"
account_id = "your-account-id"

[vars]
AI_MODEL = "gemini-2.5-flash-lite"
AI_TEMPERATURE = "0.8"
JEV_MODEL = "jev-latest"
FEDI_INSTANCE = "https://rex.cat"
```

`JEV_PLANNER_MODEL` optionally overrides the planner model (defaults to `AI_MODEL`).

### Production Secrets

Set via Cloudflare Dashboard or CLI:

```bash
wrangler secret put AI_API_KEY
wrangler secret put AI_BASE_URL
wrangler secret put TYPESAFE_API_KEY
wrangler secret put BSKY_HANDLE
wrangler secret put BSKY_APP_PASSWORD
wrangler secret put FEDI_ACCESS_TOKEN
wrangler secret put NEODB_ACCESS_TOKEN
```

---

## Development

### Local Worker Testing

```bash
# Run worker locally
wrangler dev

# Point the Vite dev proxy at it instead of production
LOK_API_ORIGIN=http://localhost:8787 bun dev
```

### Deploy Worker

```bash
wrangler deploy
```

---

## Adding a New API Endpoint

1. Add route handling in `worker.js`:

```javascript
if (url.pathname === '/api/your-endpoint') {
  try {
    const yourSecret = env.YOUR_SECRET;
    
    if (!yourSecret) {
      return makeJsonResponse({ error: 'YOUR_SECRET not configured' }, 500);
    }
    
    // Your logic here
    const response = await fetch('https://api.example.com/...', {
      headers: { 'Authorization': `Bearer ${yourSecret}` }
    });
    
    const data = await response.json();
    return makeJsonResponse(data);
    
  } catch (error) {
    console.error('Error:', error);
    return makeJsonResponse({ error: error.message }, 500);
  }
}
```

2. Add environment variable to `wrangler.toml` (dev) or secrets (prod)

3. Create a source adapter in `src/lib/api.ts` or the owning app module

---

## Client-Side Caching

API responses are cached in IndexedDB with TTLs:

```typescript
// src/lib/storage.ts
export const CACHE_TTL = {
  NEODB_SHELF: 10 * 60 * 1000,    // 10 minutes
  BSKY_PROFILE: 5 * 60 * 1000,    // 5 minutes
  BSKY_POSTS: 5 * 60 * 1000,      // 5 minutes
  FEDI_ACCOUNT: 5 * 60 * 1000,    // 5 minutes
  FEDI_STATUSES: 5 * 60 * 1000,   // 5 minutes
  WEATHER: 10 * 60 * 1000,        // 10 minutes
  ARENA_CHANNEL: 30 * 60 * 1000,  // 30 minutes
  ARENA_BLOCK: 60 * 60 * 1000,    // 1 hour
};
```

### Usage

```typescript
import { cachedRequest } from '@/lib/cachedRequest';
import { CACHE_TTL } from '@/lib/storage';

const data = await cachedRequest({
  cacheKey,
  ttlMs: CACHE_TTL.YOUR_TTL,
  source: 'your-source',
  load: async () => {
    const response = await fetch(...);
    if (!response.ok) throw new Error('Request failed');
    return response.json() as Promise<YourType>;
  },
});
```

---

## Direct APIs (No Worker)

Are.na API is public and called directly:

```typescript
// src/lib/api.ts
const API_BASE_URL = "https://api.are.na/v3";

await fetch(`${API_BASE_URL}/channels/${channelSlug}`);
```
