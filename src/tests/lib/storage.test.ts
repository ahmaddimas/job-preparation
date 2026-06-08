import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadJobHistory, saveJobHistory } from "@/lib/storage";

beforeEach(() => {
  localStorage.clear();
});

describe("loadJobHistory", () => {
  it("returns empty array when no stored data", () => {
    const result = loadJobHistory();
    expect(result).toEqual([]);
  });

  it("returns parsed entries from localStorage", () => {
    const data = [{ id: "1", jobTitle: "Engineer" }];
    localStorage.setItem("job-prep-history", JSON.stringify(data));
    const result = loadJobHistory();
    expect(result).toEqual(data);
  });

  it("returns empty array on corrupted data", () => {
    localStorage.setItem("job-prep-history", "not-json");
    const result = loadJobHistory();
    expect(result).toEqual([]);
  });

  it("handles SSR when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    try {
      const result = loadJobHistory();
      expect(result).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("saveJobHistory", () => {
  it("persists entries to localStorage", () => {
    const entries = [{ id: "1", jobTitle: "Test" }] as never[];
    saveJobHistory(entries);
    const raw = localStorage.getItem("job-prep-history");
    expect(raw).toBe(JSON.stringify(entries));
  });

  it("handles storage full errors", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const entries = [{ id: "1", jobTitle: "Test" }] as never[];
    expect(() => saveJobHistory(entries)).not.toThrow();
    setItemSpy.mockRestore();
  });
});
