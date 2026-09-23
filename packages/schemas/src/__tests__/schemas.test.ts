import { describe, it, expect } from 'vitest';
import {
  KitSchema,
  RequirementSchema,
  QuestionSchema,
  FlashcardSchema,
  ScheduleSchema,
  CoverageSchema,
  BatchInputSchema,
  BatchOutputSchema,
} from '../index.js';

// ── Requirement ───────────────────────────────────────────────────────────────

describe('RequirementSchema', () => {
  it('parses a valid requirement', () => {
    const r = RequirementSchema.parse({
      id: 'r1',
      text: 'Experience with TypeScript',
      kind: 'technical',
      priority: 'must',
    });
    expect(r.id).toBe('r1');
    expect(r.priority).toBe('must');
  });

  it('rejects unknown kind', () => {
    expect(() =>
      RequirementSchema.parse({ id: 'r1', text: 'x', kind: 'unknown', priority: 'must' }),
    ).toThrow();
  });

  it('rejects unknown priority', () => {
    expect(() =>
      RequirementSchema.parse({ id: 'r1', text: 'x', kind: 'technical', priority: 'optional' }),
    ).toThrow();
  });
});

// ── Question ──────────────────────────────────────────────────────────────────

describe('QuestionSchema', () => {
  it('parses a valid question', () => {
    const q = QuestionSchema.parse({
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Describe your TS experience',
      answer_outline: 'Discuss generics, type guards...',
      difficulty: 2,
    });
    expect(q.difficulty).toBe(2);
    expect(q._state).toBe('generated'); // default applied
  });

  it('rejects difficulty out of range', () => {
    expect(() =>
      QuestionSchema.parse({
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'x',
        answer_outline: 'y',
        difficulty: 4,
      }),
    ).toThrow();
  });

  it('requires at least one requirement_id', () => {
    expect(() =>
      QuestionSchema.parse({
        id: 'q1',
        requirement_ids: [],
        category: 'technical',
        prompt: 'x',
        answer_outline: 'y',
        difficulty: 1,
      }),
    ).toThrow();
  });
});

// ── Flashcard ─────────────────────────────────────────────────────────────────

describe('FlashcardSchema', () => {
  it('parses a valid flashcard', () => {
    const f = FlashcardSchema.parse({
      id: 'f1',
      front: 'What is a closure?',
      back: 'A function that captures its lexical environment.',
      requirement_ids: ['r1'],
    });
    expect(f.id).toBe('f1');
    expect(f._state).toBe('generated');
  });
});

// ── Schedule ──────────────────────────────────────────────────────────────────

describe('ScheduleSchema', () => {
  it('parses a valid 3-day schedule', () => {
    const s = ScheduleSchema.parse({
      days_available: 3,
      days: [
        { day: 1, focus: 'TypeScript', question_ids: ['q1'], minutes: 60 },
        { day: 2, focus: 'System Design', question_ids: ['q2'], minutes: 45 },
        { day: 3, focus: 'Behavioural', question_ids: ['q3'], minutes: 30 },
      ],
    });
    expect(s.days).toHaveLength(3);
    expect(s.days[0].minutes).toBe(60);
  });

  it('rejects non-integer minutes', () => {
    expect(() =>
      ScheduleSchema.parse({
        days_available: 1,
        days: [{ day: 1, focus: 'x', question_ids: [], minutes: 45.5 }],
      }),
    ).toThrow();
  });
});

// ── Coverage ──────────────────────────────────────────────────────────────────

describe('CoverageSchema', () => {
  it('parses coverage with no uncovered requirements', () => {
    const c = CoverageSchema.parse({ uncovered_requirement_ids: [], passes: 2 });
    expect(c.passes).toBe(2);
  });
});

// ── Kit ───────────────────────────────────────────────────────────────────────

describe('KitSchema', () => {
  const validKit = {
    source: {
      company: 'Acme Corp',
      company_url: 'https://acme.com',
      role: 'Software Engineer',
      location: 'Remote',
      jd_chars: 1500,
      researched_at: new Date().toISOString(),
      pages_used: ['https://acme.com/about'],
    },
    company_brief: {
      summary: 'Acme builds widgets.',
      what_they_do: 'Enterprise widget solutions.',
      sources: ['https://acme.com/about'],
    },
    role: {
      title: 'Software Engineer',
      seniority: 'Senior',
      responsibilities: ['Build features', 'Review PRs'],
      requirements: [
        { id: 'r1', text: 'TypeScript', kind: 'technical', priority: 'must' },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Describe TS generics.',
        answer_outline: 'Cover T extends, constraints...',
        difficulty: 2,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What is a generic?',
        back: 'A type parameter.',
        requirement_ids: ['r1'],
      },
    ],
    schedule: {
      days_available: 1,
      days: [
        { day: 1, focus: 'TypeScript', question_ids: ['q1'], minutes: 30 },
      ],
    },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };

  it('parses a valid complete kit', () => {
    const kit = KitSchema.parse(validKit);
    expect(kit.questions).toHaveLength(1);
    expect(kit.schedule.days_available).toBe(1);
    expect(kit.coverage.passes).toBe(1);
  });

  it('rejects a kit missing company_brief', () => {
    const { company_brief: _, ...bad } = validKit;
    expect(() => KitSchema.parse(bad)).toThrow();
  });
});

// ── Batch ─────────────────────────────────────────────────────────────────────

describe('BatchInputSchema', () => {
  it('parses valid batch input', () => {
    const input = BatchInputSchema.parse([
      { id: 'case-01', jd: 'Engineer at Acme...', company_url: 'https://acme.com', days: 5 },
    ]);
    expect(input[0].id).toBe('case-01');
  });

  it('rejects empty array', () => {
    expect(() => BatchInputSchema.parse([])).toThrow();
  });
});

describe('BatchOutputSchema', () => {
  it('parses a failed batch case', () => {
    const output = BatchOutputSchema.parse({
      version: '1.0',
      generated_at: new Date().toISOString(),
      kits: [
        {
          id: 'case-01',
          status: 'failed',
          kit: null,
          error: { code: 'COMPANY_UNREACHABLE', message: 'Could not reach site.' },
        },
      ],
    });
    expect(output.kits[0].status).toBe('failed');
  });

  it('rejects wrong version', () => {
    expect(() =>
      BatchOutputSchema.parse({
        version: '2.0',
        generated_at: new Date().toISOString(),
        kits: [],
      }),
    ).toThrow();
  });
});
