import { z } from 'zod';

/**
 * LLM provider interface — decouples the rest of the app from Gemini.
 * Any provider must implement this contract.
 */
export interface LLMProvider {
  /**
   * Generate structured output from a prompt.
   * The schema enforces the shape of the returned object.
   */
  generate<T>(options: GenerateOptions<T>): Promise<T>;
}

export interface GenerateOptions<T> {
  /** System prompt — defines the AI's role and constraints */
  system: string;
  /** User prompt — the actual request */
  prompt: string;
  /** Zod schema to validate and type the model's response */
  schema: z.ZodType<T>;
  /** Optional temperature (0-1). Defaults to 0.2 for structured output */
  temperature?: number;
}
