import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useJobAnalysis } from "@/hooks/useJobAnalysis";
import type { AiConfig } from "@/lib/analyze";

const validConfig: AiConfig = { provider: "google", model: "gemini-2.5-flash", apiKey: "test-key" };

const fullResult = {
  jobTitle: "Engineer",
  companyName: "Acme",
  location: "Remote",
  employmentType: "Full-time",
  overview: "Test role.",
  candidateProfile: { seniorityLevel: "Senior", roleType: "Developer", teamContext: "Small team", summary: "Summary" },
  techStack: [{ category: "Frontend", technologies: ["React"] }],
  skills: [{ name: "React", category: "required" as const, context: "UI framework" }],
  requirements: [{ text: "3+ yrs exp", type: "experience" as const }],
  responsibilities: ["Build features"],
  benefits: ["Health insurance"],
  redFlags: [],
  learningResources: [{ skill: "React", resources: [{ title: "React Docs", url: "https://react.dev", type: "documentation" as const, difficulty: "beginner" as const, isFree: true }], roadmapOrder: 1, estimatedHours: "10h" }],
  preparationRoadmap: [{ phase: "Week 1", tasks: ["Learn React"], priority: "critical" as const }],
};

function createStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

function createErrorResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status });
}

describe("useJobAnalysis", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with default state", () => {
    const { result } = renderHook(() => useJobAnalysis());
    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("resets state", () => {
    const { result } = renderHook(() => useJobAnalysis());
    act(() => {
      result.current.restore(fullResult);
    });
    expect(result.current.result).not.toBeNull();
    act(() => {
      result.current.reset();
    });
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("restores a result", () => {
    const { result } = renderHook(() => useJobAnalysis());
    act(() => {
      result.current.restore(fullResult);
    });
    expect(result.current.result?.jobTitle).toBe("Engineer");
    expect(result.current.loading).toBe(false);
  });

  it("sets loading state during analyze", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.analyze({ text: "job description" }, validConfig);
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      await promise;
    });
    fetchSpy.mockRestore();
  });

  it("handles HTTP error (non-ok response)", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createErrorResponse(401, "Invalid API Key"));

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain("Invalid API Key");
    expect(result.current.result).toBeNull();
  });

  it("handles HTTP error without error message", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 500 })
    );

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Failed to analyze job posting");
  });

  it("handles missing response body", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain("No response body");
  });

  it("handles network error", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network failure"));

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain("network failure");
  });

  it("handles non-Error rejection", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    vi.spyOn(globalThis, "fetch").mockRejectedValue("string error");

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Something went wrong while analyzing.");
  });

  it("parses streaming NDJSON and returns result", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    const ndjsonChunks = [
      JSON.stringify({ jobTitle: "Engineer" }) + "\n",
      JSON.stringify(fullResult) + "\n",
      JSON.stringify({ __type: "stream_complete" }) + "\n",
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createStreamResponse(ndjsonChunks));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.result?.jobTitle).toBe("Engineer");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((returned as any)?.jobTitle).toBe("Engineer");
  });

  it("handles stream_error sentinel", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    const ndjsonChunks = [
      JSON.stringify({ jobTitle: "Partial" }) + "\n",
      JSON.stringify({ __type: "stream_error", error: "Model crashed" }) + "\n",
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createStreamResponse(ndjsonChunks));

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain("Model crashed");
  });

  it("handles stream_error without message", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    const ndjsonChunks = [
      JSON.stringify({ __type: "stream_error" }) + "\n",
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createStreamResponse(ndjsonChunks));

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain("Stream processing failed on server");
  });

  it("handles no chunks in stream", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createStreamResponse([]));

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain("usable output");
  });

  it("handles empty NDJSON lines", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    const ndjsonChunks = ["\n\n\n"];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createStreamResponse(ndjsonChunks));

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain("usable output");
  });

  it("handles malformed JSON lines in stream", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    const ndjsonChunks = [
      "not-json\n",
      JSON.stringify(fullResult) + "\n",
      JSON.stringify({ __type: "stream_complete" }) + "\n",
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createStreamResponse(ndjsonChunks));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.analyze({ text: "job" }, validConfig);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((returned as any)?.jobTitle).toBe("Engineer");
  });

  it("validates result with Zod schema", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    const ndjsonChunks = [
      JSON.stringify(fullResult) + "\n",
      JSON.stringify({ __type: "stream_complete" }) + "\n",
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createStreamResponse(ndjsonChunks));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.analyze({ text: "job" }, validConfig);
    });

    // parsed.data should have sorted learningResources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((returned as any)?.learningResources).toBeDefined();
  });

  it("accepts result even if Zod validation fails", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    const invalidResult = { ...fullResult, skills: "not-an-array" as never };
    const ndjsonChunks = [
      JSON.stringify(invalidResult) + "\n",
      JSON.stringify({ __type: "stream_complete" }) + "\n",
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createStreamResponse(ndjsonChunks));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.analyze({ text: "job" }, validConfig);
    });

    // Falls through to setState with finalResult directly
    expect(result.current.loading).toBe(false);
    expect(returned).toBeDefined();
  });

  it("throttles rapid stream updates", async () => {
    const { result } = renderHook(() => useJobAnalysis());

    const chunks: string[] = [];
    for (let i = 0; i < 20; i++) {
      chunks.push(JSON.stringify({ jobTitle: `Step ${i}` }) + "\n");
    }
    chunks.push(JSON.stringify(fullResult) + "\n");
    chunks.push(JSON.stringify({ __type: "stream_complete" }) + "\n");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(createStreamResponse(chunks));

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.result?.jobTitle).toBe("Engineer");
  });

  it("re-throws non-SyntaxError during stream parsing", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamResponse(["not-json\n"])
    );

    vi.spyOn(JSON, "parse").mockImplementationOnce(() => {
      const err = new Error("custom parse error");
      err.name = "CustomError";
      throw err;
    });

    await act(async () => {
      await result.current.analyze({ text: "job" }, validConfig);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    vi.restoreAllMocks();
  });

  it("uses url input mode", async () => {
    const { result } = renderHook(() => useJobAnalysis());
    const ndjsonChunks = [
      JSON.stringify(fullResult) + "\n",
      JSON.stringify({ __type: "stream_complete" }) + "\n",
    ];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(createStreamResponse(ndjsonChunks));

    await act(async () => {
      await result.current.analyze({ url: "https://example.com/job" }, validConfig);
    });

    const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(callBody.url).toBe("https://example.com/job");
    expect(callBody.text).toBeUndefined();
  });
});
