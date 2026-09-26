import { GeminiProvider, type LLMProvider } from '@interviewkit/ai';

let cachedProvider: LLMProvider | null = null;

/**
 * Returns the singleton LLM provider instance for the API application.
 */
export function getLLMProvider(): LLMProvider {
  return new GeminiProvider({
    model: process.env.GEMINI_MODEL || 'gemma-4-26b-a4b-it',
    maxRetries: 5,
  });
}
