import { Router, type IRouter } from "express";
import * as cheerio from "cheerio";
import { isAdDomain, AD_SELECTORS } from "../lib/ad-domains.js";

const router: IRouter = Router();

const PRIVATE_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254."];

function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return true;
    if (PRIVATE_HOSTS.some((d) => parsed.hostname.includes(d))) return true;
    return false;
  } catch {
    return true;
  }
}

const PROXY_BASE = "/api/proxy";

function makeAbsolute(href: string, baseUrl: string): string | null {
  if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
    return null; // not rewriteable
  }
  try {
    if (href.startsWith("//")) {
      const base = new URL(baseUrl);
      return `${base.protocol}${href}`;
    } else if (href.startsWith("/")) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${href}`;
    } else if (href.startsWith("http://") || href.startsWith("https://")) {
      return href;
    } else {
      const base = new URL(baseUrl);
      const basePath = base.pathname.split("/").slice(0, -1).join("/") + "/";
      return `${base.protocol}//${base.host}${basePath}${href}`;
    }
  } catch {
    return null;
  }
}

function rewriteUrl(href: string, baseUrl: string): string {
  const abs = makeAbsolute(href, baseUrl);
  if (abs === null) return href;
  return `${PROXY_BASE}?url=${encodeURIComponent(abs)}`;
}

/**
 * JavaScript injected into every proxied page.
 * - Intercepts location.assign / location.replace / window.open
 * - Tries to intercept location.href setter
 * - Posts a postMessage to parent when a redirect is detected
 * - MutationObserver watches for dynamically added meta-refresh tags
 */
const REDIRECT_INTERCEPTOR_SCRIPT = `
<script id="__island_dream_interceptor__">
(function() {
  'use strict';
  if (window.__islandDreamActive) return;
  window.__islandDreamActive = true;

  function resolveUrl(url) {
    try { return new URL(url, window.location.href).href; } catch(e) { return String(url); }
  }

  function interceptRedirect(rawUrl) {
    var url = resolveUrl(rawUrl);
    window.parent.postMessage({ type: 'island-dream-redirect', url: url }, '*');
    // Return false / throw to cancel caller's action
    throw new Error('Island Dream: redirect intercepted to ' + url);
  }

  // --- location.assign ---
  try {
    var origAssign = window.location.assign.bind(window.location);
    window.location.assign = function(url) { interceptRedirect(url); };
  } catch(e) {}

  // --- location.replace ---
  try {
    var origReplace = window.location.replace.bind(window.location);
    window.location.replace = function(url) { interceptRedirect(url); };
  } catch(e) {}

  // --- location.href setter (via prototype) ---
  try {
    var locProto = Object.getPrototypeOf(window.location);
    var hrefDesc = Object.getOwnPropertyDescriptor(locProto, 'href');
    if (hrefDesc && hrefDesc.set) {
      Object.defineProperty(locProto, 'href', {
        get: hrefDesc.get,
        set: function(val) { interceptRedirect(val); },
        configurable: true
      });
    }
  } catch(e) {}

  // --- window.open ---
  var origOpen = window.open;
  window.open = function(url, target, features) {
    if (url && String(url) !== 'about:blank' && String(url) !== '') {
      try { interceptRedirect(String(url)); } catch(e) {}
      return null;
    }
    return origOpen ? origOpen.apply(window, arguments) : null;
  };

  // --- MutationObserver for dynamic meta-refresh ---
  function stripMetaRefresh(node) {
    if (!node || node.nodeType !== 1) return;
    var tag = node.tagName && node.tagName.toUpperCase();
    if (tag === 'META') {
      var equiv = node.getAttribute('http-equiv') || '';
      if (equiv.toLowerCase() === 'refresh') {
        var content = node.getAttribute('content') || '';
        var m = content.match(/url=['"]?([^'"]+)['"]?/i);
        if (m) {
          try { interceptRedirect(m[1].trim()); } catch(e) {}
        }
        node.parentNode && node.parentNode.removeChild(node);
      }
    }
  }

  try {
    var obs = new MutationObserver(function(mutations) {
      mutations.forEach(function(mut) {
        mut.addedNodes.forEach(function(n) { stripMetaRefresh(n); });
      });
    });
    obs.observe(document.documentElement || document, { childList: true, subtree: true });
  } catch(e) {}
})();
</script>
`;

interface RewriteStats {
  adsBlocked: number;
}

function rewriteHtml(html: string, targetUrl: string): { output: string; stats: RewriteStats } {
  const $ = cheerio.load(html);
  let adsBlocked = 0;

  // ── 1. Strip meta refresh tags ──────────────────────────────────────────
  $("meta[http-equiv]").each((_i, el) => {
    const equiv = ($(el).attr("http-equiv") || "").toLowerCase();
    if (equiv === "refresh") {
      $(el).remove();
      // We don't count this as "ads blocked" — it's redirect blocking
    }
  });

  // ── 2. Remove known ad container elements by selector ───────────────────
  try {
    $(AD_SELECTORS).each((_i, el) => {
      $(el).remove();
      adsBlocked++;
    });
  } catch { /* ignore selector errors */ }

  // ── 3. Strip scripts from ad domains ────────────────────────────────────
  $("script[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    const abs = makeAbsolute(src, targetUrl);
    if (abs && isAdDomain(abs)) {
      $(el).remove();
      adsBlocked++;
    }
  });

  // ── 4. Strip iframes from ad domains ────────────────────────────────────
  $("iframe[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    const abs = makeAbsolute(src, targetUrl);
    if (abs && isAdDomain(abs)) {
      $(el).remove();
      adsBlocked++;
    }
  });

  // ── 5. Strip tracking pixels (1x1 images from ad domains) ───────────────
  $("img[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    const abs = makeAbsolute(src, targetUrl);
    if (abs && isAdDomain(abs)) {
      $(el).remove();
      adsBlocked++;
      return;
    }
    // Fix relative URLs for non-ad images
    if (src.startsWith("//") || src.startsWith("/")) {
      try {
        const base = new URL(targetUrl);
        $(el).attr("src", src.startsWith("//") ? `${base.protocol}${src}` : `${base.protocol}//${base.host}${src}`);
      } catch { /* ignore */ }
    }
  });

  // ── 6. Remove link/style from ad domains ────────────────────────────────
  $("link[href]").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const abs = makeAbsolute(href, targetUrl);
    if (abs && isAdDomain(abs)) {
      $(el).remove();
      adsBlocked++;
      return;
    }
    // Fix relative stylesheet URLs
    const rel = ($(el).attr("rel") || "").toLowerCase();
    if (rel === "stylesheet" && (href.startsWith("//") || href.startsWith("/"))) {
      try {
        const base = new URL(targetUrl);
        $(el).attr("href", href.startsWith("//") ? `${base.protocol}${href}` : `${base.protocol}//${base.host}${href}`);
      } catch { /* ignore */ }
    }
  });

  // ── 7. Make script srcs absolute (non-ad) ────────────────────────────────
  $("script[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    if (src.startsWith("//") || src.startsWith("/")) {
      try {
        const base = new URL(targetUrl);
        $(el).attr("src", src.startsWith("//") ? `${base.protocol}${src}` : `${base.protocol}//${base.host}${src}`);
      } catch { /* ignore */ }
    }
  });

  // ── 8. Rewrite anchor hrefs through proxy ────────────────────────────────
  $("a[href]").each((_i, el) => {
    const href = $(el).attr("href") || "";
    $(el).attr("href", rewriteUrl(href, targetUrl));
    $(el).attr("target", "_self");
  });

  // ── 9. Rewrite form actions ──────────────────────────────────────────────
  $("form[action]").each((_i, el) => {
    const action = $(el).attr("action") || "";
    $(el).attr("action", rewriteUrl(action, targetUrl));
  });

  // ── 10. Inject redirect interceptor before any other scripts ─────────────
  const headEl = $("head");
  if (headEl.length) {
    headEl.prepend(REDIRECT_INTERCEPTOR_SCRIPT);
  } else {
    $("body").prepend(REDIRECT_INTERCEPTOR_SCRIPT);
  }

  // ── 11. Inject Island Dream toolbar ──────────────────────────────────────
  const adBadge = adsBlocked > 0
    ? `<span style="background:#dc2626;color:white;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:700;letter-spacing:0.03em;white-space:nowrap;">🚫 ${adsBlocked} blocked</span>`
    : `<span style="background:rgba(255,255,255,0.12);border-radius:4px;padding:3px 8px;font-size:11px;white-space:nowrap;">✓ No ads</span>`;

  const toolbar = `
  <div id="island-dream-toolbar" style="
    position: fixed; top: 0; left: 0; right: 0;
    z-index: 2147483647;
    background: linear-gradient(135deg, #0d7377 0%, #14a085 50%, #1a936f 100%);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px; padding: 8px 16px;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    min-height: 44px; box-sizing: border-box;
  ">
    <a href="/" style="color:white;text-decoration:none;font-weight:700;white-space:nowrap;font-size:14px;">🌴 Island Dream</a>
    <span style="background:rgba(255,255,255,0.15);border-radius:4px;padding:3px 8px;white-space:nowrap;font-size:11px;">🛡 Secure</span>
    ${adBadge}
    <div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(0,0,0,0.2);border-radius:6px;padding:4px 10px;font-size:12px;color:rgba(255,255,255,0.85);">
      ${targetUrl}
    </div>
    <a href="${PROXY_BASE}?url=${encodeURIComponent(targetUrl)}" style="color:white;text-decoration:none;background:rgba(255,255,255,0.15);border-radius:4px;padding:4px 10px;font-size:12px;white-space:nowrap;">↺</a>
    <a href="javascript:history.back()" style="color:white;text-decoration:none;background:rgba(255,255,255,0.15);border-radius:4px;padding:4px 10px;font-size:12px;white-space:nowrap;">←</a>
  </div>
  <div style="height:52px;"></div>`;

  $("body").prepend(toolbar);

  return { output: $.html(), stats: { adsBlocked } };
}

/** Special page returned when an HTTP redirect is detected — posts a message to the parent Browse frame */
function makeRedirectInterceptPage(fromUrl: string, toUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Island Dream — Redirect Detected</title>
  <style>
    body { margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0d7377; color: white; display:flex; align-items:center; justify-content:center;
           min-height:100vh; flex-direction:column; gap:16px; padding:24px; box-sizing:border-box; text-align:center; }
    .card { background:rgba(255,255,255,0.12); border-radius:16px; padding:32px; max-width:520px; width:100%; }
    h2 { margin:0 0 8px; font-size:22px; }
    p { margin:0; font-size:13px; opacity:0.8; word-break:break-all; }
    .url { background:rgba(0,0,0,0.2); border-radius:8px; padding:10px 14px; font-size:12px; margin-top:12px; word-break:break-all; }
    .spinner { width:36px;height:36px;border:3px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite; margin-bottom:8px; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="card">
    <h2>🔀 Redirect Detected</h2>
    <p>This page wants to redirect you to:</p>
    <div class="url">${toUrl}</div>
    <p style="margin-top:12px;font-size:12px;opacity:0.6;">Asking Island Dream for permission…</p>
  </div>
  <script>
    window.parent.postMessage({
      type: 'island-dream-redirect',
      url: ${JSON.stringify(toUrl)},
      from: ${JSON.stringify(fromUrl)}
    }, '*');
  </script>
</body>
</html>`;
}

// ── Main proxy route ───────────────────────────────────────────────────────
router.get("/proxy", async (req, res) => {
  const urlParam = req.query["url"];

  if (!urlParam || typeof urlParam !== "string") {
    res.status(400).send("<h1>Island Dream Proxy: Missing URL</h1>");
    return;
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(urlParam);
    new URL(targetUrl);
  } catch {
    res.status(400).send("<h1>Island Dream Proxy: Invalid URL</h1>");
    return;
  }

  if (isBlockedUrl(targetUrl)) {
    res.status(403).send("<h1>Island Dream Proxy: This URL is not allowed.</h1>");
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      // Use manual redirect to intercept 3xx responses before following
      redirect: "manual",
    });

    // ── Intercept HTTP-level redirects ────────────────────────────────────
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location") || "";
      if (location) {
        let redirectTarget: string;
        try {
          redirectTarget = new URL(location, targetUrl).href;
        } catch {
          redirectTarget = location;
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(makeRedirectInterceptPage(targetUrl, redirectTarget));
        return;
      }
    }

    const contentType = upstream.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      res.setHeader("Content-Type", contentType);
      const buffer = await upstream.arrayBuffer();
      res.send(Buffer.from(buffer));
      return;
    }

    const html = await upstream.text();
    const { output } = rewriteHtml(html, targetUrl);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Island-Dream-Proxied", "1");
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("X-Frame-Options");
    res.send(output);
  } catch (err) {
    req.log.error({ err }, "Proxy fetch failed");
    res.status(502).send(`<!DOCTYPE html>
<html>
  <head><title>Island Dream — Could Not Load Page</title></head>
  <body style="font-family:sans-serif;padding:40px;background:#0d7377;color:white;">
    <h1>🌴 Island Dream</h1>
    <h2>Could not load this page</h2>
    <p>The page at <strong>${targetUrl}</strong> could not be fetched.</p>
    <p><a href="/" style="color:#7fffd4;">Return to Island Dream</a></p>
  </body>
</html>`);
  }
});

// ── Page meta route ────────────────────────────────────────────────────────
router.get("/proxy/meta", async (req, res) => {
  const urlParam = req.query["url"];

  if (!urlParam || typeof urlParam !== "string") {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(urlParam);
    new URL(targetUrl);
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  if (isBlockedUrl(targetUrl)) {
    res.status(403).json({ error: "URL not allowed" });
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 Island Dream Browser/1.0",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    const html = await upstream.text();
    const $ = cheerio.load(html);

    const title =
      $("meta[property='og:title']").attr("content") ||
      $("title").first().text().trim() ||
      null;

    const description =
      $("meta[property='og:description']").attr("content") ||
      $("meta[name='description']").attr("content") ||
      null;

    const favicon = `https://www.google.com/s2/favicons?domain=${new URL(targetUrl).hostname}&sz=32`;

    res.json({ title, description, favicon, url: targetUrl });
  } catch (err) {
    req.log.error({ err }, "Proxy meta fetch failed");
    res.status(502).json({ error: "Failed to fetch page metadata" });
  }
});

export default router;
