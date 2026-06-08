import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AiConfig } from "@/lib/analyze";

// We mock the ai SDK and provider adapters to test the routing logic
// without making real API calls.

const mockGenerateObject = vi.fn();
vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));

const mockModel = { id: "mock-model" };
const mockCreate = vi.fn().mockReturnValue(mockModel);

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => mockCreate,
}));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => mockCreate,
}));
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: () => mockCreate,
}));
vi.mock("@ai-sdk/groq", () => ({
  createGroq: () => mockCreate,
}));
vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: () => mockCreate,
}));

const mockAnalysisResult = {
  jobTitle: "Software Engineer",
  companyName: "Acme",
  location: "Remote",
  employmentType: "Full-time",
  overview: "Build cool stuff.",
  candidateProfile: {
    seniorityLevel: "Mid",
    roleType: "Full-Stack",
    teamContext: "5-person team",
    summary: "Fast learner.",
  },
  techStack: [],
  skills: [],
  requirements: [],
  responsibilities: [],
  benefits: [],
  redFlags: [],
  learningResources: [
    {
      skill: "React",
      resources: [
        {
          title: "React Docs",
          url: "https://react.dev",
          type: "documentation",
          difficulty: "beginner",
          isFree: true,
        },
      ],
      roadmapOrder: 2,
      estimatedHours: "10h",
    },
    {
      skill: "TypeScript",
      resources: [
        {
          title: "TS Handbook",
          url: "https://typescriptlang.org/docs",
          type: "documentation",
          difficulty: "intermediate",
          isFree: true,
        },
      ],
      roadmapOrder: 1,
      estimatedHours: "5h",
    },
  ],
  preparationRoadmap: [],
};

describe("analyzeWithAI", () => {
  beforeEach(() => {
    mockGenerateObject.mockReset();
    mockCreate.mockReset().mockReturnValue(mockModel);
    mockGenerateObject.mockResolvedValue({ object: mockAnalysisResult });
  });

  it("calls generateObject and returns sorted learning resources", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    const config: AiConfig = { provider: "google", model: "gemini-2.5-flash", apiKey: "test-key" };

    const result = await analyzeWithAI("some job text", config);

    expect(mockGenerateObject).toHaveBeenCalledOnce();
    // learningResources should be sorted by roadmapOrder ascending
    expect(result.learningResources[0].skill).toBe("TypeScript"); // order 1
    expect(result.learningResources[1].skill).toBe("React");      // order 2
  });

  it.each([
    ["openai" as const],
    ["anthropic" as const],
    ["groq" as const],
    ["openrouter" as const],
    ["google" as const],
  ])("routes provider '%s' correctly", async (provider) => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    const config: AiConfig = { provider, model: "test-model", apiKey: "key" };

    await analyzeWithAI("job text", config);

    expect(mockGenerateObject).toHaveBeenCalled();
  });

  it("passes the job text in the prompt", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    const config: AiConfig = { provider: "google", model: "gemini-2.5-flash", apiKey: "key" };
    const jobText = "We are looking for a senior React developer";

    await analyzeWithAI(jobText, config);

    const callArgs = mockGenerateObject.mock.calls[0][0] as { prompt: string };
    expect(callArgs.prompt).toContain(jobText);
  });
});
