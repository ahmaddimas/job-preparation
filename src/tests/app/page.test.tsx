import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockUseJobAnalysis, mockUseJobHistory } = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseJobAnalysis: vi.fn((): any => ({
    result: null,
    loading: false,
    error: null,
    analyze: vi.fn().mockResolvedValue(null),
    reset: vi.fn(),
    restore: vi.fn(),
  })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseJobHistory: vi.fn((): any => ({
    entries: [],
    addEntry: vi.fn(),
    removeEntry: vi.fn(),
  })),
}));

vi.mock("@/hooks/useJobAnalysis", () => ({
  useJobAnalysis: mockUseJobAnalysis,
}));

vi.mock("@/hooks/useJobHistory", () => ({
  useJobHistory: mockUseJobHistory,
}));

const fullResult = {
  jobTitle: "Senior Developer",
  companyName: "Tech Co",
  location: "Remote",
  employmentType: "Full-time",
  overview: "Build great software with a talented team.",
  candidateProfile: {
    seniorityLevel: "Senior",
    roleType: "Developer",
    teamContext: "Small agile team",
    summary: "Pragmatic engineer who ships fast.",
  },
  techStack: [
    { category: "Frontend", technologies: ["React", "TypeScript"] },
    { category: "Backend", technologies: ["Node.js"] },
  ],
  skills: [
    { name: "React", category: "required" as const, context: "UI framework" },
    { name: "TypeScript", category: "required" as const, context: "Type safety" },
    { name: "Docker", category: "nice-to-have" as const, context: "Containerization" },
    { name: "GraphQL", category: "exceptional" as const, context: "API design" },
  ],
  requirements: [
    { text: "3+ yrs exp", type: "experience" as const },
    { text: "CS degree", type: "education" as const },
  ],
  responsibilities: ["Build features", "Write tests", "Code review"],
  benefits: ["Health insurance", "Remote work"],
  redFlags: ["Vague description", "Unrealistic timeline"],
  learningResources: [
    {
      skill: "React",
      resources: [
        {
          title: "React Docs",
          url: "https://react.dev",
          type: "documentation" as const,
          difficulty: "beginner" as const,
          isFree: true,
        },
      ],
      roadmapOrder: 1,
      estimatedHours: "10-20 hours",
    },
  ],
  preparationRoadmap: [
    { phase: "Week 1-2: React", tasks: ["Learn hooks", "Build a demo"], priority: "critical" as const },
    { phase: "Week 3: Node", tasks: ["Build an API"], priority: "high" as const },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Home", () => {
  it("renders the header and input form", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    expect(screen.getByText("Job Preparation Assistant")).toBeInTheDocument();
    expect(screen.getByText("Analyze with AI")).toBeInTheDocument();
  });

  it("shows settings modal when Settings button is clicked", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("⚙️ Settings"));
    expect(screen.getByText("AI Settings")).toBeInTheDocument();
    expect(screen.getByText("Save & Close")).toBeInTheDocument();
  });

  it("changes provider in settings modal", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("⚙️ Settings"));
    const select = screen.getAllByRole("combobox")[0];
    await userEvent.selectOptions(select, "openai");
    expect((select as HTMLSelectElement).value).toBe("openai");
  });

  it("changes model input in settings modal", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("⚙️ Settings"));
    await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "openrouter");
    const modelInput = screen.getByPlaceholderText("e.g. google/gemini-2.5-flash");
    await userEvent.clear(modelInput);
    await userEvent.type(modelInput, "openai/gpt-4o");
    expect(modelInput).toHaveValue("openai/gpt-4o");
  });

  it("changes API key input in settings modal", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("⚙️ Settings"));
    const apiKeyInput = screen.getByPlaceholderText("Enter your API key");
    await userEvent.type(apiKeyInput, "sk-test-key");
    expect(apiKeyInput).toHaveValue("sk-test-key");
  });

  it("closes settings modal via X button", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("⚙️ Settings"));
    expect(screen.getByText("AI Settings")).toBeInTheDocument();
    await userEvent.click(screen.getByText("✕"));
    expect(screen.queryByText("AI Settings")).not.toBeInTheDocument();
  });

  it("closes history panel via X button", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("📋 History"));
    expect(screen.getByText("Job History")).toBeInTheDocument();
    await userEvent.click(screen.getByText("✕"));
    expect(screen.queryByText("Job History")).not.toBeInTheDocument();
  });

  it("closes settings modal via Save & Close", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("⚙️ Settings"));
    expect(screen.getByText("AI Settings")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Save & Close"));
    expect(screen.queryByText("AI Settings")).not.toBeInTheDocument();
  });

  it("opens settings when submitting without API key", async () => {
    const mockAnalyze = vi.fn();
    mockUseJobAnalysis.mockReturnValue({
      result: null, loading: false, error: null,
      analyze: mockAnalyze, reset: vi.fn(), restore: vi.fn(),
    });
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("Analyze with AI"));
    expect(screen.getByText("AI Settings")).toBeInTheDocument();
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it("does not submit empty form", async () => {
    localStorage.setItem("job-prep-ai-config", JSON.stringify({
      provider: "google", model: "gemini-2.5-flash", apiKeys: { google: "test-key" },
    }));
    const mockAnalyze = vi.fn();
    mockUseJobAnalysis.mockReturnValue({
      result: null, loading: false, error: null,
      analyze: mockAnalyze, reset: vi.fn(), restore: vi.fn(),
    });
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("Analyze with AI"));
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it("shows history panel when History button is clicked", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("📋 History"));
    expect(screen.getByText("Job History")).toBeInTheDocument();
  });

  it("shows empty history message", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("📋 History"));
    expect(screen.getByText(/No saved analyses/)).toBeInTheDocument();
  });

  it("calls analyze when form is submitted with text", async () => {
    localStorage.setItem("job-prep-ai-config", JSON.stringify({
      provider: "google", model: "gemini-2.5-flash", apiKeys: { google: "test-key" },
    }));
    const mockAnalyze = vi.fn().mockResolvedValue({ jobTitle: "Engineer" });
    mockUseJobAnalysis.mockReturnValue({
      result: null, loading: false, error: null,
      analyze: mockAnalyze, reset: vi.fn(), restore: vi.fn(),
    });
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("Paste Text"));
    const textarea = screen.getByLabelText("Job description text");
    await userEvent.type(textarea, "We need a React developer");
    await userEvent.click(screen.getByText("Analyze with AI"));
    expect(mockAnalyze).toHaveBeenCalled();
  });

  it("calls analyze with URL input mode", async () => {
    localStorage.setItem("job-prep-ai-config", JSON.stringify({
      provider: "google", model: "gemini-2.5-flash", apiKeys: { google: "test-key" },
    }));
    const mockAnalyze = vi.fn().mockResolvedValue({ jobTitle: "Engineer" });
    mockUseJobAnalysis.mockReturnValue({
      result: null, loading: false, error: null,
      analyze: mockAnalyze, reset: vi.fn(), restore: vi.fn(),
    });
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    const urlInput = screen.getByLabelText("Job URL");
    await userEvent.type(urlInput, "https://example.com/job");
    await userEvent.click(screen.getByText("Analyze with AI"));
    expect(mockAnalyze).toHaveBeenCalledWith(
      { url: "https://example.com/job" },
      expect.anything()
    );
  });

  it("shows loading skeleton while analyzing", async () => {
    mockUseJobAnalysis.mockReturnValue({
      result: null, loading: true, error: null,
      analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
    });
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
  });

  it("switches between URL and Text tabs", async () => {
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    expect(screen.getByLabelText("Job URL")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Paste Text"));
    expect(screen.getByLabelText("Job description text")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Paste URL"));
    expect(screen.getByLabelText("Job URL")).toBeInTheDocument();
  });

  describe("results display", () => {
    it("renders all result cards with full data", async () => {
      mockUseJobAnalysis.mockReturnValue({ result: fullResult, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(), });
      const Home = (await import("@/app/page")).default;
      render(<Home />);

      expect(screen.getAllByText("Senior Developer").length).toBeGreaterThan(0);
      expect(screen.getByText("Tech Co")).toBeInTheDocument();
      expect(screen.getByText("Build great software with a talented team.")).toBeInTheDocument();

      expect(screen.getByText("Candidate Profile")).toBeInTheDocument();
      expect(screen.getByText("Small agile team")).toBeInTheDocument();
      expect(screen.getByText("Pragmatic engineer who ships fast.")).toBeInTheDocument();

      expect(screen.getByText("Tech Stack")).toBeInTheDocument();
      expect(screen.getByText("Frontend")).toBeInTheDocument();
      expect(screen.getByText("Backend")).toBeInTheDocument();
      expect(screen.getAllByText("React").length).toBeGreaterThan(0);
      expect(screen.getAllByText("TypeScript").length).toBeGreaterThan(0);
      expect(screen.getByText("Node.js")).toBeInTheDocument();

      expect(screen.getByText("Skills Checklist")).toBeInTheDocument();

      expect(screen.getByText("Requirements")).toBeInTheDocument();
      expect(screen.getByText("3+ yrs exp")).toBeInTheDocument();
      expect(screen.getByText("CS degree")).toBeInTheDocument();

      expect(screen.getByText("Responsibilities")).toBeInTheDocument();
      expect(screen.getByText("Build features")).toBeInTheDocument();
      expect(screen.getByText("Write tests")).toBeInTheDocument();

      expect(screen.getByText("Benefits")).toBeInTheDocument();
      expect(screen.getByText("Health insurance")).toBeInTheDocument();
      expect(screen.getByText("Remote work")).toBeInTheDocument();

      expect(screen.getByText("Preparation Roadmap")).toBeInTheDocument();
    });

    it("shows red flags section when present", async () => {
      mockUseJobAnalysis.mockReturnValue({
        result: fullResult, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      expect(screen.getByText("⚠️ Red Flags")).toBeInTheDocument();
      expect(screen.getByText("Vague description")).toBeInTheDocument();
      expect(screen.getByText("Unrealistic timeline")).toBeInTheDocument();
    });

    it("does not show red flags section when empty", async () => {
      mockUseJobAnalysis.mockReturnValue({
        result: { ...fullResult, redFlags: [] }, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      expect(screen.queryByText("⚠️ Red Flags")).not.toBeInTheDocument();
    });

    it("shows learning resources with expand/collapse", async () => {
      mockUseJobAnalysis.mockReturnValue({
        result: fullResult, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);

      expect(screen.getByText("Learning Resources")).toBeInTheDocument();
      expect(screen.getAllByText("React").length).toBeGreaterThan(0);

      await userEvent.click(screen.getByText("#1"));
      expect(screen.getByText("React Docs")).toBeInTheDocument();
      expect(screen.getByText("documentation")).toBeInTheDocument();
      expect(screen.getByText("beginner")).toBeInTheDocument();
      expect(screen.getByText("Free")).toBeInTheDocument();

      await userEvent.click(screen.getByText("#1"));
      expect(screen.queryByText("React Docs")).not.toBeInTheDocument();
    });

    it("shows learning resources empty state", async () => {
      mockUseJobAnalysis.mockReturnValue({
        result: { ...fullResult, learningResources: [] }, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      expect(screen.getByText(/Learning resources will appear/)).toBeInTheDocument();
    });

    it("shows preparation roadmap with priority badges", async () => {
      mockUseJobAnalysis.mockReturnValue({
        result: fullResult, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      expect(screen.getByText("Week 1-2: React")).toBeInTheDocument();
      expect(screen.getByText("Week 3: Node")).toBeInTheDocument();
      expect(screen.getByText("critical")).toBeInTheDocument();
      expect(screen.getByText("high")).toBeInTheDocument();
    });

    it("shows skills checklist with progress bar", async () => {
      mockUseJobAnalysis.mockReturnValue({
        result: { ...fullResult, skills: [
          { name: "React", category: "required" as const, context: "UI" },
          { name: "TS", category: "nice-to-have" as const, context: "Types" },
          { name: "GraphQL", category: "exceptional" as const, context: "API" },
        ]}, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);

      expect(screen.getByText("✅ Required")).toBeInTheDocument();
      expect(screen.getByText("🟡 Nice to Have")).toBeInTheDocument();
      expect(screen.getByText("🌟 Exceptional")).toBeInTheDocument();

      expect(screen.getByText("0%")).toBeInTheDocument();

      await userEvent.click(screen.getAllByText("React").filter(
        (el) => el.closest("label") !== null
      )[0]);
      expect(screen.getByText("33%")).toBeInTheDocument();
    });

    it("shows requirements empty state", async () => {
      mockUseJobAnalysis.mockReturnValue({
        result: { ...fullResult, requirements: [] }, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      expect(screen.getByText("No specific requirements extracted.")).toBeInTheDocument();
    });

    it("shows responsibilities empty state", async () => {
      mockUseJobAnalysis.mockReturnValue({
        result: { ...fullResult, responsibilities: [] }, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      expect(screen.getByText("No responsibilities listed.")).toBeInTheDocument();
    });

    it("shows benefits empty state", async () => {
      mockUseJobAnalysis.mockReturnValue({
        result: { ...fullResult, benefits: [] }, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      expect(screen.getByText("No benefits section found.")).toBeInTheDocument();
    });
  });

  describe("history panel", () => {
    it("shows history entries with load and delete buttons", async () => {
      mockUseJobAnalysis.mockReturnValue({
        result: null, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      mockUseJobHistory.mockReturnValue({
        entries: [
          {
            id: "entry-1",
            jobTitle: "Engineer",
            companyName: "Acme",
            timestamp: Date.now(),
            inputKey: "key-1",
            result: { skills: [{ name: "React", category: "required" as const, context: "UI" }] },
          },
        ],
        addEntry: vi.fn(),
        removeEntry: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      await userEvent.click(screen.getByText("📋 History"));

      expect(screen.getByText("Engineer")).toBeInTheDocument();
      expect(screen.getByText("Acme")).toBeInTheDocument();
      expect(screen.getByText("Load")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("loads an entry from history", async () => {
      const mockRestore = vi.fn();
      mockUseJobAnalysis.mockReturnValue({
        result: null, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: mockRestore,
      });
      mockUseJobHistory.mockReturnValue({
        entries: [
          {
            id: "entry-1",
            jobTitle: "Engineer",
            companyName: "Acme",
            timestamp: Date.now(),
            inputKey: "key-1",
            result: { skills: [{ name: "React", category: "required" as const, context: "UI" }] },
          },
        ],
        addEntry: vi.fn(),
        removeEntry: vi.fn(),
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      await userEvent.click(screen.getByText("📋 History"));
      await userEvent.click(screen.getByText("Load"));

      expect(mockRestore).toHaveBeenCalled();
    });

    it("shows delete confirmation dialog", async () => {
      const mockRemoveEntry = vi.fn().mockReturnValue(true);
      mockUseJobAnalysis.mockReturnValue({
        result: null, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      mockUseJobHistory.mockReturnValue({
        entries: [
          {
            id: "entry-1",
            jobTitle: "Engineer",
            companyName: "Acme",
            timestamp: Date.now(),
            inputKey: "key-1",
            result: {},
          },
        ],
        addEntry: vi.fn(),
        removeEntry: mockRemoveEntry,
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      await userEvent.click(screen.getByText("📋 History"));
      await userEvent.click(screen.getByText("Delete"));

      expect(screen.getByText("Delete Analysis")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to delete this analysis from history?")).toBeInTheDocument();

      await userEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByText("Delete Analysis")).not.toBeInTheDocument();
    });

    it("confirms delete entry from history", async () => {
      const mockRemoveEntry = vi.fn().mockReturnValue(true);
      mockUseJobAnalysis.mockReturnValue({
        result: null, loading: false, error: null,
        analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
      });
      mockUseJobHistory.mockReturnValue({
        entries: [
          {
            id: "entry-1",
            jobTitle: "Engineer",
            companyName: "Acme",
            timestamp: Date.now(),
            inputKey: "key-1",
            result: {},
          },
        ],
        addEntry: vi.fn(),
        removeEntry: mockRemoveEntry,
      });
      const Home = (await import("@/app/page")).default;
      render(<Home />);
      await userEvent.click(screen.getByText("📋 History"));
      const deleteBtns = screen.getAllByText("Delete");
      await userEvent.click(deleteBtns[0]);
      const confirmDeleteBtns = screen.getAllByText("Delete");
      await userEvent.click(confirmDeleteBtns[1]);

      expect(mockRemoveEntry).toHaveBeenCalledWith("entry-1");
    });
  });

  it("shows error message", async () => {
    mockUseJobAnalysis.mockReturnValue({
      result: null, loading: false, error: "API error occurred",
      analyze: vi.fn(), reset: vi.fn(), restore: vi.fn(),
    });
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    expect(screen.getByText("API error occurred")).toBeInTheDocument();
  });

  it("calls addHistoryEntry after successful analysis", async () => {
    localStorage.setItem("job-prep-ai-config", JSON.stringify({
      provider: "google", model: "gemini-2.5-flash", apiKeys: { google: "test-key" },
    }));
    const mockAddEntry = vi.fn();
    mockUseJobHistory.mockReturnValue({
      entries: [], addEntry: mockAddEntry, removeEntry: vi.fn(),
    });
    const mockAnalyze = vi.fn().mockResolvedValue({
      jobTitle: "Engineer",
      skills: [{ name: "React", category: "required" as const, context: "UI" }],
    });
    mockUseJobAnalysis.mockReturnValue({
      result: null, loading: false, error: null,
      analyze: mockAnalyze, reset: vi.fn(), restore: vi.fn(),
    });
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("Paste Text"));
    const textarea = screen.getByLabelText("Job description text");
    await userEvent.type(textarea, "We need a React developer");
    await userEvent.click(screen.getByText("Analyze with AI"));
    await vi.waitFor(() => {
      expect(mockAddEntry).toHaveBeenCalled();
    });
  });

  it("preserves ai config from localStorage", async () => {
    localStorage.setItem("job-prep-ai-config", JSON.stringify({
      provider: "openai", model: "gpt-4o", apiKeys: { openai: "saved-key" },
    }));
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("⚙️ Settings"));
    expect(screen.getByPlaceholderText("Enter your API key")).toHaveValue("saved-key");
    const select = screen.getAllByRole("combobox")[0];
    expect((select as HTMLSelectElement).value).toBe("openai");
  });

  it("handles corrupted localStorage ai config", async () => {
    localStorage.setItem("job-prep-ai-config", "{corrupted");
    const Home = (await import("@/app/page")).default;
    render(<Home />);
    await userEvent.click(screen.getByText("⚙️ Settings"));
    expect(screen.getByPlaceholderText("Enter your API key")).toHaveValue("");
    const select = screen.getAllByRole("combobox")[0];
    expect((select as HTMLSelectElement).value).toBe("google");
  });
});
