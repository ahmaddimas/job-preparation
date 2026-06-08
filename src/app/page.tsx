"use client";

import { FormEvent, useMemo, useState } from "react";

type LearningResource = {
  skill: string;
  title: string;
  url: string;
};

type AnalysisResult = {
  title: string;
  overview: string;
  requirements: string[];
  benefits: string[];
  hardSkills: string[];
  learningResources: LearningResource[];
};

export default function Home() {
  const [jobUrl, setJobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [checkedSkills, setCheckedSkills] = useState<Record<string, boolean>>({});

  const completionCount = useMemo(
    () => Object.values(checkedSkills).filter(Boolean).length,
    [checkedSkills],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUrl = jobUrl.trim();
    if (!trimmedUrl) {
      setError("Please enter a job URL.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = (await response.json()) as AnalysisResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to analyze job posting");
      }

      setResult(data);
      setCheckedSkills(
        Object.fromEntries((data.hardSkills ?? []).map((skill) => [skill, false])),
      );
    } catch (submitError) {
      setResult(null);
      setCheckedSkills({});
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while analyzing the URL.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 p-6 text-white shadow-lg">
          <h1 className="text-2xl font-semibold md:text-3xl">Job Preparation Assistant</h1>
          <p className="mt-2 text-sm opacity-95 md:text-base">
            Paste a job URL to extract role details, identify technical hard skills,
            and get curated learning resources.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-md">
          <form onSubmit={onSubmit} className="flex flex-col gap-4 md:flex-row">
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none ring-indigo-400 placeholder:text-slate-500 focus:ring-2"
              type="url"
              inputMode="url"
              placeholder="https://company.com/careers/software-engineer"
              value={jobUrl}
              onChange={(event) => setJobUrl(event.target.value)}
              aria-label="Job URL"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Analyzing..." : "Analyze Job"}
            </button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </section>

        {result ? (
          <section className="grid gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-cyan-300">Role Overview</h2>
              <h3 className="mt-3 text-base font-medium">{result.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{result.overview}</p>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-cyan-300">Hard Skills Checklist</h2>
              <p className="mt-1 text-xs text-slate-400">
                Progress: {completionCount}/{result.hardSkills.length} completed
              </p>
              <div className="mt-3 space-y-2">
                {result.hardSkills.length ? (
                  result.hardSkills.map((skill) => (
                    <label key={skill} className="flex items-center gap-3 rounded-lg bg-slate-950 p-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-indigo-500"
                        checked={checkedSkills[skill] ?? false}
                        onChange={(event) =>
                          setCheckedSkills((current) => ({
                            ...current,
                            [skill]: event.target.checked,
                          }))
                        }
                      />
                      <span>{skill}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No technical hard skills were confidently detected.</p>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-cyan-300">Requirements</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
                {result.requirements.length ? (
                  result.requirements.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>Requirements could not be extracted clearly from this page.</li>
                )}
              </ul>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-cyan-300">Benefits</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
                {result.benefits.length ? (
                  result.benefits.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>Benefits section was not found or is limited on the source page.</li>
                )}
              </ul>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:col-span-2">
              <h2 className="text-lg font-semibold text-cyan-300">Recommended Learning Resources</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {result.learningResources.length ? (
                  result.learningResources.map((resource) => (
                    <li key={`${resource.skill}-${resource.url}`}>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-300 underline decoration-indigo-600/70 underline-offset-2 hover:text-indigo-200"
                      >
                        {resource.title}
                      </a>{" "}
                      <span className="text-slate-400">for {resource.skill}</span>
                    </li>
                  ))
                ) : (
                  <li>Learning resources will appear after technical skills are detected.</li>
                )}
              </ul>
            </article>
          </section>
        ) : null}
      </main>
    </div>
  );
}
