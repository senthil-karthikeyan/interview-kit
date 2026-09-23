import type { GeneratedQuestion, Requirement, Schedule, ScheduleDay } from '@interviewkit/schemas';
import { MIN_MINUTES_PER_DAY, MINUTES_PER_QUESTION } from '@interviewkit/shared';

/**
 * Deterministic schedule allocation — application code, NOT LLM.
 *
 * Algorithm:
 * 1. Sort questions by priority (must-first) then difficulty (hardest-first)
 * 2. Distribute questions across days in round-robin order (early days get harder items)
 * 3. Calculate integer minutes per day (questions × 15, min 30)
 * 4. Derive focus label from dominant category
 * 5. Validate: exactly daysAvailable days produced
 *
 * Edge cases:
 * - 1 day: all questions go to day 1
 * - More days than questions: later days get 0 questions (flashcard review focus)
 * - 60 days: spreads thinly with review days at the end
 */
export function allocateSchedule(
  questions: GeneratedQuestion[],
  requirements: Requirement[],
  daysAvailable: number,
): Schedule {
  if (daysAvailable < 1) throw new Error('daysAvailable must be at least 1');

  const sorted = sortQuestions(questions, requirements);

  // Distribute questions round-robin across days
  // Day index 0 = first day (gets question at index 0, daysAvailable, 2*daysAvailable, ...)
  // This ensures earlier days contain the harder/higher-priority items
  const dayBuckets: string[][] = Array.from({ length: daysAvailable }, () => []);

  for (let i = 0; i < sorted.length; i++) {
    const dayIndex = i % daysAvailable;
    dayBuckets[dayIndex].push(sorted[i].id);
  }

  const questionById = new Map(questions.map((q) => [q.id, q]));

  const days: ScheduleDay[] = dayBuckets.map((questionIds, index) => {
    const dayNumber = index + 1;
    const focus = deriveFocus(questionIds, questionById, dayNumber, daysAvailable);
    const minutes = Math.max(
      MIN_MINUTES_PER_DAY,
      Math.floor(questionIds.length * MINUTES_PER_QUESTION),
    );

    return {
      day: dayNumber,
      focus,
      question_ids: questionIds,
      minutes,
    };
  });

  return {
    days_available: daysAvailable,
    days,
  };
}

/**
 * Sort questions: must-have first, then by difficulty descending.
 * This ensures the hardest/most important items are scheduled earliest.
 */
function sortQuestions(
  questions: GeneratedQuestion[],
  requirements: Requirement[],
): GeneratedQuestion[] {
  const reqPriorityMap = new Map<string, 'must' | 'nice'>();
  for (const r of requirements) {
    reqPriorityMap.set(r.id, r.priority);
  }

  function questionPriority(q: GeneratedQuestion): number {
    // A question is "must" if any of its requirements are must-have
    const isMust = q.requirement_ids.some((id) => reqPriorityMap.get(id) === 'must');
    return isMust ? 1 : 0;
  }

  return [...questions].sort((a, b) => {
    const priorityDiff = questionPriority(b) - questionPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return b.difficulty - a.difficulty;
  });
}

/**
 * Derive a human-readable focus label for a day.
 */
function deriveFocus(
  questionIds: string[],
  questionById: Map<string, GeneratedQuestion>,
  dayNumber: number,
  totalDays: number,
): string {
  if (questionIds.length === 0) {
    // No questions — this is a review/consolidation day
    if (dayNumber === totalDays) return 'Final Review & Mock Practice';
    return 'Flashcard Review & Consolidation';
  }

  const categories = questionIds
    .map((id) => questionById.get(id)?.category)
    .filter(Boolean) as string[];

  if (categories.length === 0) return `Day ${dayNumber} Preparation`;

  // Find the most common category
  const counts = categories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  const labels: Record<string, string> = {
    technical: 'Technical Deep Dive',
    behavioural: 'Behavioural & Soft Skills',
    'system-design': 'System Design',
    'company-fit': 'Company Research & Culture Fit',
  };

  return labels[dominant] ?? dominant;
}

/**
 * Validate that the generated schedule is well-formed.
 * Returns a list of validation errors (empty = valid).
 */
export function validateSchedule(schedule: Schedule, daysAvailable: number): string[] {
  const errors: string[] = [];

  if (schedule.days.length !== daysAvailable) {
    errors.push(
      `Schedule has ${schedule.days.length} days but ${daysAvailable} were requested`,
    );
  }

  for (const day of schedule.days) {
    if (!Number.isInteger(day.minutes)) {
      errors.push(`Day ${day.day}: minutes must be an integer, got ${day.minutes}`);
    }
    if (day.minutes < 1) {
      errors.push(`Day ${day.day}: minutes must be positive, got ${day.minutes}`);
    }
  }

  const dayNumbers = schedule.days.map((d) => d.day);
  const expected = Array.from({ length: daysAvailable }, (_, i) => i + 1);
  if (JSON.stringify(dayNumbers.sort((a, b) => a - b)) !== JSON.stringify(expected)) {
    errors.push('Day numbers are not sequential starting from 1');
  }

  return errors;
}
