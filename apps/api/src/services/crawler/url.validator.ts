import { URL } from 'url';

/**
 * Error codes for URL/crawler failures — used in batch output error.code.
 */
export const CrawlerErrorCode = {
  INVALID_URL: 'INVALID_URL',
  SSRF_BLOCKED: 'SSRF_BLOCKED',
  TIMEOUT: 'CRAWL_TIMEOUT',
  TOO_LARGE: 'RESPONSE_TOO_LARGE',
  BAD_STATUS: 'BAD_HTTP_STATUS',
  NOT_HTML: 'NOT_HTML_CONTENT',
  DISALLOWED: 'ROBOTS_DISALLOWED',
  FETCH_ERROR: 'FETCH_ERROR',
} as const;

export type CrawlerErrorCode = (typeof CrawlerErrorCode)[keyof typeof CrawlerErrorCode];

/**
 * SSRF-protected private/loopback CIDR ranges.
 * These are blocked in production. In development/test (controlled environments),
 * localhost URLs are allowed via the ALLOW_LOCALHOST env flag.
 */
const PRIVATE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const PRIVATE_IP_PATTERNS = [
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,  // link-local
  /^fc[0-9a-f]{2}:/i,       // IPv6 unique local
  /^fe80:/i,                 // IPv6 link-local
];

const ALLOW_LOCALHOST = process.env.NODE_ENV !== 'production' ||
  process.env.ALLOW_LOCALHOST === 'true';

/**
 * Validates a URL and checks for SSRF risks.
 * Returns the parsed URL or throws with a descriptive code.
 */
export function validateUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error(`Invalid URL: ${rawUrl}`), { code: CrawlerErrorCode.INVALID_URL });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw Object.assign(
      new Error(`Unsupported protocol: ${parsed.protocol}`),
      { code: CrawlerErrorCode.INVALID_URL },
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  if (!ALLOW_LOCALHOST) {
    if (PRIVATE_HOSTNAMES.has(hostname)) {
      throw Object.assign(
        new Error(`Blocked: private address ${hostname}`),
        { code: CrawlerErrorCode.SSRF_BLOCKED },
      );
    }
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        throw Object.assign(
          new Error(`Blocked: private IP range ${hostname}`),
          { code: CrawlerErrorCode.SSRF_BLOCKED },
        );
      }
    }
  }

  return parsed;
}
