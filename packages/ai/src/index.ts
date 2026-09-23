// InterviewKit AI provider abstraction
export type { LLMProvider, GenerateOptions } from './provider.js';
export { GeminiProvider, AIError, AIValidationError, wrapUntrustedContent } from './gemini.provider.js';

export const AI_PACKAGE_VERSION = '1.0';
