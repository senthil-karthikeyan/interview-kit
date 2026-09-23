import { z } from 'zod';

// ── AI pipeline structured output schemas ─────────────────────────────────────
// These are used as Zod schemas for LLM structured output validation.
// The AI package imports these to define what it expects from Gemini.

// ── Requirement extraction ────────────────────────────────────────────────────

export const ExtractedRequirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.enum(['technical', 'behavioural', 'domain']),
  priority: z.enum(['must', 'nice']),
});

export const RequirementExtractionOutputSchema = z.object({
  role_title: z.string(),
  seniority: z.string(),
  company: z.string(),
  location: z.string().optional().default(''),
  responsibilities: z.array(z.string()),
  requirements: z.array(ExtractedRequirementSchema),
});

export type RequirementExtractionOutput = z.infer<typeof RequirementExtractionOutputSchema>;

// ── Company brief ─────────────────────────────────────────────────────────────

export const CompanyBriefOutputSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export type CompanyBriefOutput = z.infer<typeof CompanyBriefOutputSchema>;

// ── Interview research ────────────────────────────────────────────────────────

export const InterviewResearchOutputSchema = z.object({
  found: z.boolean(),
  process_summary: z.string(),    // Empty string if not found — do not fabricate
  typical_rounds: z.array(z.string()),
  tips: z.array(z.string()),
  sources: z.array(z.string()),
});

export type InterviewResearchOutput = z.infer<typeof InterviewResearchOutputSchema>;

// ── Question generation ───────────────────────────────────────────────────────

export const GeneratedQuestionSchema = z.object({
  id: z.string(),
  requirement_ids: z.array(z.string()).min(1),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.number().int().min(1).max(3),
});

export const QuestionGenerationOutputSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type QuestionGenerationOutput = z.infer<typeof QuestionGenerationOutputSchema>;

// ── Flashcard generation ──────────────────────────────────────────────────────

export const GeneratedFlashcardSchema = z.object({
  id: z.string(),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()).min(1),
});

export const FlashcardGenerationOutputSchema = z.object({
  flashcards: z.array(GeneratedFlashcardSchema),
});

export type GeneratedFlashcard = z.infer<typeof GeneratedFlashcardSchema>;
export type FlashcardGenerationOutput = z.infer<typeof FlashcardGenerationOutputSchema>;

// ── Gap question generation ───────────────────────────────────────────────────

export const GapQuestionOutputSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

export type GapQuestionOutput = z.infer<typeof GapQuestionOutputSchema>;
