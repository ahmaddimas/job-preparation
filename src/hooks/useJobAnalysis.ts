"use client";

import { useRef, useState } from "react";
import { jobAnalysisSchema } from "@/lib/schema";
import type { JobAnalysis } from "@/lib/schema";
import type { AiConfig } from "@/lib/analyze";

const THROTTLE_MS = 200;

interface AnalysisState {
  result: Partial<JobAnalysis> | null;
  loading: boolean;
  error: string | null;
}

interface UseJobAnalysisReturn extends AnalysisState {
  analyze: (input: { url?: string; text?: string; candidateSkills?: string }, config: AiConfig) => Promise<Partial<JobAnalysis> | null>;
  reset: () => void;
  restore: (data: Partial<JobAnalysis>) => void;
}

export function useJobAnalysis(): UseJobAnalysisReturn {
  const [state, setState] = useState<AnalysisState>({
    result: null,
    loading: false,
    error: null,
  });

  const lastUpdateRef = useRef(0);

  function throttledSetState(partial: Partial<JobAnalysis>) {
    const now = performance.now();
    if (now - lastUpdateRef.current >= THROTTLE_MS) {
      lastUpdateRef.current = now;
      setState((prev) => ({ ...prev, result: partial }));
    }
  }

  async function analyze(
    input: { url?: string; text?: string; candidateSkills?: string },
    config: AiConfig
  ): Promise<Partial<JobAnalysis> | null> {
    setState({ result: null, loading: true, error: null });
    lastUpdateRef.current = 0;

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
      let buffer = "";
      let finalResult: Partial<JobAnalysis> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);

            if (parsed.__type === "stream_complete") continue;
            if (parsed.__type === "stream_error") {
              throw new Error(parsed.error || "Stream processing failed on server");
            }

            const partial = parsed as Partial<JobAnalysis>;
            finalResult = partial;
            throttledSetState(partial);
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }
      }

      if (finalResult) {
        const parsed = jobAnalysisSchema.safeParse(finalResult);
        if (parsed.success) {
          parsed.data.learningResources?.sort((a, b) => a.roadmapOrder - b.roadmapOrder);
          setState({ result: parsed.data, loading: false, error: null });
          return parsed.data;
        }
        setState({ result: finalResult, loading: false, error: null });
        return finalResult;
      }

      setState({
        result: null,
        loading: false,
        error: "The selected model didn't return usable output. It may not support structured JSON responses. Try a different model.",
      });
      return null;
    } catch (err) {
      setState({
        result: null,
        loading: false,
        error: err instanceof Error ? err.message : "Something went wrong while analyzing.",
      });
      return null;
    }
  }

  function reset() {
    setState({ result: null, loading: false, error: null });
  }

  function restore(data: Partial<JobAnalysis>) {
    setState({ result: data, loading: false, error: null });
  }

  return { ...state, analyze, reset, restore };
}
