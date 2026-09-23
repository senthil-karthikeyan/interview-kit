import { describe, it, expect } from 'vitest';
import { computeInputHash } from '../kit.service.js';

describe('computeInputHash', () => {
  it('generates consistent sha256 hash for identical input', () => {
    const input1 = {
      jd: 'Senior TypeScript Engineer with React and Node.js',
      company_url: 'https://example.com/careers',
      days: 7,
    };
    const input2 = {
      jd: 'Senior TypeScript Engineer with React and Node.js',
      company_url: 'https://example.com/careers',
      days: 7,
    };

    expect(computeInputHash(input1)).toBe(computeInputHash(input2));
  });

  it('normalizes url casing and whitespace', () => {
    const input1 = {
      jd: '  Senior TypeScript Engineer  ',
      company_url: 'https://Example.COM/careers  ',
      days: 7,
    };
    const input2 = {
      jd: 'Senior TypeScript Engineer',
      company_url: 'https://example.com/careers',
      days: 7,
    };

    expect(computeInputHash(input1)).toBe(computeInputHash(input2));
  });

  it('produces different hash when days differ', () => {
    const input1 = {
      jd: 'Engineer',
      company_url: 'https://example.com',
      days: 5,
    };
    const input2 = {
      jd: 'Engineer',
      company_url: 'https://example.com',
      days: 10,
    };

    expect(computeInputHash(input1)).not.toBe(computeInputHash(input2));
  });
});
