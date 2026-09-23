import { load, type CheerioAPI } from 'cheerio';
import { URL } from 'url';
import { validateUrl, CrawlerErrorCode } from './url.validator.js';
import { isAllowedByCrawler } from './robots.js';

const CRAWL_TIMEOUT_MS = Number(process.env.CRAWL_TIMEOUT_MS ?? 10_000);
const CRAWL_MAX_BYTES = Number(process.env.CRAWL_MAX_BYTES ?? 500_000);
const CRAWL_MAX_PAGES = Number(process.env.CRAWL_MAX_PAGES ?? 10);

export interface CrawledPage {
  url: string;
  title: string;
  text: string;        // Cleaned plain text
  links: string[];     // Absolute URLs found on this page
}

/**
 * Fetch a single URL, enforcing timeouts, size limits, and content-type.
 * Returns cleaned text content.
 */
export async function fetchPage(rawUrl: string): Promise<CrawledPage> {
  const parsed = validateUrl(rawUrl);

  const allowed = await isAllowedByCrawler(parsed);
  if (!allowed) {
    throw Object.assign(
      new Error(`robots.txt disallows: ${rawUrl}`),
      { code: CrawlerErrorCode.DISALLOWED },
    );
  }

  const response = await fetch(rawUrl, {
    signal: AbortSignal.timeout(CRAWL_TIMEOUT_MS),
    headers: {
      'User-Agent': 'InterviewKit/1.0 (interview preparation tool)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  }).catch((err: unknown) => {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw Object.assign(new Error(`Timeout fetching: ${rawUrl}`), { code: CrawlerErrorCode.TIMEOUT });
    }
    throw Object.assign(new Error(`Fetch error: ${String(err)}`), { code: CrawlerErrorCode.FETCH_ERROR });
  });

  if (!response.ok) {
    throw Object.assign(
      new Error(`HTTP ${response.status} for ${rawUrl}`),
      { code: CrawlerErrorCode.BAD_STATUS },
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw Object.assign(
      new Error(`Non-HTML content-type: ${contentType}`),
      { code: CrawlerErrorCode.NOT_HTML },
    );
  }

  // Enforce size limit by reading body as stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw Object.assign(new Error('No response body'), { code: CrawlerErrorCode.FETCH_ERROR });
  }

  let bytesRead = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > CRAWL_MAX_BYTES) {
      reader.cancel();
      break; // Use what we have — still extract content from partial page
    }
    chunks.push(value);
  }

  const html = new TextDecoder().decode(
    chunks.reduce((acc, chunk) => {
      const merged = new Uint8Array(acc.length + chunk.length);
      merged.set(acc);
      merged.set(chunk, acc.length);
      return merged;
    }, new Uint8Array()),
  );

  return parseHtml(html, rawUrl, parsed);
}

/**
 * Extract clean text and links from raw HTML.
 */
function parseHtml(html: string, pageUrl: string, baseUrl: URL): CrawledPage {
  const $: CheerioAPI = load(html);

  // Remove noise elements
  $('script, style, nav, footer, header, aside, [aria-hidden="true"], .cookie-banner').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim();

  // Extract meaningful text blocks
  const textParts: string[] = [];
  $('h1, h2, h3, h4, p, li, td, th, article, section, main').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 20) textParts.push(text);
  });

  const text = textParts
    .filter((t, i, arr) => arr.indexOf(t) === i) // deduplicate
    .join('\n')
    .slice(0, 8_000); // Cap at 8K chars per page for LLM consumption

  // Extract and resolve links
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    try {
      const resolved = new URL(href, baseUrl).toString();
      if (resolved.startsWith('http') && !resolved.includes('#')) {
        links.push(resolved);
      }
    } catch {
      // Ignore invalid hrefs
    }
  });

  return { url: pageUrl, title, text, links: [...new Set(links)] };
}

/**
 * Scores a URL's relevance for company research.
 * Higher score = crawl first.
 */
function scoreLink(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;
  // High-value paths
  if (/\/(about|team|company|mission|values|culture)/.test(lower)) score += 10;
  if (/\/(careers|jobs|hiring|work-with-us|join)/.test(lower)) score += 9;
  if (/\/(engineering|blog|tech|product|platform)/.test(lower)) score += 7;
  if (/\/(interview|process|faq)/.test(lower)) score += 8;
  // Penalize deep paths and query strings
  const depth = (url.match(/\//g) ?? []).length;
  score -= Math.max(0, depth - 4);
  if (url.includes('?')) score -= 2;
  return score;
}

/**
 * Crawl a company website starting from a root URL.
 * Respects robots.txt, applies SSRF protection, limits pages.
 * Returns pages sorted by relevance score.
 */
export async function crawlCompanySite(rootUrl: string): Promise<CrawledPage[]> {
  let root: URL;
  try {
    root = validateUrl(rootUrl);
  } catch {
    return [];
  }

  const visited = new Set<string>();
  const results: CrawledPage[] = [];
  const queue: Array<{ url: string; score: number }> = [{ url: rootUrl, score: 100 }];

  while (queue.length > 0 && results.length < CRAWL_MAX_PAGES) {
    // Sort queue by score descending and take the best next URL
    queue.sort((a, b) => b.score - a.score);
    const next = queue.shift()!;

    if (visited.has(next.url)) continue;
    visited.add(next.url);

    let page: CrawledPage;
    try {
      page = await fetchPage(next.url);
    } catch (err) {
      console.warn(`[Crawler] Skipping ${next.url}: ${String(err)}`);
      continue;
    }

    results.push(page);

    // Discover new links on the same domain
    for (const link of page.links) {
      if (visited.has(link)) continue;
      let linkUrl: URL;
      try {
        linkUrl = new URL(link);
      } catch {
        continue;
      }
      // Stay on the same host
      if (linkUrl.hostname !== root.hostname) continue;
      queue.push({ url: link, score: scoreLink(link) });
    }
  }

  return results;
}
