"use client";

import { useState } from "react";
import { parsePartialJson } from "ai";
import type { JobAnalysis } from "@/lib/schema";
import type { AiConfig } from "@/lib/analyze";

interface AnalysisState {
  result: Partial<JobAnalysis> | null;
  loading: boolean;
  error: string | null;
}

interface UseJobAnalysisReturn extends AnalysisState {
  analyze: (input: { url?: string; text?: string }, config: AiConfig) => Promise<void>;
  reset: () => void;
}

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

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to analyze job posting");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });

        // parsePartialJson tolerates incomplete JSON from the stream
        const { value: partial, state: parseState } = parsePartialJson(accumulated);
        if (parseState !== "failed" && partial) {
          setState((prev) => ({ ...prev, result: partial as Partial<JobAnalysis> }));
        }
      }

      // Final parse on complete response
      const { value: final } = parsePartialJson(accumulated);
      if (final) {
        const finalResult = final as JobAnalysis;
        // Sort learning resources by roadmap order
        finalResult.learningResources?.sort((a, b) => a.roadmapOrder - b.roadmapOrder);
        setState({ result: finalResult, loading: false, error: null });
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch (err) {
      setState({
        result: null,
        loading: false,
        error: err instanceof Error ? err.message : "Something went wrong while analyzing.",
      });
    }
  }

  function reset() {
    setState({ result: null, loading: false, error: null });
  }

  return { ...state, analyze, reset };
}
