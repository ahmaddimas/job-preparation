"use client";

import { useState, useCallback } from "react";
import type { JobAnalysis } from "@/lib/schema";
import { loadJobHistory, saveJobHistory } from "@/lib/storage";
import type { HistoryEntry, ApplicationStatus } from "@/lib/storage";

export type { HistoryEntry, ApplicationStatus };

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
        status: "prepping",
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

  const updateStatus = useCallback((id: string, status: ApplicationStatus) => {
    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, status } : e
      );
      saveJobHistory(updated);
      return updated;
    });
  }, []);

  return { entries, addEntry, removeEntry, updateStatus };
}
