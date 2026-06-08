import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useJobHistory } from "@/hooks/useJobHistory";

const mockAnalysis = {
  jobTitle: "Software Engineer",
  companyName: "Acme Corp",
  skills: [{ name: "React", category: "required" as const, context: "UI" }],
  location: "Remote",
  employmentType: "Full-time",
  overview: "Test",
  candidateProfile: { seniorityLevel: "Mid", roleType: "Engineer", teamContext: "Team", summary: "Summary" },
  techStack: [],
  requirements: [],
  responsibilities: [],
  benefits: [],
  redFlags: [],
  learningResources: [],
  preparationRoadmap: [],
};

describe("useJobHistory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with empty entries", () => {
    const { result } = renderHook(() => useJobHistory());
    expect(result.current.entries).toEqual([]);
  });

  it("adds an entry", () => {
    const { result } = renderHook(() => useJobHistory());
    act(() => {
      result.current.addEntry("url-1", mockAnalysis);
    });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].jobTitle).toBe("Software Engineer");
    expect(result.current.entries[0].companyName).toBe("Acme Corp");
  });

  it("deduplicates by inputKey (replaces existing)", () => {
    const { result } = renderHook(() => useJobHistory());
    act(() => {
      result.current.addEntry("same-key", { ...mockAnalysis, jobTitle: "First" });
    });
    act(() => {
      result.current.addEntry("same-key", { ...mockAnalysis, jobTitle: "Second" });
    });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].jobTitle).toBe("Second");
  });

  it("keeps separate entries for different inputKeys", () => {
    const { result } = renderHook(() => useJobHistory());
    act(() => {
      result.current.addEntry("url-a", mockAnalysis);
    });
    act(() => {
      result.current.addEntry("url-b", { ...mockAnalysis, jobTitle: "Engineer B" });
    });
    expect(result.current.entries).toHaveLength(2);
  });

  it("newest entry is first", () => {
    const { result } = renderHook(() => useJobHistory());
    act(() => {
      result.current.addEntry("url-a", { ...mockAnalysis, jobTitle: "Older" });
    });
    act(() => {
      result.current.addEntry("url-b", { ...mockAnalysis, jobTitle: "Newer" });
    });
    expect(result.current.entries[0].jobTitle).toBe("Newer");
  });

  it("removes an existing entry and returns true", () => {
    const { result } = renderHook(() => useJobHistory());
    act(() => {
      result.current.addEntry("key", mockAnalysis);
    });
    let id: string;
    act(() => {
      id = result.current.entries[0].id;
    });
    let removed: boolean;
    act(() => {
      removed = result.current.removeEntry(id);
    });
    expect(removed!).toBe(true);
    expect(result.current.entries).toHaveLength(0);
  });

  it("returns false when removing non-existent entry", () => {
    const { result } = renderHook(() => useJobHistory());
    let removed: boolean;
    act(() => {
      removed = result.current.removeEntry("non-existent");
    });
    expect(removed!).toBe(false);
  });

  it("uses default values for missing jobTitle and companyName", () => {
    const { result } = renderHook(() => useJobHistory());
    act(() => {
      result.current.addEntry("key", { ...mockAnalysis, jobTitle: undefined as unknown as string, companyName: undefined as unknown as string });
    });
    expect(result.current.entries[0].jobTitle).toBe("Unknown");
    expect(result.current.entries[0].companyName).toBe("Unknown");
  });

  it("generates a unique id for each entry", () => {
    const { result } = renderHook(() => useJobHistory());
    act(() => {
      result.current.addEntry("a", mockAnalysis);
      result.current.addEntry("b", { ...mockAnalysis, jobTitle: "B" });
    });
    expect(result.current.entries[0].id).not.toBe(result.current.entries[1].id);
  });

  it("persists entries to localStorage", () => {
    const { result, unmount } = renderHook(() => useJobHistory());
    act(() => {
      result.current.addEntry("key", mockAnalysis);
    });
    unmount();
    const raw = localStorage.getItem("job-prep-history");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].jobTitle).toBe("Software Engineer");
  });

  it("restores entries from localStorage on mount", () => {
    const entry = {
      id: "preloaded",
      jobTitle: "Preloaded",
      companyName: "Test",
      timestamp: Date.now(),
      inputKey: "pre",
      result: mockAnalysis,
    };
    localStorage.setItem("job-prep-history", JSON.stringify([entry]));
    const { result } = renderHook(() => useJobHistory());
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].jobTitle).toBe("Preloaded");
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("job-prep-history", "not-valid-json");
    const { result } = renderHook(() => useJobHistory());
    expect(result.current.entries).toEqual([]);
  });

  it("limits entries to MAX_ENTRIES", () => {
    const { result } = renderHook(() => useJobHistory());
    const manyEntries = Array.from({ length: 60 }, (_, i) => ({
      ...mockAnalysis,
      jobTitle: `Job ${i}`,
    }));
    act(() => {
      manyEntries.forEach((entry, i) => {
        result.current.addEntry(`key-${i}`, entry);
      });
    });
    expect(result.current.entries.length).toBeLessThanOrEqual(50);
  });
});
