// js/config.js
// Settings that differ between deployments. Edit these instead of searching through app.js.

// Cloudflare Worker that stores and serves shared plans ("Save to Cloud").
export const CLOUD_SYNC_URL = 'https://mio-susuhara.elysesim.workers.dev';

// Where the planner lives now, and the old address(es) that show the "We've moved" banner.
export const NEW_SITE_URL = 'https://goc-rag-planner.pages.dev/';
export const OLD_SITE_HOSTS = ['arisim67.github.io'];
