import { z } from 'zod';
import { KitSchema } from './kit.schema.js';

// ── Batch input ───────────────────────────────────────────────────────────────

export const BatchCaseInputSchema = z.object({
  id: z.string().min(1),
  jd: z.string().min(1),
  company_url: z.string().min(1),
  days: z.number().int().min(1),
});

export const BatchInputSchema = z.array(BatchCaseInputSchema).min(1);

export type BatchCaseInput = z.infer<typeof BatchCaseInputSchema>;
export type BatchInput = z.infer<typeof BatchInputSchema>;

// ── Batch output ──────────────────────────────────────────────────────────────

export const BatchErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const BatchCaseOutputSchema = z.object({
  id: z.string(),
  status: z.enum(['ok', 'failed']),
  kit: KitSchema.nullable(),
  error: BatchErrorSchema.nullable(),
});

export const BatchOutputSchema = z.object({
  version: z.literal('1.0'),
  generated_at: z.string(),        // ISO8601
  kits: z.array(BatchCaseOutputSchema),
});

export type BatchError = z.infer<typeof BatchErrorSchema>;
export type BatchCaseOutput = z.infer<typeof BatchCaseOutputSchema>;
export type BatchOutput = z.infer<typeof BatchOutputSchema>;
