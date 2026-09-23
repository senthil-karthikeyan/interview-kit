import { describe, it, expect } from 'vitest';
import { validateUrl, CrawlerErrorCode } from '../url.validator.js';

describe('validateUrl', () => {
  it('accepts valid http and https URLs', () => {
    const u1 = validateUrl('https://example.com/about');
    expect(u1.hostname).toBe('example.com');
    expect(u1.pathname).toBe('/about');

    const u2 = validateUrl('http://github.com');
    expect(u2.hostname).toBe('github.com');
  });

  it('rejects invalid or malformed URLs', () => {
    expect(() => validateUrl('not-a-url')).toThrow();
    try {
      validateUrl('not-a-url');
    } catch (err: any) {
      expect(err.code).toBe(CrawlerErrorCode.INVALID_URL);
    }
  });

  it('rejects non-http/https protocols like file: or ftp:', () => {
    expect(() => validateUrl('ftp://example.com')).toThrow();
    expect(() => validateUrl('file:///etc/passwd')).toThrow();
  });
});
