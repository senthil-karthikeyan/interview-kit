import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const robotsParser: (url: string, content: string) => { isAllowed: (url: string, ua: string) => boolean | undefined } =
  require('robots-parser');

const robotsCache = new Map<string, ReturnType<typeof robotsParser>>();

/**
 * Fetches and parses robots.txt for a given base URL.
 * Caches per host to avoid repeated fetches.
 * If robots.txt is unreachable, returns a permissive parser (fail-open).
 */
async function getRobotsParser(baseUrl: URL): Promise<ReturnType<typeof robotsParser>> {
  const cacheKey = baseUrl.hostname;
  if (robotsCache.has(cacheKey)) {
    return robotsCache.get(cacheKey)!;
  }

  const robotsUrl = `${baseUrl.protocol}//${baseUrl.host}/robots.txt`;
  let content = '';

  try {
    const resp = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(5_000),
      headers: { 'User-Agent': 'InterviewKit/1.0' },
    });
    if (resp.ok) {
      content = await resp.text();
    }
  } catch {
    // robots.txt unreachable — fail-open (allow crawling)
  }

  const parser = robotsParser(robotsUrl, content);
  robotsCache.set(cacheKey, parser);
  return parser;
}

/**
 * Returns true if the given URL is allowed to be crawled by our bot.
 */
export async function isAllowedByCrawler(url: URL): Promise<boolean> {
  const parser = await getRobotsParser(url);
  return parser.isAllowed(url.toString(), 'InterviewKit') !== false;
}
