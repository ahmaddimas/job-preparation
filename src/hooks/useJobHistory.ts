"use client";

import { useState, useCallback } from "react";
import type { JobAnalysis } from "@/lib/schema";
import { loadJobHistory, saveJobHistory } from "@/lib/storage";
import type { HistoryEntry } from "@/lib/storage";

export type { HistoryEntry };

const MAX_ENTRIES = 50;

export function useJobHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(loadJobHistory);

  const addEntry = useCallback((inputKey: string, result: Partial<JobAnalysis>) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.inputKey !== inputKey);
      updated.unshift({
        id: crypto.randomUUID(),
        jobTitle: result.jobTitle ?? "Unknown",
        companyName: result.companyName ?? "Unknown",
        timestamp: Date.now(),
        inputKey,
        result,
      });
      const trimmed = updated.slice(0, MAX_ENTRIES);
      saveJobHistory(trimmed);
      return trimmed;
    });
  }, []);

  const removeEntry = useCallback((id: string): boolean => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return false;
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveJobHistory(updated);
      return updated;
    });
    return true;
  }, [entries]);

  return { entries, addEntry, removeEntry };
}
