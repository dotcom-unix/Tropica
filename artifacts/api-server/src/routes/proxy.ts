import { Router, type IRouter } from "express";
import * as cheerio from "cheerio";

const router: IRouter = Router();

const BLOCKED_DOMAINS = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];

function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return true;
    if (BLOCKED_DOMAINS.some((d) => parsed.hostname.includes(d))) return true;
    return false;
  } catch {
    return true;
  }
}

const PROXY_BASE = "/api/proxy";

function rewriteUrl(href: string, baseUrl: string): string {
  if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
    return href;
  }
  try {
    let absolute: string;
    if (href.startsWith("//")) {
      const base = new URL(baseUrl);
      absolute = `${base.protocol}${href}`;
    } else if (href.startsWith("/")) {
      const base = new URL(baseUrl);
      absolute = `${base.protocol}//${base.host}${href}`;
    } else if (href.startsWith("http://") || href.startsWith("https://")) {
      absolute = href;
    } else {
      const base = new URL(baseUrl);
      const basePath = base.pathname.split("/").slice(0, -1).join("/") + "/";
      absolute = `${base.protocol}//${base.host}${basePath}${href}`;
    }
    return `${PROXY_BASE}?url=${encodeURIComponent(absolute)}`;
  } catch {
    return href;
  }
}

function rewriteHtml(html: string, targetUrl: string): string {
  const $ = cheerio.load(html);

  // Rewrite anchor hrefs so navigation stays inside proxy
  $("a[href]").each((_i, el) => {
    const href = $(el).attr("href") || "";
    $(el).attr("href", rewriteUrl(href, targetUrl));
    $(el).attr("target", "_self");
  });

  // Rewrite form actions
  $("form[action]").each((_i, el) => {
    const action = $(el).attr("action") || "";
    $(el).attr("action", rewriteUrl(action, targetUrl));
  });

  // Make images and scripts absolute so they load correctly
  $("img[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    if (src.startsWith("//") || src.startsWith("/")) {
      try {
        const base = new URL(targetUrl);
        if (src.startsWith("//")) {
          $(el).attr("src", `${base.protocol}${src}`);
        } else {
          $(el).attr("src", `${base.protocol}//${base.host}${src}`);
        }
      } catch { /* ignore */ }
    }
  });

  // Make CSS links absolute
  $("link[rel='stylesheet'][href]").each((_i, el) => {
    const href = $(el).attr("href") || "";
    if (href.startsWith("//") || href.startsWith("/")) {
      try {
        const base = new URL(targetUrl);
        if (href.startsWith("//")) {
          $(el).attr("href", `${base.protocol}${href}`);
        } else {
          $(el).attr("href", `${base.protocol}//${base.host}${href}`);
        }
      } catch { /* ignore */ }
    }
  });

  // Make script srcs absolute
  $("script[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    if (src.startsWith("//") || src.startsWith("/")) {
      try {
        const base = new URL(targetUrl);
        if (src.startsWith("//")) {
          $(el).attr("src", `${base.protocol}${src}`);
        } else {
          $(el).attr("src", `${base.protocol}//${base.host}${src}`);
        }
      } catch { /* ignore */ }
    }
  });

  // Inject Island Dream proxy toolbar at the top of body
  const toolbar = `
  <div id="island-dream-toolbar" style="
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 2147483647;
    background: linear-gradient(135deg, #0d7377 0%, #14a085 50%, #1a936f 100%);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    min-height: 44px;
    box-sizing: border-box;
  ">
    <a href="/" style="color:white;text-decoration:none;font-weight:700;white-space:nowrap;font-size:14px;">🌴 Island Dream</a>
    <span style="background:rgba(255,255,255,0.15);border-radius:4px;padding:3px 8px;white-space:nowrap;font-size:11px;letter-spacing:0.03em;">🛡 Secure Mode</span>
    <div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(0,0,0,0.2);border-radius:6px;padding:4px 10px;font-size:12px;color:rgba(255,255,255,0.85);">
      ${targetUrl}
    </div>
    <a href="${PROXY_BASE}?url=${encodeURIComponent(targetUrl)}" style="color:white;text-decoration:none;background:rgba(255,255,255,0.15);border-radius:4px;padding:4px 10px;font-size:12px;white-space:nowrap;">↺ Refresh</a>
    <a href="javascript:history.back()" style="color:white;text-decoration:none;background:rgba(255,255,255,0.15);border-radius:4px;padding:4px 10px;font-size:12px;white-space:nowrap;">← Back</a>
  </div>
  <div style="height:52px;"></div>
  `;

  $("body").prepend(toolbar);

  return $.html();
}

// Main proxy route — returns proxied HTML
router.get("/proxy", async (req, res) => {
  const urlParam = req.query["url"];

  if (!urlParam || typeof urlParam !== "string") {
    res.status(400).send("<h1>Island Dream Proxy: Missing URL</h1>");
    return;
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(urlParam);
    // Basic URL validation
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
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      // For non-HTML content, stream it directly
      res.setHeader("Content-Type", contentType);
      const buffer = await upstream.arrayBuffer();
      res.send(Buffer.from(buffer));
      return;
    }

    const html = await upstream.text();
    const rewritten = rewriteHtml(html, targetUrl);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Island-Dream-Proxied", "1");
    // Remove security headers that would block the page
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("X-Frame-Options");
    res.send(rewritten);
  } catch (err) {
    req.log.error({ err }, "Proxy fetch failed");
    res.status(502).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Island Dream — Could Not Load Page</title></head>
        <body style="font-family:sans-serif;padding:40px;background:#0d7377;color:white;">
          <h1>🌴 Island Dream</h1>
          <h2>Could not load this page</h2>
          <p>The page at <strong>${targetUrl}</strong> could not be fetched.</p>
          <p><a href="/" style="color:#7fffd4;">Return to Island Dream</a></p>
        </body>
      </html>
    `);
  }
});

// Meta endpoint — returns JSON with page title/description/favicon
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

    const favicon = (() => {
      const domain = new URL(targetUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    })();

    res.json({ title, description, favicon, url: targetUrl });
  } catch (err) {
    req.log.error({ err }, "Proxy meta fetch failed");
    res.status(502).json({ error: "Failed to fetch page metadata" });
  }
});

export default router;
