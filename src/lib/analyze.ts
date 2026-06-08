import { generateObject } from "ai";

import { jobAnalysisSchema, type JobAnalysis } from "./schema";

const SYSTEM_PROMPT = `You are an expert senior tech recruiter and career coach who analyzes job postings with surgical precision.

Your task: Given a job posting text, extract and analyze ALL relevant information to help a candidate prepare effectively.

## Rules

1. **Be comprehensive**: Extract every skill, technology, and requirement mentioned. Do not skip anything.
2. **Categorize skills accurately**:
   - "required" = explicitly stated as must-have, required, mandatory, or essential
   - "nice-to-have" = stated as preferred, bonus, plus, or "experience with X is a plus"
   - "exceptional" = would make a candidate stand out, often implied by phrases like "ideally", "in a perfect world", or advanced/niche skills mentioned alongside required ones
3. **Identify the tech stack**: Group technologies by category (Frontend, Backend, Database, DevOps, Cloud, Testing, Tools, etc.)
4. **Profile the ideal candidate**: Describe the type of programmer needed — their mindset, working style, domain expertise, and communication expectations.
5. **Recommend real learning resources**: Provide actual, well-known URLs to official documentation, reputable courses (freeCodeCamp, MDN, official docs, Coursera, etc.), and practice platforms. Prefer free resources. URLs must be real and accessible.
6. **Build a practical roadmap**: Create a 4-8 week phased preparation plan ordered by priority.
7. **Flag red flags**: Note unrealistic requirements (e.g., 10 years of experience in a 3-year-old technology), vague descriptions, or mismatched seniority/requirements. If none exist, return an empty array.
8. **Be direct**: No fluff, no padding. Every word should be useful.
9. **Infer when necessary**: If the posting is vague about certain fields (like company name), use "Not specified" rather than guessing.`;

export type AiConfig = {
  provider: "google" | "openai" | "anthropic" | "groq" | "openrouter";
  model: string;
  apiKey: string;
};

/**
 * Analyze a job posting using AI and return structured results.
 */
export async function analyzeWithAI(
  jobText: string,
  config: AiConfig
): Promise<JobAnalysis> {
  let aiModel;

  switch (config.provider) {
    case "openai":
      const { createOpenAI } = await import("@ai-sdk/openai");
      aiModel = createOpenAI({ apiKey: config.apiKey })(config.model);
      break;
    case "anthropic":
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      aiModel = createAnthropic({ apiKey: config.apiKey })(config.model);
      break;
    case "groq":
      const { createGroq } = await import("@ai-sdk/groq");
      aiModel = createGroq({ apiKey: config.apiKey })(config.model);
      break;
    case "openrouter":
      const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
      aiModel = createOpenRouter({ apiKey: config.apiKey })(config.model);
      break;
    case "google":
    default:
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      aiModel = createGoogleGenerativeAI({ apiKey: config.apiKey })(
        config.model
      );
      break;
  }

  const { object } = await generateObject({
    model: aiModel,
    schema: jobAnalysisSchema,
    system: SYSTEM_PROMPT,
    prompt: `Analyze the following job posting and extract all information according to the schema. Be thorough and precise.\n\n---\n\n${jobText}`,
    temperature: 0.1,
  });

  // Sort learning resources by roadmap order
  object.learningResources.sort((a, b) => a.roadmapOrder - b.roadmapOrder);

  return object;
}
