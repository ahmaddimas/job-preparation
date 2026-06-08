import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AiConfig } from "@/lib/analyze";

const mockStreamObject = vi.fn();
vi.mock("ai", () => ({
  streamObject: (...args: unknown[]) => mockStreamObject(...args),
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

const mockStreamResult = {
  toTextStreamResponse: vi.fn().mockReturnValue(new Response("{}")),
};

describe("analyzeWithAI", () => {
  beforeEach(() => {
    mockStreamObject.mockReset();
    mockCreate.mockReset().mockReturnValue(mockModel);
    mockStreamObject.mockReturnValue(mockStreamResult);
  });

  it("calls streamObject and returns a stream result", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    const config: AiConfig = { provider: "google", model: "gemini-2.5-flash", apiKey: "test-key" };

    const result = await analyzeWithAI("some job text", config);

    expect(mockStreamObject).toHaveBeenCalledOnce();
    expect(result).toBe(mockStreamResult);
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

    expect(mockStreamObject).toHaveBeenCalled();
  });

  it("passes the job text in the prompt", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    const config: AiConfig = { provider: "google", model: "gemini-2.5-flash", apiKey: "key" };
    const jobText = "We are looking for a senior React developer";

    await analyzeWithAI(jobText, config);

    const callArgs = mockStreamObject.mock.calls[0][0] as { prompt: string };
    expect(callArgs.prompt).toContain(jobText);
  });

  it("warns and falls back to Google for unknown provider", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { analyzeWithAI } = await import("@/lib/analyze");
    const config = { provider: "unknown" as never, model: "x", apiKey: "key" };
    await analyzeWithAI("job text", config);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown provider"));
    expect(mockStreamObject).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
