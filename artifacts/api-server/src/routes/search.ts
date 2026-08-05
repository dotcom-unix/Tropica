import { Router, type IRouter } from "express";
import * as cheerio from "cheerio";

const router: IRouter = Router();

interface SearchResult {
  title: string;
  url: string;
  description: string;
  domain: string;
  favicon: string | null;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

async function scrapeSearch(query: string, page: number = 1): Promise<SearchResult[]> {
  const offset = (page - 1) * 30;
  const url = offset > 0
    ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${offset}`
    : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      Referer: "https://duckduckgo.com/",
    },
  });

  if (!resp.ok) {
    throw new Error(`DuckDuckGo returned ${resp.status}`);
  }

  const html = await resp.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  // DuckDuckGo HTML results are in .result elements
  $(".result").each((_i, el) => {
    const $el = $(el);

    // Skip ads and non-result elements
    if ($el.hasClass("result--ad") || $el.hasClass("result--more")) return;

    const titleEl = $el.find(".result__a").first();
    const snippetEl = $el.find(".result__snippet").first();
    const urlEl = $el.find(".result__url").first();

    const title = titleEl.text().trim();
    if (!title) return;

    // Extract the actual URL from the href (DuckDuckGo uses a redirect)
    let href = titleEl.attr("href") || "";
    let actualUrl = "";

    if (href.startsWith("//duckduckgo.com/l/?")) {
      // Parse the uddg parameter which holds the actual URL
      try {
        const params = new URLSearchParams(href.replace("//duckduckgo.com/l/?", ""));
        actualUrl = decodeURIComponent(params.get("uddg") || "");
      } catch {
        actualUrl = href;
      }
    } else if (href.startsWith("http")) {
      actualUrl = href;
    } else {
      // Use the displayed URL as fallback
      const displayUrl = urlEl.text().trim();
      actualUrl = displayUrl.startsWith("http") ? displayUrl : `https://${displayUrl}`;
    }

    if (!actualUrl) return;

    const description = snippetEl.text().trim() || "No description available.";
    const domain = extractDomain(actualUrl);

    results.push({
      title,
      url: actualUrl,
      description,
      domain,
      favicon: getFaviconUrl(domain),
    });
  });

  return results;
}

router.get("/search", async (req, res) => {
  const q = req.query["q"];
  const page = parseInt(String(req.query["page"] || "1"), 10);

  if (!q || typeof q !== "string" || q.trim().length === 0) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  try {
    const results = await scrapeSearch(q.trim(), page);
    res.json({
      results,
      query: q.trim(),
      hasMore: results.length >= 10,
    });
  } catch (err) {
    req.log.error({ err }, "Search scrape failed");
    res.status(502).json({ error: "Failed to fetch search results" });
  }
});

export default router;
