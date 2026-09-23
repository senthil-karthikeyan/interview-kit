import type { LLMProvider } from '@interviewkit/ai';
import { wrapUntrustedContent } from '@interviewkit/ai';
import {
  FlashcardGenerationOutputSchema,
  type FlashcardGenerationOutput,
  type GeneratedFlashcard,
} from '@interviewkit/schemas';
import type { RequirementExtractionOutput, GeneratedQuestion } from '@interviewkit/schemas';

const FLASHCARD_SYSTEM = `You are creating concise study flashcards for interview preparation.

RULES:
- Front: a short, specific question or concept prompt (max 2 lines).
- Back: a clear, memorable answer (2-4 lines or short bullet points).
- Each flashcard must reference at least one requirement ID.
- Focus on key concepts, terms, patterns, and principles.
- Output ONLY valid JSON. No markdown.`;

/**
 * Generate flashcards from extracted requirements and questions.
 */
export async function generateFlashcards(
  extraction: RequirementExtractionOutput,
  questions: GeneratedQuestion[],
  llm: LLMProvider,
): Promise<GeneratedFlashcard[]> {
  const reqList = extraction.requirements
    .map((r) => `  - ${r.id}: ${r.text}`)
    .join('\n');

  // Include a selection of questions to guide flashcard topics
  const questionSample = questions
    .slice(0, 10)
    .map((q) => `  [${q.requirement_ids.join(',')}] ${q.prompt}`)
    .join('\n');

  const prompt = `Create study flashcards for a "${extraction.role_title}" interview preparation kit.

REQUIREMENTS:
${wrapUntrustedContent('REQUIREMENTS', reqList)}

SAMPLE QUESTIONS (for topic guidance):
${wrapUntrustedContent('QUESTIONS', questionSample)}

Generate 10-15 flashcards covering the key concepts. Each flashcard must reference at least one requirement ID.
Start flashcard IDs from f1.

Return JSON:
{
  "flashcards": [
    {
      "id": "f1",
      "front": "What is X?",
      "back": "X is... key points...",
      "requirement_ids": ["r1"]
    }
  ]
}`;

  const result: FlashcardGenerationOutput = await llm.generate({
    system: FLASHCARD_SYSTEM,
    prompt,
    schema: FlashcardGenerationOutputSchema,
    temperature: 0.3,
  });

  // Validate requirement IDs
  const validReqIds = new Set(extraction.requirements.map((r) => r.id));
  const filtered = result.flashcards
    .map((f) => ({
      ...f,
      requirement_ids: f.requirement_ids.filter((id) => validReqIds.has(id)),
    }))
    .filter((f) => f.requirement_ids.length > 0);

  // Re-index
  return filtered.map((f, i) => ({ ...f, id: `f${i + 1}` }));
}
