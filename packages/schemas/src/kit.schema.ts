import { z } from 'zod';

// ── Requirement ───────────────────────────────────────────────────────────────

export const RequirementKindSchema = z.enum(['technical', 'behavioural', 'domain']);
export const RequirementPrioritySchema = z.enum(['must', 'nice']);

export const RequirementSchema = z.object({
  id: z.string().min(1),           // e.g. "r1", "r2"
  text: z.string().min(1),
  kind: RequirementKindSchema,
  priority: RequirementPrioritySchema,
});

export type Requirement = z.infer<typeof RequirementSchema>;
export type RequirementKind = z.infer<typeof RequirementKindSchema>;
export type RequirementPriority = z.infer<typeof RequirementPrioritySchema>;

// ── Question ─────────────────────────────────────────────────────────────────

export const QuestionCategorySchema = z.enum([
  'technical',
  'behavioural',
  'system-design',
  'company-fit',
]);

/** Content state for regeneration preservation */
export const ContentStateSchema = z.enum(['generated', 'edited', 'pinned']);

export const QuestionSchema = z.object({
  id: z.string().min(1),           // e.g. "q1"
  requirement_ids: z.array(z.string()).min(1),
  category: QuestionCategorySchema,
  prompt: z.string().min(1),
  answer_outline: z.preprocess(
    (val) => (Array.isArray(val) ? val.join('\n- ') : typeof val === 'string' ? val : String(val ?? '')),
    z.string().min(1)
  ),
  difficulty: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1).max(3)
  ),
  /** Not part of wire format — used internally and for client state */
  _state: ContentStateSchema.optional().default('generated'),
});

export type Question = z.infer<typeof QuestionSchema>;
export type QuestionCategory = z.infer<typeof QuestionCategorySchema>;
export type ContentState = z.infer<typeof ContentStateSchema>;

// ── Flashcard ─────────────────────────────────────────────────────────────────

export const FlashcardSchema = z.object({
  id: z.string().min(1),           // e.g. "f1"
  front: z.string().min(1),
  back: z.preprocess(
    (val) => (Array.isArray(val) ? val.join('\n- ') : typeof val === 'string' ? val : String(val ?? '')),
    z.string().min(1)
  ),
  requirement_ids: z.array(z.string()).min(1),
  _state: ContentStateSchema.optional().default('generated'),
});

export type Flashcard = z.infer<typeof FlashcardSchema>;

// ── Schedule ──────────────────────────────────────────────────────────────────

export const ScheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string().min(1),
  question_ids: z.array(z.string()),
  minutes: z.number().int().min(1),
});

export const ScheduleSchema = z.object({
  days_available: z.number().int().min(1),
  days: z.array(ScheduleDaySchema),
});

export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;

// ── Coverage ──────────────────────────────────────────────────────────────────

export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().min(0),
});

export type Coverage = z.infer<typeof CoverageSchema>;

// ── Source ────────────────────────────────────────────────────────────────────

export const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string().optional().default(''),
  jd_chars: z.number().int().min(0),
  researched_at: z.string(),       // ISO8601
  pages_used: z.array(z.string()),
});

export type Source = z.infer<typeof SourceSchema>;

// ── Company Brief ─────────────────────────────────────────────────────────────

export const CompanyBriefSchema = z.preprocess(
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

export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;

// ── Role ──────────────────────────────────────────────────────────────────────

export const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});

export type Role = z.infer<typeof RoleSchema>;

// ── Kit (Appendix A — exact contract) ────────────────────────────────────────

export const KitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
});

export type Kit = z.infer<typeof KitSchema>;

// ── Kit input ─────────────────────────────────────────────────────────────────

export const KitInputSchema = z.object({
  jd: z.string().min(10, 'Job description is too short'),
  company_url: z.string().url('Must be a valid URL'),
  days: z.number().int().min(1).max(365),
});

export type KitInput = z.infer<typeof KitInputSchema>;
