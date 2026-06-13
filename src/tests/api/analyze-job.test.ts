import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/analyze", () => ({
  analyzeWithAI: vi.fn(),
  getApiKey: vi.fn((config: Record<string, unknown>) => (config.apiKeys as Record<string, string>)?.[config.provider as string] ?? ""),
}));

vi.mock("@/lib/html-cleaner", () => ({
  cleanHtml: (html: string) => html,
  truncateForAI: (text: string) => text,
  MAX_CHARS: 50_000,
}));

vi.mock("node:dns/promises", () => ({
  default: {
    lookup: vi.fn().mockResolvedValue([]),
  },
}));

const mockJobAnalysis = {
  jobTitle: "Frontend Engineer",
  companyName: "Acme",
  location: "Remote",
  employmentType: "Full-time",
  overview: "Build UIs.",
  candidateProfile: { seniorityLevel: "Mid", roleType: "Frontend", teamContext: "Team", summary: "Summary" },
  techStack: [],
  skills: [],
  requirements: [],
  responsibilities: [],
  benefits: [],
  redFlags: [],
  learningResources: [],
  preparationRoadmap: [],
};

const validConfig = { provider: "google" as const, model: "gemini-2.5-flash", apiKeys: { google: "test-api-key" } };

function buildRequest(body: object) {
  return new Request("http://localhost/api/analyze-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze-job", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fetch: network error"));
  });

  it("returns 401 when apiKey is missing", async () => {
    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({ text: "some job", aiConfig: { provider: "google", model: "x", apiKeys: { google: "" } } });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("API Key");
  });

  it("returns 400 when neither url nor text is provided", async () => {
    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({ aiConfig: validConfig });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is too short", async () => {
    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({ text: "short", aiConfig: validConfig });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("too short");
  });

  it("returns 200 with NDJSON stream for valid text input", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");

    async function* createStream() {
      yield mockJobAnalysis;
    }

    const mockStream = {
      partialObjectStream: createStream(),
    };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We are looking for a senior React developer with 5+ years of experience building scalable web applications.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Frontend Engineer");
    expect(text).toContain("stream_complete");
  });

  it("returns 400 for private/localhost URL", async () => {
    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({ url: "http://localhost:3000/jobs/123", aiConfig: validConfig });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Private or local");
  });

  it("returns 400 for non-http protocol URL", async () => {
    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({ url: "ftp://example.com/job", aiConfig: validConfig });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("HTTP and HTTPS");
  });

  it("returns 500 when analyzeWithAI throws an unexpected error", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    vi.mocked(analyzeWithAI).mockRejectedValue(new Error("AI service down") as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We need a senior engineer with 5 years experience in cloud infrastructure and distributed systems.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 400 when URL fetch errors match fetch keyword", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    vi.mocked(analyzeWithAI).mockRejectedValue(new Error("fetch failed") as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      url: "https://example.com/job",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("fetch");
  });

  it("returns 400 when error message contains 'short'", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    vi.mocked(analyzeWithAI).mockRejectedValue(new Error("too short") as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We need a senior engineer with 5 years experience in cloud infrastructure and distributed systems.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when error message contains 'HTML'", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    vi.mocked(analyzeWithAI).mockRejectedValue(new Error("HTML parsing error") as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We need a senior engineer with 5 years experience in cloud infrastructure and distributed systems.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 with generic message for non-Error thrown", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    vi.mocked(analyzeWithAI).mockRejectedValue("string error" as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We need a senior engineer with 5 years experience in cloud infrastructure and distributed systems.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 200 and handles stream error gracefully", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    async function* errorStream() {
      yield { jobTitle: "Partial" };
      throw new Error("stream crashed");
    }
    const mockStream = { partialObjectStream: errorStream() };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We need a senior engineer with 5 years experience.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Partial");
    expect(text).toContain("stream_error");
  });

  it("handles stream with zero chunks gracefully", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    async function* emptyStream() {}
    const mockStream = { partialObjectStream: emptyStream() };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We need a senior engineer with 5 years experience.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("stream_complete");
    expect(text).not.toContain("jobTitle");
  });

  it("handles multiple stream chunks with batching and progress logging", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    async function* multiChunkStream() {
      yield { jobTitle: "A" };
      for (let i = 0; i < 105; i++) {
        yield { jobTitle: "B", progress: i };
      }
      yield { jobTitle: "Final", progress: 105 };
    }
    const mockStream = { partialObjectStream: multiChunkStream() };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We need a senior engineer with 5 years experience.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("stream_complete");
    expect(text).toContain("Final");
  });

  it("handles URL with DNS resolving to public IP", async () => {
    const dnsModule = await import("node:dns/promises");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dnsResult: any = [{ family: 4, address: "8.8.8.8" }];
    vi.mocked(dnsModule.default.lookup).mockResolvedValue(dnsResult);

    const { analyzeWithAI } = await import("@/lib/analyze");
    async function* pubStream() {
      yield mockJobAnalysis;
    }
    const mockStream = { partialObjectStream: pubStream() };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Senior React developer needed with 5+ years of experience building scalable web applications and microservices architecture design patterns.", {
        status: 200,
      })
    );

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      url: "https://example.com/job",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Frontend Engineer");
  });

  it("rejects private 172.x.x.x IP in 16-31 range", async () => {
    const dnsModule = await import("node:dns/promises");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dnsResultPrivate: any = [{ family: 4, address: "172.16.0.1" }];
    vi.mocked(dnsModule.default.lookup).mockResolvedValue(dnsResultPrivate);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      url: "https://example.com/job",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Private");
  });

  it("allows 172.x.x.x IP outside private range", async () => {
    const dnsModule = await import("node:dns/promises");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dnsResultOutside: any = [{ family: 4, address: "172.15.0.1" }];
    vi.mocked(dnsModule.default.lookup).mockResolvedValue(dnsResultOutside);

    const { analyzeWithAI } = await import("@/lib/analyze");
    async function* pubStream() {
      yield mockJobAnalysis;
    }
    const mockStream = { partialObjectStream: pubStream() };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Senior React developer needed with 5+ years of experience building scalable web applications and microservices architecture design patterns.", {
        status: 200,
      })
    );

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      url: "https://example.com/job",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("rejects URL with 10.x.x.x IP address", async () => {
    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      url: "http://10.0.0.1/jobs/123",
      aiConfig: validConfig,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Private");
  });

  it("handles DNS lookup failure gracefully", async () => {
    const dnsModule = await import("node:dns/promises");
    vi.mocked(dnsModule.default.lookup).mockRejectedValueOnce(new Error("DNS timeout"));

    const { analyzeWithAI } = await import("@/lib/analyze");
    async function* dnsFailStream() {
      yield mockJobAnalysis;
    }
    const mockStream = { partialObjectStream: dnsFailStream() };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Senior React developer needed with 5+ years of experience building scalable web applications and microservices architecture design patterns.", {
        status: 200,
      })
    );

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      url: "https://example.com/job",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Frontend Engineer");
  });

  it("returns 400 when URL has invalid format", async () => {
    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      url: "not a valid url",
      aiConfig: validConfig,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when Jina fetch returns non-ok status", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    vi.mocked(analyzeWithAI).mockRejectedValue(new Error("trigger error after fetch") as never);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      url: "https://example.com/job",
      aiConfig: validConfig,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("status 404");
  });

  it("streams batching via time-based interval", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    async function* slowStream() {
      yield { jobTitle: "A" };
      await new Promise((r) => setTimeout(r, 400));
      yield { jobTitle: "B" };
      await new Promise((r) => setTimeout(r, 400));
      yield { jobTitle: "C" };
    }
    const mockStream = { partialObjectStream: slowStream() };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We are searching for a senior engineer with extensive experience in cloud infrastructure and distributed systems.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("A");
    expect(text).toContain("B");
    expect(text).toContain("C");
    expect(text).toContain("stream_complete");
  }, 10_000);

  it("handles IPv6 DNS resolution for private address", async () => {
    const dnsModule = await import("node:dns/promises");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dnsResult: any = [{ family: 6, address: "::1" }];
    vi.mocked(dnsModule.default.lookup).mockResolvedValue(dnsResult);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({ url: "https://example.com/job", aiConfig: validConfig });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Private");
  });

  it("handles Jina fetch network error", async () => {
    const dnsModule = await import("node:dns/promises");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dnsResult: any = [{ family: 4, address: "8.8.8.8" }];
    vi.mocked(dnsModule.default.lookup).mockResolvedValue(dnsResult);

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({ url: "https://example.com/job", aiConfig: validConfig });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Unable to fetch the URL");
  });

  it("handles stream pipe with non-Error throw", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    async function* badStream() {
      yield { jobTitle: "Partial" };
      throw "string error";
    }
    const mockStream = { partialObjectStream: badStream() };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We are looking for a senior React developer with 5+ years of experience building scalable web applications.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("stream_error");
  });

  it("fetches URL content and analyzes it successfully", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    async function* urlStream() {
      yield mockJobAnalysis;
    }
    const mockStream = { partialObjectStream: urlStream() };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Some job description text with enough length for analysis that exceeds the minimum threshold of 50 characters for sure.", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    );

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      url: "https://example.com/job",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Frontend Engineer");
    expect(text).toContain("stream_complete");
  });
});
