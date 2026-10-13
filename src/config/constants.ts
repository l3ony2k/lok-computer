import { DEPLOYMENT } from './env';

// DIDs, handles and guestbook IDs are URL-safe, so the request URLs stay exactly as before.
const guestbookId = DEPLOYMENT.VITE_GUESTBOOK_ID;
const bskyActor = DEPLOYMENT.VITE_BSKY_ACTOR;

/** Service endpoints. Accounts come from the deployment settings (src/config/deployment.ts). */
export const APP_CONFIG = {
    WEATHER_API_URL: 'https://wttr.in',
    GUESTBOOK_SCRIPT_URL: `https://guestbooks.meadow.cafe/resources/js/embed_script/${guestbookId}/script.js`,
    GUESTBOOK_SUBMIT_URL: `https://guestbooks.meadow.cafe/guestbook/${guestbookId}/submit`,
    GUESTBOOK_URL: `https://guestbooks.meadow.cafe/guestbook/${guestbookId}`,
    BSKY_FEED_URL: `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${bskyActor}&filter=posts_and_author_threads`,
    BSKY_PROFILE_URL: `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${bskyActor}`,
    FEDI_USERNAME: DEPLOYMENT.VITE_FEDI_USERNAME,
    /** The Are.na account the desktop browses, warms at boot, and deep-links to by default. */
    ARENA_USERNAME: DEPLOYMENT.VITE_ARENA_USERNAME,
    NEODB_SHELF_ENDPOINT: '/api/neodb/shelf',
};
