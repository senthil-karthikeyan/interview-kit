import { describe, it, expect } from 'vitest';
import { checkCoverage, mergeQuestions } from '../coverage.service.js';
import type { GeneratedQuestion, Requirement } from '@interviewkit/schemas';

const makeReq = (id: string, priority: 'must' | 'nice' = 'must'): Requirement => ({
  id,
  text: `Requirement ${id}`,
  kind: 'technical',
  priority,
});

const makeQ = (id: string, reqIds: string[]): GeneratedQuestion => ({
  id,
  requirement_ids: reqIds,
  category: 'technical' as const,
  prompt: `Question ${id}`,
  answer_outline: 'Answer outline',
  difficulty: 2,
});

describe('checkCoverage', () => {
  it('returns isComplete=true when all must-haves are covered', () => {
    const reqs = [makeReq('r1'), makeReq('r2'), makeReq('r3', 'nice')];
    const questions = [makeQ('q1', ['r1']), makeQ('q2', ['r2'])];

    const result = checkCoverage(reqs, questions);

    expect(result.isComplete).toBe(true);
    expect(result.uncoveredIds).toHaveLength(0);
    expect(result.coveredIds.has('r1')).toBe(true);
    expect(result.coveredIds.has('r2')).toBe(true);
  });

  it('detects uncovered must-have requirements', () => {
    const reqs = [makeReq('r1'), makeReq('r2'), makeReq('r3')];
    const questions = [makeQ('q1', ['r1'])]; // r2 and r3 uncovered

    const result = checkCoverage(reqs, questions);

    expect(result.isComplete).toBe(false);
    expect(result.uncoveredIds).toContain('r2');
    expect(result.uncoveredIds).toContain('r3');
    expect(result.uncoveredIds).not.toContain('r1');
  });

  it('ignores nice-to-have requirements in coverage check', () => {
    const reqs = [makeReq('r1', 'must'), makeReq('r2', 'nice')];
    const questions = [makeQ('q1', ['r1'])]; // r2 (nice) not covered

    const result = checkCoverage(reqs, questions);

    expect(result.isComplete).toBe(true);
    expect(result.uncoveredIds).toHaveLength(0);
  });

  it('returns isComplete=true when there are no must-have requirements', () => {
    const reqs = [makeReq('r1', 'nice'), makeReq('r2', 'nice')];
    const questions: GeneratedQuestion[] = [];

    const result = checkCoverage(reqs, questions);

    expect(result.isComplete).toBe(true);
    expect(result.uncoveredIds).toHaveLength(0);
  });

  it('returns isComplete=false with empty question list and must-haves present', () => {
    const reqs = [makeReq('r1'), makeReq('r2')];
    const questions: GeneratedQuestion[] = [];

    const result = checkCoverage(reqs, questions);

    expect(result.isComplete).toBe(false);
    expect(result.uncoveredIds).toEqual(['r1', 'r2']);
  });

  it('counts a requirement as covered if multiple questions reference it', () => {
    const reqs = [makeReq('r1')];
    const questions = [makeQ('q1', ['r1']), makeQ('q2', ['r1'])];

    const result = checkCoverage(reqs, questions);

    expect(result.isComplete).toBe(true);
  });
});

describe('mergeQuestions', () => {
  it('merges and re-indexes questions sequentially', () => {
    const existing = [makeQ('q1', ['r1']), makeQ('q2', ['r2'])];
    const newQs = [makeQ('q99', ['r3'])];

    const merged = mergeQuestions(existing, newQs);

    expect(merged).toHaveLength(3);
    expect(merged.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
  });

  it('handles empty new questions', () => {
    const existing = [makeQ('q1', ['r1'])];
    const merged = mergeQuestions(existing, []);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('q1');
  });
});
