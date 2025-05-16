import { Agent, CredentialSession } from '@atproto/api'; // Standard npm import

// Helper to set CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or your specific Pages domain for better security
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Function to create a JSON response with CORS headers
function makeJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route for Bluesky feed
    if (url.pathname === '/api/bsky/feed') {
      try {
        const bskyHandle = env.BSKY_HANDLE;
        const appPassword = env.BSKY_APP_PASSWORD;

        const cursor = url.searchParams.get('cursor') || undefined;
        const limitParam = url.searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : 50;

        if (!bskyHandle) {
          return makeJsonResponse({ error: 'BSKY_HANDLE not configured in Worker environment' }, 500);
        }
        if (!appPassword) {
          return makeJsonResponse({ error: 'BSKY_APP_PASSWORD not configured in Worker environment' }, 500);
        }

        const PDS_HOST = 'https://bsky.social';
        const session = new CredentialSession(new URL(PDS_HOST));
        await session.login({ identifier: bskyHandle, password: appPassword });

        const agent = new Agent(session);

        const apiResponse = await agent.getAuthorFeed({
          actor: bskyHandle,
          limit: limit,
          cursor: cursor,
          filter: 'posts_with_replies',
        });

        if (apiResponse.success) {
          return makeJsonResponse(apiResponse.data);
        } else {
          console.error('Bluesky API error in Worker (success=false):', apiResponse.error, apiResponse.status);
          return makeJsonResponse(
            { error: 'Failed to fetch posts from Bluesky API', details: apiResponse.error || 'Unknown API error' },
            apiResponse.status || 500
          );
        }
      } catch (error) {
        console.error('Exception fetching Bluesky feed in Worker:', error);
        if (error.name === 'XRPCError' && typeof error.status === 'number') {
             return makeJsonResponse({ error: 'Bluesky API request exception', details: error.message }, error.status);
        }
        return makeJsonResponse({ error: 'Internal server error in Worker', details: error.message || 'Unknown error' }, 500);
      }
    }

    return makeJsonResponse({ error: 'Not Found' }, 404);
  },
}; 