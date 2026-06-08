"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { useJobAnalysis } from "@/hooks/useJobAnalysis";
import { useJobHistory } from "@/hooks/useJobHistory";
import type { AiProvider, AiConfig } from "@/lib/analyze";

const DEFAULT_CONFIG: AiConfig = {
  provider: "google",
  model: "gemini-2.5-flash",
  apiKey: "",
};

export default function Home() {
  /* ── ai settings state ── */
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem("job-prep-ai-config");
      return saved ? (JSON.parse(saved) as AiConfig) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  /* ── form state ── */
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [checkedSkills, setCheckedSkills] = useState<Record<string, boolean>>({});
  const [expandedResources, setExpandedResources] = useState<Record<string, boolean>>({});

  const { result, loading, error, analyze, restore } = useJobAnalysis();
  const { entries: historyEntries, addEntry: addHistoryEntry, removeEntry: removeHistoryEntry } = useJobHistory();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  /* ── persist settings ── */
  useEffect(() => {
    localStorage.setItem("job-prep-ai-config", JSON.stringify(aiConfig));
  }, [aiConfig]);

  /* ── derived ── */
  const requiredSkills = useMemo(
    () => (result?.skills ?? []).filter((s) => s.category === "required"),
    [result]
  );
  const niceToHaveSkills = useMemo(
    () => (result?.skills ?? []).filter((s) => s.category === "nice-to-have"),
    [result]
  );
  const exceptionalSkills = useMemo(
    () => (result?.skills ?? []).filter((s) => s.category === "exceptional"),
    [result]
  );

  const totalSkills =
    requiredSkills.length + niceToHaveSkills.length + exceptionalSkills.length;
  const checkedCount = useMemo(
    () => Object.values(checkedSkills).filter(Boolean).length,
    [checkedSkills]
  );
  const progressPercent =
    totalSkills > 0 ? (checkedCount / totalSkills) * 100 : 0;

  /* ── helpers ── */
  function toggleSkill(name: string) {
    setCheckedSkills((prev) => ({ ...prev, [name]: !prev[name] }));
  }
  function toggleResource(skill: string) {
    setExpandedResources((prev) => ({ ...prev, [skill]: !prev[skill] }));
  }

  /* ── submit ── */
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!aiConfig.apiKey.trim()) {
      setIsSettingsOpen(true);
      return;
    }

    const isEmpty = inputMode === "url" ? !jobUrl.trim() : !jobText.trim();
    if (isEmpty) return;

    const input =
      inputMode === "url"
        ? { url: jobUrl.trim() }
        : { text: jobText.trim() };

    const analysisResult = await analyze(input, aiConfig);

    if (analysisResult) {
      const inputKey = inputMode === "url" ? jobUrl.trim() : jobText.trim().slice(0, 200);
      addHistoryEntry(inputKey, analysisResult);
      setCheckedSkills(
        Object.fromEntries((analysisResult.skills ?? []).map((s) => [s.name, false]))
      );
      setExpandedResources({});
    }
  }

  /* ── priority badge helper ── */
  function priorityBadge(priority: "critical" | "high" | "medium") {
    const map = {
      critical: "bg-red-500/20 text-red-300 border-red-500/30",
      high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    } as const;
    return (
      <span
        className={`ml-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[priority]}`}
      >
        {priority}
      </span>
    );
  }

  /* ── requirement type badge ── */
  function reqTypeBadge(type: string) {
    const map: Record<string, string> = {
      education: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      experience: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      certification: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      other: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    };
    return (
      <span
        className={`mr-2 inline-block shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          map[type] ?? map.other
        }`}
      >
        {type}
      </span>
    );
  }

  /* ── skill row ── */
  function skillRow(
    skill: { name: string; category: string; context: string },
    idx: number
  ) {
    const id = `skill-${skill.category}-${idx}`;
    return (
      <label
        key={id}
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-950/60 p-3 transition hover:bg-slate-950"
      >
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-indigo-500"
          checked={checkedSkills[skill.name] ?? false}
          onChange={() => toggleSkill(skill.name)}
        />
        <div className="min-w-0">
          <span className="text-sm font-medium text-slate-100">
            {skill.name}
          </span>
          <p className="mt-0.5 text-xs text-slate-400">{skill.context}</p>
        </div>
      </label>
    );
  }

  /* ── section count ── */
  function sectionCount(skills: { name: string }[]) {
    const done = skills.filter((s) => checkedSkills[s.name]).length;
    return (
      <span className="text-xs text-slate-400">
        {done}/{skills.length}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:px-10">
        {/* ── Header ── */}
        <section
          id="header"
          className="relative animate-fade-in rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 p-6 text-white shadow-lg md:p-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Job Preparation Assistant
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed opacity-95 md:text-base">
                Paste a job URL or description to extract role details, identify
                technical skills, and get an AI-powered learning roadmap.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur transition hover:bg-white/30"
              >
                📋 History
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur transition hover:bg-white/30"
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        </section>

        {/* ── Settings Modal ── */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-100">
                  AI Settings
                </h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Provider
                  </label>
                  <select
                    value={aiConfig.provider}
                    onChange={(e) =>
                      setAiConfig({
                        ...aiConfig,
                        provider: e.target.value as AiProvider,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                  >
                    <option value="google">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="groq">Groq</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </div>
                
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Model
                  </label>
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, model: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                    placeholder="e.g. gemini-2.5-flash, gpt-4o-mini"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, apiKey: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                    placeholder="Enter your API key"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Stored locally in your browser.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Input Section ── */}
        <section
          id="input-section"
          className="animate-fade-in rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-md"
        >
          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-xl bg-slate-950 p-1">
            <button
              id="tab-url"
              type="button"
              onClick={() => setInputMode("url")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                inputMode === "url"
                  ? "bg-indigo-500 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Paste URL
            </button>
            <button
              id="tab-text"
              type="button"
              onClick={() => setInputMode("text")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                inputMode === "text"
                  ? "bg-indigo-500 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Paste Text
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {inputMode === "url" ? (
              <input
                id="input-url"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none ring-indigo-400 placeholder:text-slate-500 focus:ring-2"
                type="url"
                inputMode="url"
                placeholder="https://company.com/careers/software-engineer"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                aria-label="Job URL"
              />
            ) : (
              <textarea
                id="input-text"
                className="min-h-[160px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-relaxed outline-none ring-indigo-400 placeholder:text-slate-500 focus:ring-2"
                placeholder="Paste the full job description here..."
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                aria-label="Job description text"
              />
            )}

            <button
              id="btn-submit"
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg
                    className="size-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Analyzing...
                </>
              ) : (
                "Analyze with AI"
              )}
            </button>
          </form>

          {error && (
            <p id="error-message" className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}
        </section>

        {/* ── Skeleton Loading ── */}
        {loading && !result?.jobTitle && (
          <section
            id="skeleton-section"
            className="grid gap-5 md:grid-cols-2"
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                id={`skeleton-card-${i}`}
                className="skeleton h-44 rounded-2xl"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </section>
        )}

        {/* ── Results ── */}
        {result && result.jobTitle && (
          <section id="results-section" className="grid gap-5 md:grid-cols-2">
            {/* 1 ── Role Overview */}
            <Card id="card-role-overview" delay={0}>
              <h2 className="text-lg font-semibold text-cyan-300">
                Role Overview
              </h2>
              <h3 className="mt-3 text-xl font-bold text-slate-50">
                {result.jobTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                {result.companyName}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[result.location, result.employmentType]
                  .filter(Boolean)
                  .map((meta, index) => (
                    <span
                      key={`${meta}-${index}`}
                      className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300"
                    >
                      {meta}
                    </span>
                  ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                {result.overview}
              </p>
            </Card>

            {/* 2 ── Candidate Profile */}
            <Card id="card-candidate-profile" delay={80}>
              <h2 className="text-lg font-semibold text-cyan-300">
                Candidate Profile
              </h2>
              <h3 className="mt-3 text-base font-bold text-slate-50">
                {result.candidateProfile?.seniorityLevel}{" "}
                {result.candidateProfile?.roleType}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {result.candidateProfile?.teamContext}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {result.candidateProfile?.summary}
              </p>
            </Card>

            {/* 3 ── Tech Stack */}
            <Card id="card-tech-stack" delay={160}>
              <h2 className="text-lg font-semibold text-cyan-300">
                Tech Stack
              </h2>
              <div className="mt-3 space-y-4">
                {(Array.isArray(result.techStack) ? result.techStack : []).map((group, gi) => (
                  <div key={group.category || `tc-${gi}`}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {group.category}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(group.technologies) ? group.technologies : []).map((tech, ti) => (
                        <span
                          key={tech || `t-${ti}`}
                          className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 4 ── Skills Checklist */}
            <Card id="card-skills-checklist" delay={240}>
              <h2 className="text-lg font-semibold text-cyan-300">
                Skills Checklist
              </h2>

              {/* Overall progress */}
              <div className="mt-3 mb-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Overall: {checkedCount}/{totalSkills}
                  </span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Required */}
              {requiredSkills.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                     <h4 className="text-sm font-semibold text-slate-200">
                      ✅ Required
                    </h4>
                    {sectionCount(requiredSkills)}
                  </div>
                  <div className="space-y-1.5">
                    {requiredSkills.map((s, i) => skillRow(s, i))}
                  </div>
                </div>
              )}

              {/* Nice to Have */}
              {niceToHaveSkills.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-200">
                      🟡 Nice to Have
                    </h4>
                    {sectionCount(niceToHaveSkills)}
                  </div>
                  <div className="space-y-1.5">
                    {niceToHaveSkills.map((s, i) => skillRow(s, i))}
                  </div>
                </div>
              )}

              {/* Exceptional */}
              {exceptionalSkills.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-200">
                      🌟 Exceptional
                    </h4>
                    {sectionCount(exceptionalSkills)}
                  </div>
                  <div className="space-y-1.5">
                    {exceptionalSkills.map((s, i) => skillRow(s, i))}
                  </div>
                </div>
              )}
            </Card>

            {/* 5 ── Requirements */}
            <Card id="card-requirements" delay={320}>
              <h2 className="text-lg font-semibold text-cyan-300">
                Requirements
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {(Array.isArray(result.requirements) ? result.requirements : []).length > 0 ? (
                  (Array.isArray(result.requirements) ? result.requirements : []).map((req, i) => (
                    <li key={i} className="flex items-start gap-1">
                      {reqTypeBadge(req.type)}
                      <span>{req.text}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">
                    No specific requirements extracted.
                  </li>
                )}
              </ul>
            </Card>

            {/* 6 ── Responsibilities */}
            <Card id="card-responsibilities" delay={400}>
              <h2 className="text-lg font-semibold text-cyan-300">
                Responsibilities
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
                {(Array.isArray(result.responsibilities) ? result.responsibilities : []).length > 0 ? (
                  (Array.isArray(result.responsibilities) ? result.responsibilities : []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))
                ) : (
                  <li className="text-slate-500">
                    No responsibilities listed.
                  </li>
                )}
              </ul>
            </Card>

            {/* 7 ── Benefits */}
            <Card id="card-benefits" delay={480}>
              <h2 className="text-lg font-semibold text-cyan-300">Benefits</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
                {(Array.isArray(result.benefits) ? result.benefits : []).length > 0 ? (
                  (Array.isArray(result.benefits) ? result.benefits : []).map((item, i) => <li key={i}>{item}</li>)
                ) : (
                  <li className="text-slate-500">
                    No benefits section found.
                  </li>
                )}
              </ul>
            </Card>

            {/* 8 ── Red Flags (conditional) */}
            {(Array.isArray(result.redFlags) ? result.redFlags : []).length > 0 && (
              <Card
                id="card-red-flags"
                delay={560}
                className="border-amber-500/30 bg-amber-500/5"
              >
                <h2 className="text-lg font-semibold text-amber-300">
                  ⚠️ Red Flags
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-200/80">
                  {(Array.isArray(result.redFlags) ? result.redFlags : []).map((flag, i) => (
                     <li key={i}>{flag}</li>
                  ))}
                </ul>
              </Card>
            )}

            {/* 9 ── Learning Resources (full width) */}
            <Card
              id="card-learning-resources"
              delay={640}
              className="md:col-span-2"
            >
              <h2 className="text-lg font-semibold text-cyan-300">
                Learning Resources
              </h2>
              <div className="mt-4 space-y-2">
                {(Array.isArray(result.learningResources) ? result.learningResources : []).length > 0 ? (
                  (Array.isArray(result.learningResources) ? result.learningResources : []).map((lr, i) => {
                    const isOpen = expandedResources[lr.skill] ?? false;
                    return (
                      <div
                        key={lr.skill || `lr-${i}`}
                        className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50"
                      >
                        <button
                          id={`lr-toggle-${i}`}
                          type="button"
                          onClick={() => toggleResource(lr.skill)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-800/50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-indigo-400">
                              #{lr.roadmapOrder}
                            </span>
                            <span className="text-sm font-medium text-slate-100">
                              {lr.skill}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              ~{lr.estimatedHours}
                            </span>
                            <svg
                              className={`size-4 text-slate-400 transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="space-y-2 border-t border-slate-800 px-4 py-3">
                            {(Array.isArray(lr.resources) ? lr.resources : []).map((res, ri) => (
                              <div
                                key={ri}
                                className="flex flex-wrap items-center gap-2 text-sm"
                              >
                                <a
                                  id={`lr-link-${i}-${ri}`}
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-300 underline decoration-indigo-600/50 underline-offset-2 hover:text-indigo-200"
                                >
                                  {res.title}
                                </a>
                                <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-400">
                                  {res.type}
                                </span>
                                <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-400">
                                  {res.difficulty}
                                </span>
                                <span
                                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                    res.isFree
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                      : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                  }`}
                                >
                                  {res.isFree ? "Free" : "Paid"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">
                    Learning resources will appear after skills are detected.
                  </p>
                )}
              </div>
            </Card>

            {/* 10 ── Preparation Roadmap (full width) */}
            <Card
              id="card-preparation-roadmap"
              delay={720}
              className="md:col-span-2"
            >
              <h2 className="text-lg font-semibold text-cyan-300">
                Preparation Roadmap
              </h2>
              <div className="mt-4 space-y-5">
                {(Array.isArray(result.preparationRoadmap) ? result.preparationRoadmap : []).map((phase, pi) => (
                  <div key={pi}>
                    <h3 className="flex items-center text-sm font-bold text-slate-100">
                      {phase.phase}
                      {priorityBadge(phase.priority)}
                    </h3>
                    <ul className="mt-2 space-y-1.5 pl-1">
                      {(Array.isArray(phase.tasks) ? phase.tasks : []).map((task, ti) => (
                        <li
                          key={ti}
                          className="flex items-start gap-2.5 text-sm text-slate-300"
                        >
                          <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-800 text-[10px] text-slate-500">
                            ✓
                          </span>
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        {/* ── History Panel ── */}
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg max-h-[80vh] rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-100">
                  Job History
                </h2>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {historyEntries.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No saved analyses yet. Results are saved automatically.
                </p>
              ) : (
                <div className="space-y-2">
                  {historyEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {entry.jobTitle}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {entry.companyName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const skills = entry.result.skills ?? [];
                          setCheckedSkills(Object.fromEntries(skills.map((s) => [s.name, false])));
                          setExpandedResources({});
                          restore(entry.result);
                          setIsHistoryOpen(false);
                        }}
                        className="shrink-0 rounded-lg bg-indigo-500/20 px-2.5 py-1 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/30"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(entry.id)}
                        className="shrink-0 rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Delete Confirmation ── */}
        {pendingDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-100">Delete Analysis</h3>
              <p className="mt-2 text-sm text-slate-400">
                Are you sure you want to delete this analysis from history?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setPendingDeleteId(null)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeHistoryEntry(pendingDeleteId);
                    setPendingDeleteId(null);
                  }}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
