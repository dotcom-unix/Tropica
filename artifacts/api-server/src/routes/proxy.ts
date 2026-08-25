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

const PROXY_BASE = "/api/proxy"; //edit out later

interface ProtectionOptions {
  adBlock: boolean;
  redirectBlock: boolean;
  popupBlock: boolean;
}

const DEFAULT_PROTECTION: ProtectionOptions = {
  adBlock: true,
  redirectBlock: true,
  popupBlock: true,
};

function readProtection(query: Record<string, unknown>): ProtectionOptions {
  return {
    adBlock: query["adblock"] !== "0",
    redirectBlock: query["redirectblock"] !== "0",
    popupBlock: query["popupblock"] !== "0",
  };
}

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
    // URL() correctly handles query strings, dot segments, protocol-relative
    // URLs, and a document URL with or without a trailing slash.
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

/** Wrap an absolute URL in the proxy path. embed=true suppresses the toolbar for nested resources. */
function proxyUrl(abs: string, embed = false, protection = DEFAULT_PROTECTION): string {
  const params = new URLSearchParams({
    url: abs,
    adblock: protection.adBlock ? "1" : "0",
    redirectblock: protection.redirectBlock ? "1" : "0",
    popupblock: protection.popupBlock ? "1" : "0",
  });
  if (embed) params.set("embed", "1");
  return `${PROXY_BASE}?${params.toString()}`;
}

/** Resolve href relative to baseUrl, then wrap in proxy. Returns original href if unresolvable. */
function rewriteUrl(href: string, baseUrl: string, embed = false, protection = DEFAULT_PROTECTION): string {
  const abs = makeAbsolute(href, baseUrl);
  if (abs === null) return href;
  return proxyUrl(abs, embed, protection);
}

/**
 * Rewrite a srcset attribute — each entry is "url descriptor?" where descriptor
 * is optional e.g. "1x", "2x", "480w".
 */
function rewriteSrcset(srcset: string, baseUrl: string, protection = DEFAULT_PROTECTION): string {
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
      return abs ? `${proxyUrl(abs, true, protection)}${descriptor}` : trimmed;
    })
    .join(", ");
}

/**
 * Rewrite CSS url() references inside inline style attributes or <style> blocks.
 * Handles: url("…"), url('…'), url(…)
 */
function rewriteCssUrls(css: string, baseUrl: string, protection = DEFAULT_PROTECTION): string {
  const withImports = css.replace(
    /(@import\s+)(['"])([^'"]+)\2/gi,
    (_match, prefix, quote, rawUrl) => `${prefix}${quote}${rewriteUrl(rawUrl, baseUrl, true, protection)}${quote}`,
  );
  return withImports.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_match, quote, rawUrl) => {
    const trimmed = rawUrl.trim();
    const abs = makeAbsolute(trimmed, baseUrl);
    if (!abs) return _match;
    return `url(${quote}${proxyUrl(abs, true, protection)}${quote})`;
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
  var islandQuery = new URLSearchParams(window.location.search);
  var TARGET_URL = islandQuery.get('url') || window.location.href;
  var REDIRECT_BLOCK = islandQuery.get('redirectblock') !== '0';
  var POPUP_BLOCK = islandQuery.get('popupblock') !== '0';
  var AD_BLOCK = islandQuery.get('adblock') !== '0';

  function resolveUrl(url) {
    try { return new URL(url, window.location.href).href; } catch(e) { return String(url); }
  }

  function toProxied(url) {
    var raw = String(url || '');
    if (!raw || /^(data:|blob:|javascript:|about:)/i.test(raw) ||
        raw.indexOf('/api/proxy') === 0) return url; 
    var abs;
    try { abs = new URL(raw, TARGET_URL).href; } catch(e) { abs = resolveUrl(raw); }
    if (!abs || abs.indexOf('/api/proxy') === 0) return url;
    return PROXY + '?url=' + encodeURIComponent(abs) +
      '&embed=1&adblock=' + (AD_BLOCK ? '1' : '0') +
      '&redirectblock=' + (REDIRECT_BLOCK ? '1' : '0') +
      '&popupblock=' + (POPUP_BLOCK ? '1' : '0');
  }

  function interceptRedirect(rawUrl) {
    var url = resolveUrl(rawUrl);
    var proxiedUrl = toProxied(rawUrl);
    if (!REDIRECT_BLOCK) {
      try { window.location.href = proxiedUrl; } catch(e) {}
      return;
    }
    window.parent.postMessage({ type: 'island-dream-redirect', url: url, from: window.location.href }, '*');
    throw new Error('Tropic: redirect intercepted to ' + url);
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
    if (!POPUP_BLOCK) {
      var proxiedUrl = url && String(url) !== 'about:blank' ? toProxied(url) : url;
      var popupArgs = [proxiedUrl, target, features];
      return origOpen ? origOpen.apply(window, popupArgs) : null;
    }
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
        if (url && typeof url === 'string' && !/^(data:|blob:|javascript:|about:)/i.test(url)) {
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
      if (typeof url === 'string' && !/^(data:|blob:|javascript:|about:)/i.test(url)) {
        arguments[1] = toProxied(url);
      }
    } catch(e) {}
    return origOpen2.apply(this, arguments);
  };

  // --- MutationObserver: dynamic redirects, navigation, and resources ---
  function rewriteAttribute(node, attribute) {
    if (!node || !node.getAttribute) return;
    var raw = node.getAttribute(attribute);
    if (!raw || /^(data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(raw) ||
        raw.indexOf('/api/proxy') === 0) return;
    var proxied = toProxied(raw);
    if (proxied && proxied !== raw) node.setAttribute(attribute, proxied);
  }

  function rewriteDynamicElement(node) {
    if (!node || node.nodeType !== 1) return;
    var tag = node.tagName && node.tagName.toUpperCase();
    if (tag === 'A') rewriteAttribute(node, 'href');
    if (tag === 'FORM') rewriteAttribute(node, 'action');
    if (tag === 'SCRIPT' || tag === 'IFRAME' || tag === 'IMG' ||
        tag === 'VIDEO' || tag === 'AUDIO' || tag === 'SOURCE' ||
        tag === 'TRACK' || tag === 'EMBED' || tag === 'INPUT') rewriteAttribute(node, 'src');
    if (tag === 'LINK') rewriteAttribute(node, 'href');
    if (tag === 'OBJECT') rewriteAttribute(node, 'data');
    if (tag === 'VIDEO') rewriteAttribute(node, 'poster');
    if (node.querySelectorAll) {
      node.querySelectorAll('a,form,script,iframe,img,video,audio,source,track,embed,input,link,object')
        .forEach(rewriteDynamicElement);
    }
  }

  function stripMetaRefresh(node) {
    if (!node || node.nodeType !== 1) return;
    var tag = node.tagName && node.tagName.toUpperCase();
    if (tag === 'META') {
      var equiv = node.getAttribute('http-equiv') || '';
      if (equiv.toLowerCase() === 'refresh') {
        var content = node.getAttribute('content') || '';
        var m = content.match(/url=['"]?([^'"]+)['"]?/i);
        if (m && REDIRECT_BLOCK) { try { interceptRedirect(m[1].trim()); } catch(e) {} }
        if (m && !REDIRECT_BLOCK) { try { window.location.href = toProxied(m[1].trim()); } catch(e) {} }
        node.parentNode && node.parentNode.removeChild(node);
      }
    }
    rewriteDynamicElement(node);
  }

  try {
    var obs = new MutationObserver(function(mutations) {
      mutations.forEach(function(mut) {
        mut.addedNodes.forEach(function(n) { stripMetaRefresh(n); });
      });
    });
    obs.observe(document.documentElement || document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'src', 'action', 'data', 'poster'],
    });
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
  embedMode = false,
  protection: ProtectionOptions = DEFAULT_PROTECTION
): { output: string; stats: RewriteStats } {
  const $ = cheerio.load(html);
  let adsBlocked = 0;

  // ── 0. Remove <base> tag — it would break all our rewritten URLs ───────────
  $("base").remove();

  // ── 1. Strip meta refresh tags ─────────────────────────────────────────────
  $("meta[http-equiv]").each((_i, el) => {
    if (protection.redirectBlock && ($(el).attr("http-equiv") || "").toLowerCase() === "refresh") {
      $(el).remove();
    }
  });

  // ── 2. Remove known ad container elements ─────────────────────────────────
  if (protection.adBlock) {
    try {
      $(AD_SELECTORS).each((_i, el) => { $(el).remove(); adsBlocked++; });
    } catch { /* ignore selector errors */ }
  }

  // ── 3. <script src> — remove ad domains, proxy everything else ────────────
  $("script[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    const abs = makeAbsolute(src, targetUrl);
    if (protection.adBlock && abs && isAdDomain(abs)) {
      $(el).remove(); adsBlocked++; return;
    }
    if (abs) $(el).attr("src", proxyUrl(abs, true, protection)); // problem
  });

  // ── 4. <link href> — remove ad domains, proxy everything else ────────────
  $("link[href]").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const abs = makeAbsolute(href, targetUrl);
    if (protection.adBlock && abs && isAdDomain(abs)) {
      $(el).remove(); adsBlocked++; return;
    }
    if (abs) $(el).attr("href", proxyUrl(abs, true, protection));
  });

  // ── 5. <img src + srcset> — remove ad domains, proxy everything else ──────
  $("img").each((_i, el) => {
    const src = $(el).attr("src") || "";
    if (src && !src.startsWith("data:")) {
      const abs = makeAbsolute(src, targetUrl);
      if (protection.adBlock && abs && isAdDomain(abs)) {
        $(el).remove(); adsBlocked++; return;
      }
      if (abs) $(el).attr("src", proxyUrl(abs, true, protection)); // problem
    }
    // srcset
    const srcset = $(el).attr("srcset");
    if (srcset) $(el).attr("srcset", rewriteSrcset(srcset, targetUrl, protection));
    // data-src (lazy loading)
    const dataSrc = $(el).attr("data-src");
    if (dataSrc) {
      const abs2 = makeAbsolute(dataSrc, targetUrl);
      if (abs2) $(el).attr("data-src", proxyUrl(abs2, true, protection));
    }
  });

  // ── 6. <iframe src> — remove ad domains, proxy everything else ────────────
  $("iframe[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    if (!src || src.startsWith("data:") || src === "about:blank") return;
    const abs = makeAbsolute(src, targetUrl);
    if (protection.adBlock && abs && isAdDomain(abs)) {
      $(el).remove(); adsBlocked++; return;
    }
    if (abs) {
      $(el).attr("src", proxyUrl(abs, true, protection));
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
      if (abs) $(el).attr("src", proxyUrl(abs, true, protection));
    }
    const srcset = $(el).attr("srcset");
    if (srcset) $(el).attr("srcset", rewriteSrcset(srcset, targetUrl, protection));
  });

  // ── 8. <video src>, <audio src> ───────────────────────────────────────────
  $("video[src], audio[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    const abs = makeAbsolute(src, targetUrl);
    if (abs) $(el).attr("src", proxyUrl(abs, true, protection));
  });

  // ── 9. <video poster> ─────────────────────────────────────────────────────
  $("video[poster]").each((_i, el) => {
    const poster = $(el).attr("poster") || "";
    const abs = makeAbsolute(poster, targetUrl);
    if (abs) $(el).attr("poster", proxyUrl(abs, true, protection));
  });

  // Other URL-bearing elements that frequently appear in embeds.
  $("object[data], embed[src], track[src], input[src]").each((_i, el) => {
    const attribute = $(el).is("[data]") ? "data" : "src";
    const raw = $(el).attr(attribute) || "";
    const abs = makeAbsolute(raw, targetUrl);
    if (abs) $(el).attr(attribute, proxyUrl(abs, true, protection));
  });

  // SVG and legacy media elements can carry URLs outside the standard HTML
  // selectors above. Rewrite these as well so inline SVG icons cannot make a
  // direct browser request to the upstream host.
  $("image[src], image[href], image[xlink\\:href], use[href], use[xlink\\:href], [formaction], [cite], [background]").each((_i, el) => {
    ["src", "href", "xlink:href", "formaction", "cite", "background"].forEach((attribute) => {
      const value = $(el).attr(attribute);
      if (!value || /^(javascript:|mailto:|tel:|data:|blob:|#)/i.test(value)) return;
      const abs = makeAbsolute(value, targetUrl);
      if (abs) $(el).attr(attribute, proxyUrl(abs, true, protection));
    });
  });

  // ── 10. Inline style attributes — rewrite url() ───────────────────────────
  $("[style]").each((_i, el) => {
    const style = $(el).attr("style") || "";
    if (style.includes("url(")) {
      $(el).attr("style", rewriteCssUrls(style, targetUrl, protection));
    }
  });

  // ── 11. <style> blocks — rewrite url() ────────────────────────────────────
  $("style").each((_i, el) => {
    const css = $(el).html() || "";
    if (css.includes("url(")) {
      $(el).html(rewriteCssUrls(css, targetUrl, protection));
    }
  });

  // ── 12. <a href> — route through proxy ────────────────────────────────────
  $("a[href]").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const rewritten = rewriteUrl(href, targetUrl, false, protection);
    if (rewritten !== href) {
      $(el).attr("href", rewritten);
      if (protection.popupBlock) $(el).attr("target", "_self");
    }
  });
  if (protection.popupBlock) {
    $("a[target='_blank'], a[target='_new'], a[target='_parent']").attr("target", "_self");
  }

  // ── 13. <form action> — route through proxy ───────────────────────────────
  $("form[action]").each((_i, el) => {
    const action = $(el).attr("action") || "";
    if (action && !action.startsWith("javascript:")) {
      $(el).attr("action", rewriteUrl(action, targetUrl, false, protection));
    }
  });

  // ── 14. Inject interceptor script before anything else ────────────────────
  const headEl = $("head");
  if (headEl.length) {
    headEl.prepend(INTERCEPTOR_SCRIPT);
  } else {
    $("body").prepend(INTERCEPTOR_SCRIPT);
  }

  // ── 15. Inject Tropic toolbar (skip in embed mode) ────────────────────────
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
  <a href="/" style="color:white;text-decoration:none;font-weight:700;white-space:nowrap;font-size:14px;">Tropic</a>
  <span style="background:rgba(255,255,255,0.15);border-radius:4px;padding:3px 8px;white-space:nowrap;font-size:11px;">ScView</span>
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
  <title>Tropic — Redirect Detected</title>
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
    <p style="margin-top:12px;font-size:12px;opacity:0.6;">Asking Tropic for permission…</p>
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
router.all("/proxy", async (req, res) => { //fah
  const urlParam = req.query["url"];
  const embedMode = req.query["embed"] === "1";
  const protection = readProtection(req.query as Record<string, unknown>);

  if (!urlParam || typeof urlParam !== "string") {
    res.status(400).send("<h1>Tropic Proxy: Missing URL</h1>");
    return;
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(urlParam);
    new URL(targetUrl);
  } catch {
    res.status(400).send("<h1>Tropic Proxy: Invalid URL</h1>");
    return;
  }

  if (isBlockedUrl(targetUrl)) {
    res.status(403).send("<h1>Tropic Proxy: This URL is not allowed.</h1>");
    return;
  }

  try {
    const upstreamRequestHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
    };
    const requestContentType = req.headers["content-type"];
    if (typeof requestContentType === "string") {
      upstreamRequestHeaders["Content-Type"] = requestContentType;
    }

    let requestBody: string | undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (requestContentType?.includes("application/x-www-form-urlencoded")) {
        requestBody = new URLSearchParams(req.body as Record<string, string>).toString();
      } else if (requestContentType?.includes("application/json")) {
        requestBody = JSON.stringify(req.body);
      }
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: upstreamRequestHeaders,
      body: requestBody,
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
        if (embedMode || !protection.redirectBlock) {
          // For embedded resources, just follow the redirect through the proxy
          res.redirect(302, proxyUrl(redirectTarget, true, protection));
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

    if (!contentType.includes("text/html") && !contentType.includes("text/css")) {
      // Non-HTML: stream through with original content type
      res.setHeader("Content-Type", contentType);
      const buffer = await upstream.arrayBuffer();
      res.send(Buffer.from(buffer));
      return;
    }

    const sourceText = await upstream.text();
    const output = contentType.includes("text/css")
      ? rewriteCssUrls(sourceText, targetUrl, protection)
      : rewriteHtml(sourceText, targetUrl, embedMode, protection).output;

    res.setHeader(
      "Content-Type",
      contentType.includes("text/css")
        ? "text/css; charset=utf-8"
        : "text/html; charset=utf-8",
    );
    res.setHeader("X-Island-Dream-Proxied", "1");
    res.send(output);
  } catch (err) {
    req.log.error({ err }, "Proxy fetch failed");
    res.status(502).send(`<!DOCTYPE html>
<html>
      <head><title>Tropic — Could Not Load Page</title></head>
  <body style="font-family:sans-serif;padding:40px;background:#0d7377;color:white;">
    <h1>Tropic</h1>
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
        "User-Agent": "Mozilla/5.0 Tropica Browser/1.0",
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

    const favicon = `/api/favicon?domain=${encodeURIComponent(new URL(targetUrl).hostname)}`;

    res.json({ title, description, favicon, url: targetUrl });
  } catch (err) {
    req.log.error({ err }, "Proxy meta fetch failed");
    res.status(502).json({ error: "Failed to fetch page metadata" });
  }
});

export default router;
