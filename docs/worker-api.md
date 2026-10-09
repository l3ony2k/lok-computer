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
            ├── /api/jev/plan → planner LLM (plan, ask for input, or refuse)
            ├── /api/jev → planner LLM + TypeSafe Jev (best answer + analytics)
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

### POST /api/jev/plan
Reads a question with the fast planner model (no Jev call) and replies with one of three `kind`s.

```typescript
// Request: inputs answer a previous needs_input reply; answerAnyway forbids asking again
{ question: 'Is this email a phishing attempt?', inputs?: { email: '…' }, state?: '…', answerAnyway?: boolean }

// kind: "plan": the state plus a primary question (always first) and up to four supporting questions
{ kind: 'plan', plan: { summary, rationale, state, primary: 'is_phishing', labels, questions }, planner, timing }

// kind: "needs_input": the question is about material the person has not given
{ kind: 'needs_input', message, fields: [{ key, label, placeholder, multiline, required }], optional, planner, timing }

// kind: "refuse": Jev cannot judge it (generation, arithmetic, no answer space)
{ kind: 'refuse', message, suggestion, planner, timing }
```

### POST /api/jev
Plans (unless `plan` is supplied), asks Jev, and forms the best answer. A `needs_input` or `refuse` outcome is returned as above without calling Jev. The primary choice question is also asked with its options reversed (Jev leans toward the first option); the two distributions are averaged and compared.

```typescript
// Request: { question, inputs?, state?, answerAnyway? } or { plan }
// Response
{
  kind: 'answer',
  model: 'jev-1.13.0',
  best: { key, title, type, answer: 'Yes', detail, probability: 0.98, confidence: 0.96, certainty: 'high' },
  result: { is_phishing: true, urgency: true, tone: 2.03 },
  properties: { is_phishing: { type: 'noul', title, question, primary: true, value: true, probability: 0.98, confidence: 0.96 }, ... },
  notes: [{ tone: 'warn', text: 'Close call: …' }],
  jev: { request, response },  // exactly what was sent to and returned by Jev
  plan, planner, usage, timing
}
```

Certainty is `high` at confidence ≥ 0.8, `medium` at ≥ 0.5, otherwise `low` (also when the reversed-order check changes the answer). Yes/no confidence is |2p − 1|, as TypeSafe suggests.

Errors are `{ error, code? }`: 400 bad input, 422 `invalid_plan` (or Jev rejected the questions), 429 over the per-IP budget, 502 upstream failure (including unreachable or unreadable upstreams), 503 not configured or Jev overloaded. Limits: question 2,000 chars, content 20,000 chars, follow-up answers 8,000 chars each, 8 questions, 24 choice options, 10 score levels of up to 600 chars each, 16,000 chars of questions in total. Both endpoints share the `JEV_RATE_LIMITER` binding in `wrangler.toml` (20 calls per minute per client IP; one answered question is two or three calls); without the binding, as in tests, there is no limit. The older `prompt` field is still accepted. The planner prompt and validation live in `jev.js`; tests in `jev.test.ts`.

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
JEV_MODEL = "jev-latest"
JEV_PLANNER_MODEL = "gpt-6-luna"
FEDI_INSTANCE = "https://rex.cat"
```

`JEV_PLANNER_MODEL` sets the Ask AI planner (`gpt-6-luna` on HyprLab) and is required; without it the planner answers 503. `JEV_PLANNER_REASONING_EFFORT` sets the planner's `reasoning_effort` (default `none`: planning is a short structured task, and gpt-6-luna plans in about 3-5s without hidden reasoning; set it to an empty string to omit the field). Providers that reject it, or JSON mode, get one retry without both.

Jev has no clock, so plans for questions about the present ("right now", "current", "latest") carry `"as_of": "<today>"` in the state; the planner is told to add it, and `withAsOfDate` in `jev.js` adds it when the planner forgets.

### Production Secrets

Set via Cloudflare Dashboard or CLI:

```bash
wrangler secret put AI_API_KEY
wrangler secret put AI_BASE_URL
wrangler secret put TYPESAFE_API_KEY
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
