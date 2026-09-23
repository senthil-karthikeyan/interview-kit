import type { LLMProvider } from '@interviewkit/ai';
import { wrapUntrustedContent } from '@interviewkit/ai';
import {
  QuestionGenerationOutputSchema,
  GapQuestionOutputSchema,
  type QuestionGenerationOutput,
  type GapQuestionOutput,
  type GeneratedQuestion,
  type QuestionCategory,
} from '@interviewkit/schemas';
import type { RequirementExtractionOutput } from '@interviewkit/schemas';

const QUESTION_SYSTEM = `You are an expert technical interviewer creating personalized interview preparation questions.

RULES:
- Every question MUST reference at least one requirement ID from the provided list.
- Questions must be specific, realistic, and grounded in the job requirements.
- Answer outlines should be 3-5 bullet points covering the key points a good answer should include.
- difficulty: 1 = straightforward/foundational, 2 = intermediate, 3 = advanced/complex.
- For must-have requirements: prefer difficulty 2-3.
- For nice-to-have: prefer difficulty 1-2.
- Output ONLY valid JSON. No markdown.`;

const CATEGORY_INSTRUCTIONS: Record<QuestionCategory, string> = {
  technical: 'Focus on specific technologies, tools, architectures, and coding concepts mentioned in the requirements.',
  behavioural: 'Use STAR format (Situation, Task, Action, Result). Focus on experiences and soft skills.',
  'system-design': 'Focus on designing scalable, maintainable systems. Reference role seniority and technical requirements.',
  'company-fit': 'Focus on company culture, values, mission alignment, and role-specific motivations.',
};

/**
 * Generate questions for a specific category.
 * Each question references requirement IDs to enable coverage tracking.
 */
export async function generateQuestionsForCategory(
  category: QuestionCategory,
  extraction: RequirementExtractionOutput,
  companyContext: string,
  interviewContext: string,
  existingQIds: string[],
  llm: LLMProvider,
): Promise<GeneratedQuestion[]> {
  const startIndex = existingQIds.length + 1;
  const relevantReqs = extraction.requirements;

  if (relevantReqs.length === 0) return [];

  const reqList = relevantReqs
    .map((r) => `  - ${r.id} [${r.priority}/${r.kind}]: ${r.text}`)
    .join('\n');

  const prompt = `Generate interview questions for this ${category} category.

ROLE: ${extraction.role_title} (${extraction.seniority})
COMPANY: ${extraction.company || 'the company'}

REQUIREMENTS:
${reqList}

COMPANY CONTEXT:
${wrapUntrustedContent('COMPANY_INFO', companyContext)}

INTERVIEW PROCESS CONTEXT:
${wrapUntrustedContent('INTERVIEW_INFO', interviewContext)}

CATEGORY INSTRUCTIONS: ${CATEGORY_INSTRUCTIONS[category]}

Generate 4-6 questions. Start question IDs from q${startIndex}.
Each question must reference at least one requirement ID from the list above.

Return JSON:
{
  "questions": [
    {
      "id": "q${startIndex}",
      "requirement_ids": ["r1"],
      "category": "${category}",
      "prompt": "the interview question",
      "answer_outline": "key points a strong answer should cover",
      "difficulty": 2
    }
  ]
}`;

  const result: QuestionGenerationOutput = await llm.generate({
    system: QUESTION_SYSTEM,
    prompt,
    schema: QuestionGenerationOutputSchema,
    temperature: 0.4,
  });

  // Filter to only keep questions that reference valid requirement IDs
  const validReqIds = new Set(relevantReqs.map((r) => r.id));
  return result.questions
    .filter((q) => q.category === category)
    .map((q) => ({
      ...q,
      requirement_ids: q.requirement_ids.filter((id) => validReqIds.has(id)),
    }))
    .filter((q) => q.requirement_ids.length > 0);
}

/**
 * Generate all questions across all four categories.
 * Returns a flat array of questions.
 */
export async function generateAllQuestions(
  extraction: RequirementExtractionOutput,
  companyContext: string,
  interviewContext: string,
  llm: LLMProvider,
): Promise<GeneratedQuestion[]> {
  const categories: QuestionCategory[] = ['technical', 'behavioural', 'system-design', 'company-fit'];
  const allQuestions: GeneratedQuestion[] = [];

  for (const category of categories) {
    const questions = await generateQuestionsForCategory(
      category,
      extraction,
      companyContext,
      interviewContext,
      allQuestions.map((q) => q.id),
      llm,
    );
    allQuestions.push(...questions);
  }

  // Re-index all questions sequentially (q1, q2, ...)
  return allQuestions.map((q, i) => ({ ...q, id: `q${i + 1}` }));
}

/**
 * Generate gap-filling questions for uncovered must-have requirements.
 * Called by the coverage engine when gaps are detected.
 */
export async function generateGapQuestions(
  uncoveredRequirements: RequirementExtractionOutput['requirements'],
  extraction: RequirementExtractionOutput,
  companyContext: string,
  existingQCount: number,
  llm: LLMProvider,
): Promise<GapQuestionOutput> {
  const startIndex = existingQCount + 1;
  const reqList = uncoveredRequirements
    .map((r) => `  - ${r.id} [${r.priority}/${r.kind}]: ${r.text}`)
    .join('\n');

  const prompt = `The following requirements are not yet covered by any interview question. Generate targeted questions for EACH uncovered requirement.

ROLE: ${extraction.role_title}
COMPANY: ${extraction.company || 'the company'}

UNCOVERED REQUIREMENTS (must generate at least one question per requirement):
${reqList}

COMPANY CONTEXT:
${wrapUntrustedContent('COMPANY_INFO', companyContext)}

For each requirement, generate 1-2 questions. Start IDs from q${startIndex}.
Choose the most appropriate category for each question.

Return JSON:
{
  "questions": [
    {
      "id": "q${startIndex}",
      "requirement_ids": ["r1"],
      "category": "technical | behavioural | system-design | company-fit",
      "prompt": "the interview question",
      "answer_outline": "key points to cover",
      "difficulty": 2
    }
  ]
}`;

  const validReqIds = new Set(uncoveredRequirements.map((r) => r.id));

  const result = await llm.generate({
    system: QUESTION_SYSTEM,
    prompt,
    schema: GapQuestionOutputSchema,
    temperature: 0.3,
  });

  return {
    questions: result.questions
      .map((q) => ({
        ...q,
        requirement_ids: q.requirement_ids.filter((id) => validReqIds.has(id)),
      }))
      .filter((q) => q.requirement_ids.length > 0),
  };
}
