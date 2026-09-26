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

export const RequirementExtractionOutputSchema = z.preprocess(
  (val) => (Array.isArray(val) ? val[0] ?? {} : val),
  z.object({
    role_title: z.preprocess((val) => (val == null ? '' : String(val)), z.string()),
    seniority: z.preprocess((val) => (val == null ? '' : String(val)), z.string().default('')),
    company: z.preprocess((val) => (val == null ? '' : String(val)), z.string().default('')),
    location: z.preprocess((val) => (val == null ? '' : String(val)), z.string().default('')),
    responsibilities: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.string())),
    requirements: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(ExtractedRequirementSchema)),
  })
);

export type RequirementExtractionOutput = z.infer<typeof RequirementExtractionOutputSchema>;

// ── Company brief ─────────────────────────────────────────────────────────────

export const CompanyBriefOutputSchema = z.preprocess(
  (val) => {
    if (Array.isArray(val)) {
      const first = val[0] || {};
      const summary = val.map((v: any) => v?.summary || '').filter(Boolean).join(' ') || first.summary || '';
      const what_they_do = val.map((v: any) => v?.what_they_do || '').filter(Boolean).join(' ') || first.what_they_do || '';
      const sources = Array.from(new Set(val.flatMap((v: any) => (Array.isArray(v?.sources) ? v.sources : []))));
      return { summary, what_they_do, sources };
    }
    return val;
  },
  z.object({
    summary: z.preprocess((val) => (val == null ? '' : String(val)), z.string().default('')),
    what_they_do: z.preprocess((val) => (val == null ? '' : String(val)), z.string().default('')),
    sources: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.string())),
  })
);

export type CompanyBriefOutput = z.infer<typeof CompanyBriefOutputSchema>;

// ── Interview research ────────────────────────────────────────────────────────

export const InterviewResearchOutputSchema = z.preprocess(
  (val) => (Array.isArray(val) ? val[0] ?? {} : val),
  z.object({
    found: z.preprocess((val) => Boolean(val), z.boolean()),
    process_summary: z.preprocess((val) => (val == null ? '' : String(val)), z.string().default('')),
    typical_rounds: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.string())),
    tips: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.string())),
    sources: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.string())),
  })
);

export type InterviewResearchOutput = z.infer<typeof InterviewResearchOutputSchema>;

// ── Question generation ───────────────────────────────────────────────────────

export const GeneratedQuestionSchema = z.object({
  id: z.string(),
  requirement_ids: z.array(z.string()).min(1),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string().min(1),
  answer_outline: z.preprocess(
    (val) => (Array.isArray(val) ? val.join('\n- ') : typeof val === 'string' ? val : String(val ?? '')),
    z.string().min(1)
  ),
  difficulty: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1).max(3)
  ),
});

export const QuestionGenerationOutputSchema = z.preprocess(
  (val) => {
    if (Array.isArray(val)) return { questions: val };
    if (val && typeof val === 'object' && !('questions' in val)) {
      const arrayVal = Object.values(val).find((v) => Array.isArray(v));
      if (arrayVal) return { questions: arrayVal };
    }
    return val;
  },
  z.object({
    questions: z.array(GeneratedQuestionSchema),
  })
);

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type QuestionGenerationOutput = z.infer<typeof QuestionGenerationOutputSchema>;

// ── Flashcard generation ──────────────────────────────────────────────────────

export const GeneratedFlashcardSchema = z.object({
  id: z.string(),
  front: z.string().min(1),
  back: z.preprocess(
    (val) => (Array.isArray(val) ? val.join('\n- ') : typeof val === 'string' ? val : String(val ?? '')),
    z.string().min(1)
  ),
  requirement_ids: z.array(z.string()).min(1),
});

export const FlashcardGenerationOutputSchema = z.preprocess(
  (val) => {
    if (Array.isArray(val)) return { flashcards: val };
    if (val && typeof val === 'object' && !('flashcards' in val)) {
      const arrayVal = Object.values(val).find((v) => Array.isArray(v));
      if (arrayVal) return { flashcards: arrayVal };
    }
    return val;
  },
  z.object({
    flashcards: z.array(GeneratedFlashcardSchema),
  })
);

export type GeneratedFlashcard = z.infer<typeof GeneratedFlashcardSchema>;
export type FlashcardGenerationOutput = z.infer<typeof FlashcardGenerationOutputSchema>;

// ── Gap question generation ───────────────────────────────────────────────────

export const GapQuestionOutputSchema = z.preprocess(
  (val) => {
    if (Array.isArray(val)) return { questions: val };
    if (val && typeof val === 'object' && !('questions' in val)) {
      const arrayVal = Object.values(val).find((v) => Array.isArray(v));
      if (arrayVal) return { questions: arrayVal };
    }
    return val;
  },
  z.object({
    questions: z.array(GeneratedQuestionSchema),
  })
);

export type GapQuestionOutput = z.infer<typeof GapQuestionOutputSchema>;
