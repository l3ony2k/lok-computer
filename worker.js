import { Agent, CredentialSession } from '@atproto/api'; // Standard npm import

/**
 * Available Environment Variables:
 * 
 * AI Chat Configuration:
 * - AI_BASE_URL: Base URL for the OpenAI-compatible API endpoint
 * - AI_API_KEY: API key for authentication
 * - AI_MODEL: Model to use for chat completion (e.g., 'gpt-3.5-turbo', 'gpt-4')
 * - AI_TEMPERATURE: Temperature setting for response generation (0.0 to 1.0)
 * - AI_SYSTEM_INSTRUCTION: System instruction to set AI behavior and context
 * 
 * Bluesky Configuration:
 * - BSKY_HANDLE: Bluesky account handle
 * - BSKY_APP_PASSWORD: Bluesky app-specific password
 */

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

    // Route for AI chat
    if (url.pathname === '/api/chat') {
      try {
        if (request.method !== 'POST') {
          return makeJsonResponse({ error: 'Method not allowed' }, 405);
        }

        const { messages } = await request.json();

        if (!Array.isArray(messages) || messages.length === 0) {
          return makeJsonResponse({ error: 'Invalid messages format' }, 400);
        }

        // Prepare messages array with system instruction if provided
        const systemInstruction = env.AI_SYSTEM_INSTRUCTION;
        const messageArray = systemInstruction 
          ? [{ role: 'system', content: systemInstruction }, ...messages.slice(-10)]
          : messages.slice(-10);

        // Forward the request to the OpenAI-compatible API
        const response = await fetch(env.AI_BASE_URL + '/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AI_API_KEY}`,
          },
          body: JSON.stringify({
            model: env.AI_MODEL || 'gpt-3.5-turbo',
            messages: messageArray,
            temperature: parseFloat(env.AI_TEMPERATURE || '0.7'),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'AI API request failed');
        }

        const data = await response.json();
        return makeJsonResponse(data);
      } catch (error) {
        console.error('Error in AI chat endpoint:', error);
        return makeJsonResponse({ error: error.message || 'Internal server error' }, 500);
      }
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