import {
  GoogleGenerativeAI,
  type GenerateContentResult,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';
import { z } from 'zod';
import type { LLMProvider, GenerateOptions } from './provider.js';

/** Default model. gemma-4-26b-a4b-it is fast, reliable, and active on this project. */
const DEFAULT_GEMINI_MODEL = 'gemma-4-26b-a4b-it';

/**
 * Classifies whether an error from the Gemini API is worth retrying.
 * Rate limit (429), transient server errors (5xx, high demand), and model deprecations (404) are retryable.
 * Bad requests (400) and auth failures (401/403) are not.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    const status = (error as any).status;
    if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
    // Rate limit / quota
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) return true;
    // Transient server errors & high demand
    if (
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504') ||
      msg.includes('service unavailable') ||
      msg.includes('high demand') ||
      msg.includes('internal error') ||
      msg.includes('unavailable') ||
      msg.includes('capacity')
    ) {
      return true;
    }
    // Deprecated or missing model (allows fallback to active model)
    if (msg.includes('404') || msg.includes('not found') || msg.includes('no longer available')) return true;
    // Network errors
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('econnreset') || msg.includes('fetch failed')) {
      return true;
    }
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
  private readonly apiKey: string;
  private readonly client: GoogleGenerativeAI;
  private readonly maxRetries: number;
  private readonly concurrencyLimit: number;
  private readonly preferredModel?: string;
  private activeRequests = 0;
  private readonly queue: Array<() => void> = [];

  constructor(options?: { model?: string; maxRetries?: number; concurrencyLimit?: number }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
    this.client = new GoogleGenerativeAI(apiKey);
    this.preferredModel = options?.model;
    this.maxRetries = options?.maxRetries ?? Number(process.env.LLM_MAX_RETRIES ?? 5);
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

    const preferred = this.preferredModel ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    // List candidate models to try in priority order
    const candidateModels = Array.from(
      new Set([preferred, 'gemma-4-26b-a4b-it', 'gemma-4-31b-it'])
    );

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const currentModelName = candidateModels[Math.min(attempt, candidateModels.length - 1)];
      if (attempt > 0) {
        // Backoff: 1s, 2s, 4s
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10_000);
        await sleep(delayMs);
      }

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModelName}:generateContent?key=${this.apiKey}`;
        let promptText = prompt;
        const body: Record<string, any> = {
          generationConfig: {
            temperature,
            responseMimeType: 'application/json',
          },
        };
        if (system) {
          if (currentModelName.startsWith('gemma')) {
            promptText = `INSTRUCTIONS:\n${system}\n\nUSER PROMPT:\n${prompt}`;
          } else {
            body.systemInstruction = { parts: [{ text: system }] };
          }
        }
        body.contents = [{ parts: [{ text: promptText }] }];

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(90_000),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as any;
          const errMsg = errData?.error?.message ?? `HTTP ${res.status} ${res.statusText}`;
          const err = new Error(errMsg);
          (err as any).status = res.status;
          throw err;
        }

        const data = (await res.json()) as any;
        const candidate = data?.candidates?.[0];
        const nonThoughtParts = candidate?.content?.parts?.filter((p: any) => !p.thought) ?? [];
        const text = (
          nonThoughtParts.length > 0
            ? nonThoughtParts.map((p: any) => p.text).join('\n')
            : candidate?.content?.parts?.[0]?.text ?? ''
        ).trim();

        // Parse JSON from model output
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            try {
              parsed = JSON.parse(codeBlockMatch[1].trim());
            } catch {
              // fallback below
            }
          }
          if (!parsed) {
            const jsonObjectMatch = text.match(/(\{[\s\S]*\})/);
            if (jsonObjectMatch) {
              try {
                parsed = JSON.parse(jsonObjectMatch[0].trim());
              } catch {
                // fallback below
              }
            }
          }
          if (!parsed) {
            const jsonArrayMatch = text.match(/(\[[\s\S]*\])/);
            if (jsonArrayMatch) {
              try {
                parsed = JSON.parse(jsonArrayMatch[0].trim());
              } catch {
                // fallback below
              }
            }
          }
          if (!parsed) {
            const stripped = text
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```$/, '')
              .trim();
            parsed = JSON.parse(stripped);
          }
        }

        // Validate with Zod — throws ZodError if invalid
        return schema.parse(parsed);
      } catch (err) {
        lastError = err;

        if (err instanceof z.ZodError) {
          console.warn(`[AI] Attempt ${attempt + 1} structured output validation failed:`, err.issues);
          if (attempt < this.maxRetries) {
            const nextModel = candidateModels[Math.min(attempt + 1, candidateModels.length - 1)];
            console.warn(`[AI] Retrying schema parsing with ${nextModel}...`);
            continue;
          }
          throw new AIValidationError('Model output did not match expected schema', err);
        }

        if (attempt < this.maxRetries && isRetryable(err)) {
          const nextModel = candidateModels[Math.min(attempt + 1, candidateModels.length - 1)];
          console.warn(
            `[AI] Attempt ${attempt + 1} with ${currentModelName} failed (status: ${(err as any)?.status}, ${(err as Error).message?.slice(0, 150)}). Retrying with ${nextModel}...`
          );
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
