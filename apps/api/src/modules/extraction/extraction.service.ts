import type { LLMProvider } from '@interviewkit/ai';
import { wrapUntrustedContent } from '@interviewkit/ai';
import {
  RequirementExtractionOutputSchema,
  type RequirementExtractionOutput,
} from '@interviewkit/schemas';

const SYSTEM_PROMPT = `You are a job requirements analyst. Your job is to extract structured information from job descriptions.

RULES:
- Extract ONLY information explicitly stated in the job description. Do NOT infer or fabricate requirements.
- Every requirement must be grounded in the text of the job description.
- Mark a requirement as "must" if it uses language like: required, must have, essential, minimum, you will need.
- Mark a requirement as "nice" if it uses language like: nice to have, preferred, plus, bonus, ideally, familiarity with.
- When in doubt, mark as "must".
- Assign sequential IDs: r1, r2, r3, ...
- Output ONLY valid JSON matching the schema. No markdown, no explanation.`;

export async function extractRequirements(
  jd: string,
  llm: LLMProvider,
): Promise<RequirementExtractionOutput> {
  const prompt = `Extract requirements from the following job description.

${wrapUntrustedContent('JOB_DESCRIPTION', jd)}

Return JSON with this exact structure:
{
  "role_title": "string",
  "seniority": "string (Junior/Mid/Senior/Lead/Staff/Principal or empty string)",
  "company": "string (if mentioned, else empty string)",
  "location": "string (if mentioned, else empty string)",
  "responsibilities": ["array of strings"],
  "requirements": [
    {
      "id": "r1",
      "text": "requirement text verbatim or close paraphrase",
      "kind": "technical | behavioural | domain",
      "priority": "must | nice"
    }
  ]
}`;

  return llm.generate<RequirementExtractionOutput>({
    system: SYSTEM_PROMPT,
    prompt,
    schema: RequirementExtractionOutputSchema,
    temperature: 0.1,
  });
}
