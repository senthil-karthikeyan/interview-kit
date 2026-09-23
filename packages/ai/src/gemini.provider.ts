import {
  GoogleGenerativeAI,
  type GenerateContentResult,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';
import { z } from 'zod';
import type { LLMProvider, GenerateOptions } from './provider.js';

/** Gemini model to use. "gemini-2.0-flash" is the free-tier fast model. */
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

/**
 * Classifies whether an error from the Gemini API is worth retrying.
 * Rate limit (429) and transient server errors (5xx) are retryable.
 * Bad requests (400) and auth failures (401/403) are not.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Rate limit / quota
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) return true;
    // Transient server errors
    if (msg.includes('500') || msg.includes('503') || msg.includes('service unavailable')) return true;
    // Network errors
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('econnreset')) return true;
  }
  return false;
}

/**
 * Wraps raw text from the model to protect against prompt injection.
 * External content is labeled as DATA so the model treats it as text, not instructions.
 */
export function wrapUntrustedContent(label: string, content: string): string {
  return `<${label}>\n${content}\n</${label}>`;
}

/**
 * Gemini implementation of LLMProvider.
 * Uses @google/generative-ai SDK with structured JSON output.
 */
export class GeminiProvider implements LLMProvider {
  private readonly client: GoogleGenerativeAI;
  private readonly maxRetries: number;
  private readonly concurrencyLimit: number;
  private activeRequests = 0;
  private readonly queue: Array<() => void> = [];

  constructor(options?: { maxRetries?: number; concurrencyLimit?: number }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.maxRetries = options?.maxRetries ?? Number(process.env.LLM_MAX_RETRIES ?? 3);
    this.concurrencyLimit = options?.concurrencyLimit ?? Number(process.env.LLM_CONCURRENCY ?? 2);
  }

  /**
   * Acquire a concurrency slot. Queues the request if at limit.
   */
  private async acquireSlot(): Promise<void> {
    if (this.activeRequests < this.concurrencyLimit) {
      this.activeRequests++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
    this.activeRequests++;
  }

  /**
   * Release a concurrency slot and wake up the next queued request.
   */
  private releaseSlot(): void {
    this.activeRequests--;
    const next = this.queue.shift();
    if (next) next();
  }

  async generate<T>(options: GenerateOptions<T>): Promise<T> {
    await this.acquireSlot();
    try {
      return await this.generateWithRetry(options);
    } finally {
      this.releaseSlot();
    }
  }

  private async generateWithRetry<T>(options: GenerateOptions<T>): Promise<T> {
    const { system, prompt, schema, temperature = 0.2 } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s
        const delayMs = Math.min(2000 * Math.pow(2, attempt - 1), 30_000);
        await sleep(delayMs);
      }

      try {
        const model = this.client.getGenerativeModel({
          model: GEMINI_MODEL,
          systemInstruction: system,
          generationConfig: {
            temperature,
            responseMimeType: 'application/json',
          },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        });

        const result: GenerateContentResult = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse JSON from model output
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          // Sometimes models wrap JSON in markdown code blocks — strip them
          const stripped = text
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();
          parsed = JSON.parse(stripped);
        }

        // Validate with Zod — throws ZodError if invalid
        return schema.parse(parsed);
      } catch (err) {
        lastError = err;

        // Don't retry Zod validation errors — the schema mismatch needs a prompt fix
        if (err instanceof z.ZodError) {
          console.error('[AI] Structured output validation failed:', err.issues);
          throw new AIValidationError('Model output did not match expected schema', err);
        }

        if (attempt < this.maxRetries && isRetryable(err)) {
          console.warn(`[AI] Attempt ${attempt + 1} failed (retryable), backing off...`);
          continue;
        }

        // Non-retryable or exhausted retries
        break;
      }
    }

    throw new AIError(`LLM call failed after ${this.maxRetries + 1} attempts`, lastError);
  }
}

// ── Errors ────────────────────────────────────────────────────────────────────

export class AIError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AIError';
  }
}

export class AIValidationError extends AIError {
  constructor(message: string, public readonly zodError: z.ZodError) {
    super(message);
    this.name = 'AIValidationError';
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
