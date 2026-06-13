import type { JobAnalysis } from "./schema";

export type ApplicationStatus =
  | "prepping"
  | "applied"
  | "phone-screen"
  | "onsite"
  | "offer"
  | "rejected";

export interface HistoryEntry {
  id: string;
  jobTitle: string;
  companyName: string;
  timestamp: number;
  inputKey: string;
  result: Partial<JobAnalysis>;
  status: ApplicationStatus;
}

const STORAGE_KEY = "job-prep-history";

export function loadJobHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveJobHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* storage full */ }
}
