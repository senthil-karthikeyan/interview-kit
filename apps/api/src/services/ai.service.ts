import { GeminiProvider, type LLMProvider } from '@interviewkit/ai';

let cachedProvider: LLMProvider | null = null;

/**
 * Returns the singleton LLM provider instance for the API application.
 */
export function getLLMProvider(): LLMProvider {
  if (!cachedProvider) {
    cachedProvider = new GeminiProvider();
  }
  return cachedProvider;
}
