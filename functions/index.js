// functions/index.js
// Cloudflare Pages Function: runs only on Cloudflare Pages (GitHub Pages ignores it), and only for
// the main page "/" (see _routes.json). For a shared-plan link (/?plan=<id>) it swaps that plan's
// title, description and preview image into the page's link-preview tags, so Discord and other apps
// show the plan itself. People get the normal app; only the <meta> tags in <head> change.
//
// The tags come from the cloud worker's /s/<id> page, so the worker stays the one place that knows
// about saved plans, their preview images and what to show when a plan has expired.

const DEFAULT_WORKER = 'https://mio-susuhara.elysesim.workers.dev';
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const VER_RE = /^[a-z0-9]{1,16}$/i;
const TAGS = ['og:title', 'og:description', 'og:image', 'og:image:alt'];

// Read the preview tags from the worker's share page.
async function planTags(workerUrl, id, v) {
  const res = await fetch(`${workerUrl}/s/${encodeURIComponent(id)}${v ? '?v=' + v : ''}`, {
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) return null;
  const tags = {};
  await new HTMLRewriter()
    .on('meta[property]', {
      element(el) {
        const p = el.getAttribute('property');
        if (TAGS.includes(p)) tags[p] = el.getAttribute('content') || '';
      },
    })
    .transform(res)
    .arrayBuffer();
  return tags['og:title'] ? tags : null;
}

export async function onRequest({ request, env, next }) {
  const page = await next(); // the normal index.html
  const url = new URL(request.url);
  const id = url.searchParams.get('plan');
  if (!id || !ID_RE.test(id) || request.method !== 'GET') return page;
  const v = VER_RE.test(url.searchParams.get('v') || '') ? url.searchParams.get('v') : '';

  let tags = null;
  try {
    tags = await planTags(env.CLOUD_SYNC_URL || DEFAULT_WORKER, id, v);
  } catch {
    // Worker slow or unreachable: fall back to the site's standard preview.
  }
  if (!tags) return page;

  const set = value => ({
    element(el) {
      el.setAttribute('content', value);
    },
  });
  let rw = new HTMLRewriter()
    // og:url must be this link, or some apps re-read the bare site address and its default card
    .on('meta[property="og:url"]', set(url.href))
    // Values arrive HTML-escaped from the worker page, so insert them as-is (no second escaping)
    .on('title', {
      element(el) {
        el.setInnerContent(tags['og:title'], { html: true });
      },
    })
    .on('meta[name="description"]', set(tags['og:description'] || ''));
  for (const p of TAGS) if (tags[p] !== undefined) rw = rw.on(`meta[property="${p}"]`, set(tags[p]));

  const out = rw.transform(page);
  const headers = new Headers(out.headers);
  headers.set('Cache-Control', 'public, max-age=60');
  return new Response(out.body, { status: out.status, headers });
}