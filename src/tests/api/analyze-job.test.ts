import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the internal modules used by the route
vi.mock("@/lib/analyze", () => ({
  analyzeWithAI: vi.fn(),
}));

vi.mock("@/lib/html-cleaner", () => ({
  cleanHtml: (html: string) => html,
  truncateForAI: (text: string) => text,
}));

// Mock DNS to avoid real lookups
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

const validConfig = { provider: "google", model: "gemini-2.5-flash", apiKey: "test-api-key" };

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
  });

  it("returns 401 when apiKey is missing", async () => {
    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({ text: "some job", aiConfig: { provider: "google", model: "x", apiKey: "" } });
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

  it("returns 200 with analysis result for valid text input", async () => {
    const { analyzeWithAI } = await import("@/lib/analyze");
    const mockStream = {
      toTextStreamResponse: vi.fn().mockReturnValue(new Response(JSON.stringify(mockJobAnalysis), { status: 200 })),
    };
    vi.mocked(analyzeWithAI).mockResolvedValue(mockStream as never);

    const { POST } = await import("@/app/api/analyze-job/route");
    const req = buildRequest({
      text: "We are looking for a senior React developer with 5+ years of experience building scalable web applications.",
      aiConfig: validConfig,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
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
});
