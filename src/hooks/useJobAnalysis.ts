"use client";

import { useState } from "react";
import type { JobAnalysis } from "@/lib/schema";
import type { AiConfig } from "@/lib/analyze";

interface AnalysisState {
  result: JobAnalysis | null;
  loading: boolean;
  error: string | null;
}

interface UseJobAnalysisReturn extends AnalysisState {
  analyze: (input: { url?: string; text?: string }, config: AiConfig) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook that encapsulates the job analysis API call and state.
 * Separates data-fetching concerns from the UI component.
 */
export function useJobAnalysis(): UseJobAnalysisReturn {
  const [state, setState] = useState<AnalysisState>({
    result: null,
    loading: false,
    error: null,
  });

  async function analyze(
    input: { url?: string; text?: string },
    config: AiConfig
  ): Promise<void> {
    setState({ result: null, loading: true, error: null });

    try {
      const response = await fetch("/api/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, aiConfig: config }),
      });

      const data = (await response.json()) as JobAnalysis & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to analyze job posting");
      }

      setState({ result: data, loading: false, error: null });
    } catch (err) {
      setState({
        result: null,
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Something went wrong while analyzing.",
      });
    }
  }

  function reset() {
    setState({ result: null, loading: false, error: null });
  }

  return { ...state, analyze, reset };
}
