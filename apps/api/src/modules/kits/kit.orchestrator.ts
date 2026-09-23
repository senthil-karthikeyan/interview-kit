import type { LLMProvider } from '@interviewkit/ai';
import {
  KitSchema,
  type Kit,
  type KitInput,
} from '@interviewkit/schemas';
import { extractRequirements } from '../extraction/extraction.service.js';
import { crawlCompanySite, type CrawledPage } from '../../services/crawler/crawler.service.js';
import {
  generateCompanyBrief,
  researchInterviewProcess,
} from '../research/research.service.js';
import {
  generateAllQuestions,
  generateGapQuestions,
} from '../generation/question.service.js';
import { generateFlashcards } from '../generation/flashcard.service.js';
import { checkCoverage, mergeQuestions } from '../coverage/coverage.service.js';
import { allocateSchedule } from '../scheduling/schedule.service.js';

export type ProgressCallback = (step: string, percent: number) => Promise<void> | void;

export interface GenerateKitOptions {
  input: KitInput;
  llm: LLMProvider;
  onProgress?: ProgressCallback;
}

/**
 * Executes the complete kit generation pipeline end-to-end.
 * Enforces requirement coverage, graceful fallbacks for web crawling,
 * deterministic schedule calculation, and strict schema validation.
 */
export async function generateKitPipeline(options: GenerateKitOptions): Promise<Kit> {
  const { input, llm, onProgress } = options;

  // Step 1: Extract structured requirements from JD
  await onProgress?.('Extracting requirements from job description', 15);
  const extraction = await extractRequirements(input.jd, llm);

  // Step 2: Crawl company website (graceful fallback on failure)
  await onProgress?.('Crawling company website', 35);
  let crawledPages: CrawledPage[] = [];
  try {
    crawledPages = await crawlCompanySite(input.company_url);
  } catch (err) {
    console.warn('[Orchestrator] Web crawler warning (continuing with fallback):', err);
  }

  // Step 3: Synthesize company brief and interview research
  await onProgress?.('Researching company background and interview format', 50);
  const companyBrief = await generateCompanyBrief(crawledPages, input.company_url, llm);
  const interviewResearch = await researchInterviewProcess(
    crawledPages,
    extraction.role_title,
    llm,
  );

  const companyContext = `${companyBrief.summary}\n${companyBrief.what_they_do}`;
  const interviewContext = interviewResearch.found
    ? `${interviewResearch.process_summary}\nRounds: ${interviewResearch.typical_rounds.join(', ')}\nTips: ${interviewResearch.tips.join('; ')}`
    : 'No public interview process information found.';

  // Step 4: Generate interview questions across categories
  await onProgress?.('Generating interview questions across categories', 65);
  const initialQuestions = await generateAllQuestions(
    extraction,
    companyContext,
    interviewContext,
    llm,
  );

  // Step 5: Generate flashcards
  await onProgress?.('Generating concept flashcards', 75);
  const flashcards = await generateFlashcards(extraction, initialQuestions, llm);

  // Step 6: Requirement coverage engine with gap fill loop (max 3 passes)
  await onProgress?.('Verifying requirement coverage and filling gaps', 85);
  let finalQuestions = initialQuestions;
  let passes = 0;
  const MAX_PASSES = 3;
  let coverageResult = checkCoverage(extraction.requirements, finalQuestions);

  while (!coverageResult.isComplete && passes < MAX_PASSES) {
    passes++;
    const uncovered = extraction.requirements.filter((r) =>
      coverageResult.uncoveredIds.includes(r.id),
    );
    if (uncovered.length === 0) break;

    try {
      const gapOutput = await generateGapQuestions(
        uncovered,
        extraction,
        companyContext,
        finalQuestions.length,
        llm,
      );

      if (gapOutput.questions.length === 0) break;

      finalQuestions = mergeQuestions(finalQuestions, gapOutput.questions);
      coverageResult = checkCoverage(extraction.requirements, finalQuestions);
    } catch (err) {
      console.warn(`[Orchestrator] Gap pass ${passes} warning:`, err);
      break;
    }
  }

  // Step 7: Allocate schedule
  await onProgress?.('Building study schedule', 95);
  const schedule = allocateSchedule(finalQuestions, extraction.requirements, input.days);

  // Derive company name fallback
  let companyName = extraction.company;
  if (!companyName) {
    try {
      companyName = new URL(input.company_url).hostname.replace(/^www\./, '');
    } catch {
      companyName = 'Company';
    }
  }

  // Step 8: Build final Kit and validate
  await onProgress?.('Finalizing preparation kit', 100);

  const rawKit: Kit = {
    source: {
      company: companyName,
      company_url: input.company_url,
      role: extraction.role_title,
      location: extraction.location ?? '',
      jd_chars: input.jd.length,
      researched_at: new Date().toISOString(),
      pages_used: crawledPages.map((p) => p.url),
    },
    company_brief: {
      summary: companyBrief.summary,
      what_they_do: companyBrief.what_they_do,
      sources: companyBrief.sources,
    },
    role: {
      title: extraction.role_title,
      seniority: extraction.seniority,
      responsibilities: extraction.responsibilities,
      requirements: extraction.requirements,
    },
    questions: finalQuestions.map((q) => ({
      ...q,
      _state: 'generated' as const,
    })),
    flashcards: flashcards.map((f) => ({
      ...f,
      _state: 'generated' as const,
    })),
    schedule,
    coverage: {
      uncovered_requirement_ids: coverageResult.uncoveredIds,
      passes,
    },
  };

  return KitSchema.parse(rawKit);
}
