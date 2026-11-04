// cloud-worker/worker.js
// Cloudflare Worker behind "Save to Cloud". Runs on Cloudflare, not in the browser.
//
//   POST /                 save a plan (JSON). An optional `preview` (PNG data URL, 1200×630)
//                          is stored separately as the plan's link-preview image.
//   GET  /?plan=<id>       the plan as JSON (used by the app to open and sync plans)
//   GET  /s/<id>?v=<n>     share link: a tiny page with that plan's preview tags for Discord etc.,
//                          which sends people straight on to the planner
//   GET  /img/<id>.png     the plan's preview image (falls back to the site's default card)
//
// Everything expires TTL seconds after it was last saved.

const APP_URL = "https://arisim67.github.io/GoC-RAG-Planner/";
const DEFAULT_IMAGE = APP_URL + "images/social-preview.png";
const TTL = 2592000; // 30 days
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const VER_RE = /^[a-z0-9]{1,16}$/i;
const MAX_IMAGE_BYTES = 1500000;
const IMG_W = 1200, IMG_H = 630;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const kv = env => env["GoC-RAG-Planner"];

// Escape text for use inside HTML and attribute values.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");

// Decode a PNG data URL and check it really is a 1200×630 PNG of a sensible size.
function decodePreview(dataUrl) {
  const prefix = "data:image/png;base64,";
  if (typeof dataUrl !== "string" || !dataUrl.startsWith(prefix)) return null;
  const b64 = dataUrl.slice(prefix.length);
  if (b64.length > MAX_IMAGE_BYTES * 1.4) return null;
  let bin;
  try { bin = atob(b64); } catch { return null; }
  if (bin.length > MAX_IMAGE_BYTES || bin.length < 33) return null;
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!sig.every((b, i) => bytes[i] === b)) return null;
  const view = new DataView(bytes.buffer);
  if (view.getUint32(16) !== IMG_W || view.getUint32(20) !== IMG_H) return null; // IHDR width/height
  return bytes;
}

function sharePage({ url, title, description, image, target }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GoC / Ragnarok Planner">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="${IMG_W}">
<meta property="og:image:height" content="${IMG_H}">
<meta property="og:image:alt" content="Plan preview: final scores and a colour map of towns by day">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#e2c883">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<style>body{background:#191425;color:#b1a6cc;font:15px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#6bf2c7}</style>
</head><body>
<p>Opening the plan… <a href="${esc(target)}">Continue to the planner</a></p>
<script>location.replace(${JSON.stringify(target)});</script>
</body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // ── Save a plan (and its preview image) ──
    if (request.method === "POST") {
      try {
        const data = await request.json();
        if (!data || !data.id || !ID_RE.test(String(data.id))) {
          return new Response("Missing or invalid ID", { status: 400, headers: corsHeaders });
        }
        const preview = data.preview;
        const previewMeta = data.previewMeta || {};
        delete data.preview;
        delete data.previewMeta;

        await kv(env).put(data.id, JSON.stringify(data), { expirationTtl: TTL });

        // A bad or missing image never fails the save; the link just uses the default card.
        const bytes = preview ? decodePreview(preview) : null;
        if (bytes) {
          await kv(env).put("img:" + data.id, bytes, {
            expirationTtl: TTL,
            metadata: { title: clip(previewMeta.title, 200), description: clip(previewMeta.description, 300) },
          });
        }
        return new Response("Saved", { status: 200, headers: corsHeaders });
      } catch (err) {
        return new Response("Error saving data", { status: 500, headers: corsHeaders });
      }
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    // ── Share link: preview tags for link crawlers, then on to the app ──
    if (path.startsWith("/s/")) {
      const id = decodeURIComponent(path.slice(3).replace(/\/$/, ""));
      if (!ID_RE.test(id)) return Response.redirect(APP_URL, 302);
      const v = VER_RE.test(url.searchParams.get("v") || "") ? url.searchParams.get("v") : "";

      let title = "Shared plan · GoC / Ragnarok Planner";
      let description = "A plan shared from the GoC / Ragnarok Planner for Tokyo Debunker guilds.";
      let image = DEFAULT_IMAGE;

      const { value, metadata } = await kv(env).getWithMetadata("img:" + id, { type: "stream" });
      if (value) {
        value.cancel(); // only the metadata is needed here
        image = `${url.origin}/img/${id}.png${v ? "?v=" + v : ""}`;
        if (metadata && metadata.title) title = metadata.title;
        if (metadata && metadata.description) description = metadata.description;
      } else {
        // Saved by an older version of the app (no image): use what the plan itself says.
        const raw = await kv(env).get(id);
        if (raw) {
          try {
            const plan = JSON.parse(raw);
            if (plan.name) title = `${clip(plan.name, 120)} · GoC / Ragnarok Planner`;
          } catch { /* keep the defaults */ }
        } else {
          description = "This shared plan has expired or the link is incorrect.";
        }
      }

      const target = `${APP_URL}?plan=${encodeURIComponent(id)}`;
      const html = sharePage({ url: url.href, title, description, image, target });
      return new Response(request.method === "HEAD" ? null : html, {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
      });
    }

    // ── Preview image ──
    if (path.startsWith("/img/")) {
      const id = path.slice(5).replace(/\.png$/, "");
      const bytes = ID_RE.test(id) ? await kv(env).get("img:" + id, { type: "arrayBuffer" }) : null;
      if (!bytes) return fetch(DEFAULT_IMAGE); // no image yet: show the site's card instead
      return new Response(request.method === "HEAD" ? null : bytes, {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
      });
    }

    // ── Plan JSON (unchanged) ──
    const planId = url.searchParams.get("plan");
    if (!planId) return new Response("Missing plan ID", { status: 400, headers: corsHeaders });

    const data = await kv(env).get(planId);
    if (!data) return new Response("Plan not found", { status: 404, headers: corsHeaders });

    return new Response(data, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  },
};