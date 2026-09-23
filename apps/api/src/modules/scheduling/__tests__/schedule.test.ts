import { describe, it, expect } from 'vitest';
import { allocateSchedule, validateSchedule } from '../schedule.service.js';
import type { GeneratedQuestion, Requirement } from '@interviewkit/schemas';

const makeReq = (id: string, priority: 'must' | 'nice' = 'must'): Requirement => ({
  id,
  text: `Requirement ${id}`,
  kind: 'technical',
  priority,
});

const makeQ = (
  id: string,
  reqIds: string[],
  difficulty = 2,
  category: GeneratedQuestion['category'] = 'technical',
): GeneratedQuestion => ({
  id,
  requirement_ids: reqIds,
  category,
  prompt: `Question ${id}`,
  answer_outline: 'Answer',
  difficulty,
});

describe('allocateSchedule', () => {
  it('produces exactly the requested number of days', () => {
    const questions = [makeQ('q1', ['r1']), makeQ('q2', ['r2']), makeQ('q3', ['r3'])];
    const reqs = [makeReq('r1'), makeReq('r2'), makeReq('r3')];

    const schedule = allocateSchedule(questions, reqs, 5);

    expect(schedule.days).toHaveLength(5);
    expect(schedule.days_available).toBe(5);
  });

  it('handles 1-day schedule — all questions in day 1', () => {
    const questions = [makeQ('q1', ['r1']), makeQ('q2', ['r2']), makeQ('q3', ['r3'])];
    const reqs = [makeReq('r1'), makeReq('r2'), makeReq('r3')];

    const schedule = allocateSchedule(questions, reqs, 1);

    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0].question_ids).toHaveLength(3);
    expect(schedule.days[0].day).toBe(1);
  });

  it('handles 60-day schedule without error', () => {
    const questions = Array.from({ length: 10 }, (_, i) => makeQ(`q${i + 1}`, ['r1']));
    const reqs = [makeReq('r1')];

    const schedule = allocateSchedule(questions, reqs, 60);

    expect(schedule.days).toHaveLength(60);
    expect(schedule.days_available).toBe(60);
  });

  it('produces integer minutes per day', () => {
    const questions = [makeQ('q1', ['r1']), makeQ('q2', ['r2'])];
    const reqs = [makeReq('r1'), makeReq('r2')];

    const schedule = allocateSchedule(questions, reqs, 2);

    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  it('enforces minimum 30 minutes even for days with 1 question', () => {
    const questions = [makeQ('q1', ['r1'])];
    const reqs = [makeReq('r1')];

    const schedule = allocateSchedule(questions, reqs, 3);

    for (const day of schedule.days) {
      expect(day.minutes).toBeGreaterThanOrEqual(30);
    }
  });

  it('puts harder must-have questions earlier', () => {
    const questions = [
      makeQ('q1', ['r1'], 1, 'behavioural'),      // easy nice-to-have
      makeQ('q2', ['r2'], 3, 'technical'),         // hard must-have
      makeQ('q3', ['r3'], 2, 'technical'),         // medium must-have
    ];
    const reqs = [makeReq('r1', 'nice'), makeReq('r2', 'must'), makeReq('r3', 'must')];

    const schedule = allocateSchedule(questions, reqs, 3);

    // q2 (must, difficulty 3) should be in day 1
    expect(schedule.days[0].question_ids).toContain('q2');
  });

  it('assigns sequential day numbers starting from 1', () => {
    const questions = [makeQ('q1', ['r1'])];
    const reqs = [makeReq('r1')];

    const schedule = allocateSchedule(questions, reqs, 3);

    expect(schedule.days.map((d) => d.day)).toEqual([1, 2, 3]);
  });

  it('sets a non-empty focus label for each day', () => {
    const questions = [makeQ('q1', ['r1']), makeQ('q2', ['r2'])];
    const reqs = [makeReq('r1'), makeReq('r2')];

    const schedule = allocateSchedule(questions, reqs, 2);

    for (const day of schedule.days) {
      expect(day.focus.length).toBeGreaterThan(0);
    }
  });

  it('empty question list produces review-only days', () => {
    const schedule = allocateSchedule([], [], 3);

    expect(schedule.days).toHaveLength(3);
    for (const day of schedule.days) {
      expect(day.question_ids).toHaveLength(0);
      expect(day.focus).toContain('Review');
    }
  });
});

describe('validateSchedule', () => {
  it('returns no errors for a valid schedule', () => {
    const schedule = allocateSchedule([makeQ('q1', ['r1'])], [makeReq('r1')], 3);
    const errors = validateSchedule(schedule, 3);
    expect(errors).toHaveLength(0);
  });

  it('reports error when day count does not match daysAvailable', () => {
    const schedule = allocateSchedule([makeQ('q1', ['r1'])], [makeReq('r1')], 3);
    // Mutate to create mismatch
    schedule.days.pop();
    const errors = validateSchedule(schedule, 3);
    expect(errors.some((e) => e.includes('days'))).toBe(true);
  });
});
