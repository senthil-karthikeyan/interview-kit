import type { GeneratedQuestion, Requirement } from '@interviewkit/schemas';

export interface CoverageResult {
  coveredIds: Set<string>;
  uncoveredIds: string[];
  isComplete: boolean;
}

/**
 * Deterministic coverage check — application code, NOT LLM.
 *
 * Checks which must-have requirements have at least one question referencing them.
 * Returns the set of covered IDs, list of uncovered IDs, and whether all must-haves are covered.
 */
export function checkCoverage(
  requirements: Requirement[],
  questions: GeneratedQuestion[],
): CoverageResult {
  const mustHaveIds = requirements
    .filter((r) => r.priority === 'must')
    .map((r) => r.id);

  if (mustHaveIds.length === 0) {
    return { coveredIds: new Set(), uncoveredIds: [], isComplete: true };
  }

  // Build a set of all requirement IDs that have at least one question
  const coveredIds = new Set<string>();
  for (const question of questions) {
    for (const reqId of question.requirement_ids) {
      coveredIds.add(reqId);
    }
  }

  const uncoveredIds = mustHaveIds.filter((id) => !coveredIds.has(id));

  return {
    coveredIds,
    uncoveredIds,
    isComplete: uncoveredIds.length === 0,
  };
}

/**
 * Merge gap questions into the existing question list.
 * Re-indexes all questions to keep IDs sequential.
 */
export function mergeQuestions(
  existing: GeneratedQuestion[],
  newQuestions: GeneratedQuestion[],
): GeneratedQuestion[] {
  const merged = [...existing, ...newQuestions];
  // Re-index sequentially to maintain clean IDs
  return merged.map((q, i) => ({ ...q, id: `q${i + 1}` }));
}
