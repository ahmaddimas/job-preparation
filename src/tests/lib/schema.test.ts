import { describe, it, expect } from "vitest";
import { jobAnalysisSchema, learningResourceSchema, skillLearningSchema } from "@/lib/schema";

const validResource = {
  title: "React Docs",
  url: "https://react.dev",
  type: "documentation" as const,
  difficulty: "beginner" as const,
  isFree: true,
};

const validSkillLearning = {
  skill: "React",
  resources: [validResource],
  roadmapOrder: 1,
  estimatedHours: "10-20 hours",
};

const validJobAnalysis = {
  jobTitle: "Software Engineer",
  companyName: "Acme Corp",
  location: "Remote",
  employmentType: "Full-time",
  overview: "Build scalable web applications.",
  candidateProfile: {
    seniorityLevel: "Mid-Level",
    roleType: "Full-Stack Developer",
    teamContext: "Small team of 5",
    summary: "Pragmatic developer who ships fast.",
  },
  techStack: [{ category: "Frontend", technologies: ["React", "TypeScript"] }],
  skills: [{ name: "React", category: "required" as const, context: "Core UI framework" }],
  requirements: [{ text: "3+ years experience", type: "experience" as const }],
  responsibilities: ["Build features", "Write tests"],
  benefits: ["Remote work", "Health insurance"],
  redFlags: [],
  learningResources: [validSkillLearning],
  preparationRoadmap: [
    { phase: "Week 1-2: React", tasks: ["Read docs", "Build demo"], priority: "critical" as const },
  ],
};

describe("learningResourceSchema", () => {
  it("accepts valid resource", () => {
    expect(() => learningResourceSchema.parse(validResource)).not.toThrow();
  });

  it("rejects invalid URL", () => {
    expect(() =>
      learningResourceSchema.parse({ ...validResource, url: "not-a-url" })
    ).toThrow();
  });

  it("rejects unknown resource type", () => {
    expect(() =>
      learningResourceSchema.parse({ ...validResource, type: "book" })
    ).toThrow();
  });

  it("rejects unknown difficulty", () => {
    expect(() =>
      learningResourceSchema.parse({ ...validResource, difficulty: "expert" })
    ).toThrow();
  });
});

describe("skillLearningSchema", () => {
  it("accepts valid skill learning entry", () => {
    expect(() => skillLearningSchema.parse(validSkillLearning)).not.toThrow();
  });

  it("rejects empty resources array", () => {
    expect(() =>
      skillLearningSchema.parse({ ...validSkillLearning, resources: [] })
    ).toThrow();
  });

  it("rejects more than 4 resources", () => {
    const tooMany = Array(5).fill(validResource);
    expect(() =>
      skillLearningSchema.parse({ ...validSkillLearning, resources: tooMany })
    ).toThrow();
  });
});

describe("jobAnalysisSchema", () => {
  it("parses a complete valid job analysis", () => {
    const result = jobAnalysisSchema.parse(validJobAnalysis);
    expect(result.jobTitle).toBe("Software Engineer");
    expect(result.skills).toHaveLength(1);
    expect(result.redFlags).toHaveLength(0);
  });

  it("rejects invalid skill category", () => {
    const bad = {
      ...validJobAnalysis,
      skills: [{ name: "React", category: "optional", context: "UI" }],
    };
    expect(() => jobAnalysisSchema.parse(bad)).toThrow();
  });

  it("rejects invalid requirement type", () => {
    const bad = {
      ...validJobAnalysis,
      requirements: [{ text: "Degree required", type: "degree" }],
    };
    expect(() => jobAnalysisSchema.parse(bad)).toThrow();
  });

  it("rejects invalid roadmap priority", () => {
    const bad = {
      ...validJobAnalysis,
      preparationRoadmap: [{ phase: "Week 1", tasks: ["Task"], priority: "urgent" }],
    };
    expect(() => jobAnalysisSchema.parse(bad)).toThrow();
  });

  it("allows empty arrays for optional list fields", () => {
    const result = jobAnalysisSchema.parse({
      ...validJobAnalysis,
      benefits: [],
      redFlags: [],
      responsibilities: [],
    });
    expect(result.benefits).toEqual([]);
  });
});
