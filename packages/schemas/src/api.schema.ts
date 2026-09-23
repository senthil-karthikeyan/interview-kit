import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UserPublicSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type UserPublic = z.infer<typeof UserPublicSchema>;

// ── Practice ──────────────────────────────────────────────────────────────────

export const ConfidenceSchema = z.number().int().min(1).max(5);

export const PracticeRecordInputSchema = z.object({
  flashcard_id: z.string().min(1),
  confidence: ConfidenceSchema,
});

export type PracticeRecordInput = z.infer<typeof PracticeRecordInputSchema>;

// ── API request schemas ───────────────────────────────────────────────────────

export const RegenerateCategoryInputSchema = z.object({
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
});

export const PatchQuestionInputSchema = z.object({
  prompt: z.string().min(1).optional(),
  answer_outline: z.string().min(1).optional(),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']).optional(),
  difficulty: z.number().int().min(1).max(3).optional(),
  _state: z.enum(['generated', 'edited', 'pinned']).optional(),
});

export const PatchFlashcardInputSchema = z.object({
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
  _state: z.enum(['generated', 'edited', 'pinned']).optional(),
});

export const AddQuestionInputSchema = z.object({
  requirement_ids: z.array(z.string()).min(1),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.number().int().min(1).max(3),
});

export const AddFlashcardInputSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()).min(1),
});

export type RegenerateCategoryInput = z.infer<typeof RegenerateCategoryInputSchema>;
export type PatchQuestionInput = z.infer<typeof PatchQuestionInputSchema>;
export type PatchFlashcardInput = z.infer<typeof PatchFlashcardInputSchema>;
export type AddQuestionInput = z.infer<typeof AddQuestionInputSchema>;
export type AddFlashcardInput = z.infer<typeof AddFlashcardInputSchema>;
