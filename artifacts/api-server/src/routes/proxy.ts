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
  if (
    !href ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#") ||
    href.startsWith("data:")
  ) {
    return null;
  }
  try {
    if (href.startsWith("//")) {
      const base = new URL(baseUrl);
      return `${base.protocol}${href}`;
    } else if (href.startsWith("/")) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${href}`;
    } else if (/^https?:\/\//i.test(href)) {
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

/** Wrap an absolute URL in the proxy path. embed=true suppresses the toolbar for nested resources. */
function proxyUrl(abs: string, embed = false): string {
  return `${PROXY_BASE}?url=${encodeURIComponent(abs)}${embed ? "&embed=1" : ""}`;
}

/** Resolve href relative to baseUrl, then wrap in proxy. Returns original href if unresolvable. */
function rewriteUrl(href: string, baseUrl: string, embed = false): string {
  const abs = makeAbsolute(href, baseUrl);
  if (abs === null) return href;
  return proxyUrl(abs, embed);
}

/**
 * Rewrite a srcset attribute — each entry is "url descriptor?" where descriptor
 * is optional e.g. "1x", "2x", "480w".
 */
function rewriteSrcset(srcset: string, baseUrl: string): string {
  return srcset
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      // Find the last whitespace-delimited token — that's the descriptor (if any)
      const match = trimmed.match(/^(\S+)(\s+\S+)?$/);
      if (!match) return trimmed;
      const url = match[1];
      const descriptor = match[2] || "";
      const abs = makeAbsolute(url, baseUrl);
      return abs ? `${proxyUrl(abs)}${descriptor}` : trimmed;
    })
    .join(", ");
}

/**
 * Rewrite CSS url() references inside inline style attributes or <style> blocks.
 * Handles: url("…"), url('…'), url(…)
 */
function rewriteCssUrls(css: string, baseUrl: string): string {
  return css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_match, quote, rawUrl) => {
    const trimmed = rawUrl.trim();
    const abs = makeAbsolute(trimmed, baseUrl);
    if (!abs) return _match;
    return `url(${quote}${proxyUrl(abs)}${quote})`;
  });
}

/**
 * JavaScript injected into every proxied page.
 * - Intercepts location.assign / location.replace / window.open
 * - Tries to intercept location.href setter
 * - Posts a postMessage to parent when a redirect is detected
 * - MutationObserver watches for dynamically added meta-refresh tags
 * - Overrides fetch + XMLHttpRequest to route through the proxy
 */
const INTERCEPTOR_SCRIPT = `
<script id="__island_dream_interceptor__">
(function() {
  'use strict';
  if (window.__islandDreamActive) return;
  window.__islandDreamActive = true;

  var PROXY = '/api/proxy';

  function resolveUrl(url) {
    try { return new URL(url, window.location.href).href; } catch(e) { return String(url); }
  }

  function toProxied(url) {
    var abs = resolveUrl(url);
    if (!abs || abs.indexOf('island_dream') !== -1 || abs.indexOf('/api/proxy') === 0) return abs;
    return PROXY + '?url=' + encodeURIComponent(abs) + '&embed=1';
  }

  function interceptRedirect(rawUrl) {
    var url = resolveUrl(rawUrl);
    window.parent.postMessage({ type: 'island-dream-redirect', url: url, from: window.location.href }, '*');
    throw new Error('Island Dream: redirect intercepted to ' + url);
  }

  // --- location.assign ---
  try { window.location.assign = function(url) { interceptRedirect(url); }; } catch(e) {}

  // --- location.replace ---
  try { window.location.replace = function(url) { interceptRedirect(url); }; } catch(e) {}

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

  // --- fetch proxy ---
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(input, init) {
      try {
        var url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
        if (url && typeof url === 'string' && /^https?:\\/\\//i.test(url)) {
          var proxied = toProxied(url);
          if (typeof input === 'string') input = proxied;
          else if (input instanceof URL) input = new URL(proxied, window.location.href);
          else input = new Request(proxied, input);
        }
      } catch(e) {}
      return origFetch.call(window, input, init);
    };
  }

  // --- XMLHttpRequest proxy ---
  var origOpen2 = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    try {
      if (typeof url === 'string' && /^https?:\\/\\//i.test(url)) {
        arguments[1] = toProxied(url);
      }
    } catch(e) {}
    return origOpen2.apply(this, arguments);
  };

  // --- Console capture: forward logs to parent Browse frame ---
  var origConsole = {};
  ['log', 'warn', 'error', 'info', 'debug'].forEach(function(level) {
    origConsole[level] = console[level].bind(console);
    console[level] = function() {
      origConsole[level].apply(console, arguments);
      try {
        var args = Array.prototype.slice.call(arguments).map(function(a) {
          if (a === null) return 'null';
          if (a === undefined) return 'undefined';
          if (a instanceof Error) return a.stack || a.message;
          try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
          catch(e) { return String(a); }
        });
        window.parent.postMessage({
          type: 'island-dream-console',
          level: level,
          args: args,
          source: window.location.href,
          ts: Date.now()
        }, '*');
      } catch(e) {}
    };
  });

  // --- Uncaught JS errors ---
  window.addEventListener('error', function(e) {
    try {
      var loc = e.filename ? ' (' + e.filename.replace(/.*\\/api\\/proxy\\?url=/, '') + ':' + e.lineno + ':' + e.colno + ')' : '';
      window.parent.postMessage({
        type: 'island-dream-console',
        level: 'error',
        args: ['Uncaught: ' + e.message + loc],
        source: window.location.href,
        ts: Date.now()
      }, '*');
    } catch(ex) {}
  }, true);

  // --- Unhandled promise rejections ---
  window.addEventListener('unhandledrejection', function(e) {
    try {
      var msg = e.reason instanceof Error ? (e.reason.stack || e.reason.message) : String(e.reason);
      window.parent.postMessage({
        type: 'island-dream-console',
        level: 'error',
        args: ['Unhandled Promise: ' + msg],
        source: window.location.href,
        ts: Date.now()
      }, '*');
    } catch(ex) {}
  });

  // --- Resource load errors (img, script, link, iframe) ---
  window.addEventListener('error', function(e) {
    var t = e.target;
    if (!t || t === window) return;
    var tag = t.tagName && t.tagName.toUpperCase();
    if (!tag) return;
    var src = t.src || t.href || '';
    if (src) {
      window.parent.postMessage({
        type: 'island-dream-console',
        level: 'warn',
        args: ['Failed to load <' + tag.toLowerCase() + '>: ' + src],
        source: window.location.href,
        ts: Date.now()
      }, '*');
    }
  }, true);

  // --- MutationObserver: dynamic meta-refresh + dynamic scripts/iframes ---
  function stripMetaRefresh(node) {
    if (!node || node.nodeType !== 1) return;
    var tag = node.tagName && node.tagName.toUpperCase();
    if (tag === 'META') {
      var equiv = node.getAttribute('http-equiv') || '';
      if (equiv.toLowerCase() === 'refresh') {
        var content = node.getAttribute('content') || '';
        var m = content.match(/url=['"]?([^'"]+)['"]?/i);
        if (m) { try { interceptRedirect(m[1].trim()); } catch(e) {} }
        node.parentNode && node.parentNode.removeChild(node);
      }
    }
    // Rewrite src of dynamically injected scripts/iframes/images
    if (tag === 'SCRIPT' || tag === 'IFRAME' || tag === 'IMG') {
      var src = node.getAttribute('src');
      if (src && /^https?:\\/\\//i.test(src) && src.indexOf('/api/proxy') !== 0) {
        node.setAttribute('src', toProxied(src));
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

function rewriteHtml(
  html: string,
  targetUrl: string,
  embedMode = false
): { output: string; stats: RewriteStats } {
  const $ = cheerio.load(html);
  let adsBlocked = 0;

  // ── 0. Remove <base> tag — it would break all our rewritten URLs ───────────
  $("base").remove();

  // ── 1. Strip meta refresh tags ─────────────────────────────────────────────
  $("meta[http-equiv]").each((_i, el) => {
    if (($(el).attr("http-equiv") || "").toLowerCase() === "refresh") {
      $(el).remove();
    }
  });

  // ── 2. Remove known ad container elements ─────────────────────────────────
  try {
    $(AD_SELECTORS).each((_i, el) => { $(el).remove(); adsBlocked++; });
  } catch { /* ignore selector errors */ }

  // ── 3. <script src> — remove ad domains, proxy everything else ────────────
  $("script[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    const abs = makeAbsolute(src, targetUrl);
    if (abs && isAdDomain(abs)) {
      $(el).remove(); adsBlocked++; return;
    }
    if (abs) $(el).attr("src", proxyUrl(abs, true));
  });

  // ── 4. <link href> — remove ad domains, proxy everything else ────────────
  $("link[href]").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const abs = makeAbsolute(href, targetUrl);
    if (abs && isAdDomain(abs)) {
      $(el).remove(); adsBlocked++; return;
    }
    if (abs) $(el).attr("href", proxyUrl(abs, true));
  });

  // ── 5. <img src + srcset> — remove ad domains, proxy everything else ──────
  $("img").each((_i, el) => {
    const src = $(el).attr("src") || "";
    if (src && !src.startsWith("data:")) {
      const abs = makeAbsolute(src, targetUrl);
      if (abs && isAdDomain(abs)) {
        $(el).remove(); adsBlocked++; return;
      }
      if (abs) $(el).attr("src", proxyUrl(abs, true));
    }
    // srcset
    const srcset = $(el).attr("srcset");
    if (srcset) $(el).attr("srcset", rewriteSrcset(srcset, targetUrl));
    // data-src (lazy loading)
    const dataSrc = $(el).attr("data-src");
    if (dataSrc) {
      const abs2 = makeAbsolute(dataSrc, targetUrl);
      if (abs2) $(el).attr("data-src", proxyUrl(abs2, true));
    }
  });

  // ── 6. <iframe src> — remove ad domains, proxy everything else ────────────
  $("iframe[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    if (!src || src.startsWith("data:") || src === "about:blank") return;
    const abs = makeAbsolute(src, targetUrl);
    if (abs && isAdDomain(abs)) {
      $(el).remove(); adsBlocked++; return;
    }
    if (abs) {
      $(el).attr("src", proxyUrl(abs, true));
      // Ensure iframe can render proxied content
      const existing = $(el).attr("sandbox") || "";
      if (existing) {
        // Add any missing permissions needed for proxied content
        const parts = new Set(existing.split(/\s+/).filter(Boolean));
        ["allow-same-origin", "allow-scripts", "allow-forms", "allow-popups"].forEach(p => parts.add(p));
        $(el).attr("sandbox", [...parts].join(" "));
      }
    }
  });

  // ── 7. <source src + srcset> (picture, video, audio) ─────────────────────
  $("source").each((_i, el) => {
    const src = $(el).attr("src");
    if (src) {
      const abs = makeAbsolute(src, targetUrl);
      if (abs) $(el).attr("src", proxyUrl(abs, true));
    }
    const srcset = $(el).attr("srcset");
    if (srcset) $(el).attr("srcset", rewriteSrcset(srcset, targetUrl));
  });

  // ── 8. <video src>, <audio src> ───────────────────────────────────────────
  $("video[src], audio[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    const abs = makeAbsolute(src, targetUrl);
    if (abs) $(el).attr("src", proxyUrl(abs, true));
  });

  // ── 9. <video poster> ─────────────────────────────────────────────────────
  $("video[poster]").each((_i, el) => {
    const poster = $(el).attr("poster") || "";
    const abs = makeAbsolute(poster, targetUrl);
    if (abs) $(el).attr("poster", proxyUrl(abs, true));
  });

  // ── 10. Inline style attributes — rewrite url() ───────────────────────────
  $("[style]").each((_i, el) => {
    const style = $(el).attr("style") || "";
    if (style.includes("url(")) {
      $(el).attr("style", rewriteCssUrls(style, targetUrl));
    }
  });

  // ── 11. <style> blocks — rewrite url() ────────────────────────────────────
  $("style").each((_i, el) => {
    const css = $(el).html() || "";
    if (css.includes("url(")) {
      $(el).html(rewriteCssUrls(css, targetUrl));
    }
  });

  // ── 12. <a href> — route through proxy ────────────────────────────────────
  $("a[href]").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const rewritten = rewriteUrl(href, targetUrl);
    if (rewritten !== href) {
      $(el).attr("href", rewritten);
      $(el).attr("target", "_self");
    }
  });

  // ── 13. <form action> — route through proxy ───────────────────────────────
  $("form[action]").each((_i, el) => {
    const action = $(el).attr("action") || "";
    if (action && !action.startsWith("javascript:")) {
      $(el).attr("action", rewriteUrl(action, targetUrl));
    }
  });

  // ── 14. Inject interceptor script before anything else ────────────────────
  const headEl = $("head");
  if (headEl.length) {
    headEl.prepend(INTERCEPTOR_SCRIPT);
  } else {
    $("body").prepend(INTERCEPTOR_SCRIPT);
  }

  // ── 15. Inject Island Dream toolbar (skip in embed mode) ──────────────────
  if (!embedMode) {
    const adBadge =
      adsBlocked > 0
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
  }

  return { output: $.html(), stats: { adsBlocked } };
}

/** Special page returned when an HTTP redirect is detected */
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
  const embedMode = req.query["embed"] === "1";

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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
      },
      redirect: "manual",
    });

    // ── Intercept HTTP-level redirects ──────────────────────────────────────
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location") || "";
      if (location) {
        let redirectTarget: string;
        try {
          redirectTarget = new URL(location, targetUrl).href;
        } catch {
          redirectTarget = location;
        }
        if (embedMode) {
          // For embedded resources, just follow the redirect through the proxy
          res.redirect(302, proxyUrl(redirectTarget, true));
        } else {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.send(makeRedirectInterceptPage(targetUrl, redirectTarget));
        }
        return;
      }
    }

    const contentType = upstream.headers.get("content-type") || "";

    // Strip headers that would break iframe embedding or cause issues
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("X-Content-Type-Options");

    if (!contentType.includes("text/html")) {
      // Non-HTML: stream through with original content type
      res.setHeader("Content-Type", contentType);
      const buffer = await upstream.arrayBuffer();
      res.send(Buffer.from(buffer));
      return;
    }

    const html = await upstream.text();
    const { output } = rewriteHtml(html, targetUrl, embedMode);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Island-Dream-Proxied", "1");
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
