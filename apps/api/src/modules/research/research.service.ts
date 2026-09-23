import type { LLMProvider } from '@interviewkit/ai';
import { wrapUntrustedContent } from '@interviewkit/ai';
import {
  CompanyBriefOutputSchema,
  InterviewResearchOutputSchema,
  type CompanyBriefOutput,
  type InterviewResearchOutput,
} from '@interviewkit/schemas';
import type { CrawledPage } from '../../services/crawler/crawler.service.js';

const BRIEF_SYSTEM = `You are a company analyst. Summarize factual company information from provided web pages.

RULES:
- Report only what the pages explicitly state. Do NOT fabricate or speculate.
- If information is not available, say so honestly — do not hallucinate.
- Output ONLY valid JSON. No markdown, no explanation.`;

const RESEARCH_SYSTEM = `You are an interview process researcher. Analyze provided company pages for interview process information.

RULES:
- Report only what is explicitly stated in the pages. Do NOT fabricate or speculate.
- If no interview information is found, set "found": false and leave other fields empty.
- Never invent interview rounds or tips that are not evidenced in the source material.
- Output ONLY valid JSON. No markdown, no explanation.`;

/**
 * Generate a company brief from crawled pages.
 * Returns an honest thin brief if little information was found.
 */
export async function generateCompanyBrief(
  pages: CrawledPage[],
  companyUrl: string,
  llm: LLMProvider,
): Promise<CompanyBriefOutput> {
  if (pages.length === 0) {
    return {
      summary: 'Company website could not be reached or contained insufficient information.',
      what_they_do: '',
      sources: [],
    };
  }

  const pageContent = pages
    .slice(0, 5) // Limit to top 5 pages for the brief
    .map((p) => `URL: ${p.url}\nTitle: ${p.title}\n${wrapUntrustedContent('PAGE_CONTENT', p.text)}`)
    .join('\n\n---\n\n');

  const usedUrls = pages.slice(0, 5).map((p) => p.url);

  const prompt = `Analyze the following company pages and produce a concise company brief.

${pageContent}

Return JSON with this structure:
{
  "summary": "2-3 sentence summary of the company",
  "what_they_do": "clear description of the company's product/service",
  "sources": ${JSON.stringify(usedUrls)}
}`;

  return llm.generate({
    system: BRIEF_SYSTEM,
    prompt,
    schema: CompanyBriefOutputSchema,
    temperature: 0.2,
  });
}

/**
 * Look for interview process information in crawled pages.
 * Returns found=false honestly if no hiring information is discovered.
 * A missing hiring page does NOT fail the entire kit.
 */
export async function researchInterviewProcess(
  pages: CrawledPage[],
  role: string,
  llm: LLMProvider,
): Promise<InterviewResearchOutput> {
  // Filter pages most likely to contain interview info
  const interviewPages = pages.filter((p) => {
    const lower = (p.url + ' ' + p.title + ' ' + p.text).toLowerCase();
    return (
      lower.includes('interview') ||
      lower.includes('hiring') ||
      lower.includes('career') ||
      lower.includes('join us') ||
      lower.includes('process') ||
      lower.includes('how we hire')
    );
  });

  if (interviewPages.length === 0) {
    // No relevant pages found — honest result
    return {
      found: false,
      process_summary: '',
      typical_rounds: [],
      tips: [],
      sources: [],
    };
  }

  const pageContent = interviewPages
    .slice(0, 3)
    .map((p) => `URL: ${p.url}\n${wrapUntrustedContent('PAGE_CONTENT', p.text)}`)
    .join('\n\n---\n\n');

  const prompt = `Look for interview process information in the following company pages for a "${role}" role.

${pageContent}

Return JSON with this structure:
{
  "found": true or false,
  "process_summary": "brief description of their interview process, or empty string if not found",
  "typical_rounds": ["list of interview rounds if described"],
  "tips": ["any preparation tips mentioned"],
  "sources": ["URLs where interview info was found"]
}

If no interview information is present in the pages, set found to false and leave other arrays empty.`;

  return llm.generate({
    system: RESEARCH_SYSTEM,
    prompt,
    schema: InterviewResearchOutputSchema,
    temperature: 0.1,
  });
}
