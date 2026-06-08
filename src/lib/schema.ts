import { z } from "zod";

export const learningResourceSchema = z.object({
  title: z.string().describe("Name of the resource"),
  url: z.string().url().describe("Direct URL to the resource"),
  type: z
    .enum(["documentation", "course", "tutorial", "practice", "video"])
    .describe("Type of learning resource"),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .describe("Difficulty level"),
  isFree: z.boolean().describe("Whether the resource is free to access"),
});

export const skillLearningSchema = z.object({
  skill: z.string().describe("The technical skill name"),
  resources: z
    .array(learningResourceSchema)
    .min(1)
    .max(4)
    .describe("Curated learning resources for this skill, ordered by relevance"),
  roadmapOrder: z
    .number()
    .int()
    .positive()
    .describe("Suggested learning sequence order (1 = learn first)"),
  estimatedHours: z
    .string()
    .describe("Rough time estimate to reach competency, e.g. '10-20 hours'"),
});

export const jobAnalysisSchema = z.object({
  jobTitle: z.string().describe("Exact job title from the posting"),
  companyName: z
    .string()
    .describe("Company name, or 'Not specified' if not found"),
  location: z
    .string()
    .describe("Job location or 'Remote' or 'Not specified'"),
  employmentType: z
    .string()
    .describe("Full-time, Part-time, Contract, etc. or 'Not specified'"),
  overview: z
    .string()
    .describe(
      "Concise 2-4 sentence summary of the role and what the person will do day-to-day"
    ),

  candidateProfile: z.object({
    seniorityLevel: z
      .string()
      .describe("e.g. 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal'"),
    roleType: z
      .string()
      .describe(
        "e.g. 'Full-Stack Developer', 'Backend Engineer', 'DevOps Engineer'"
      ),
    teamContext: z
      .string()
      .describe(
        "Team size, structure, who this person reports to, and collaboration expectations"
      ),
    summary: z
      .string()
      .describe(
        "Direct description of the ideal candidate: what kind of programmer, mindset, working style, and domain expertise the company wants"
      ),
  }),

  techStack: z
    .array(
      z.object({
        category: z
          .string()
          .describe(
            "e.g. 'Frontend', 'Backend', 'Database', 'DevOps', 'Cloud', 'Testing', 'Tools'"
          ),
        technologies: z
          .array(z.string())
          .describe("List of specific technologies in this category"),
      })
    )
    .describe("Company tech stack grouped by category"),

  skills: z
    .array(
      z.object({
        name: z.string().describe("Skill or technology name"),
        category: z
          .enum(["required", "nice-to-have", "exceptional"])
          .describe(
            "'required' = must have, 'nice-to-have' = optional/preferred, 'exceptional' = bonus/standout"
          ),
        context: z
          .string()
          .describe("Brief explanation of why this skill matters for the role"),
      })
    )
    .describe("All skills mentioned, categorized by priority"),

  requirements: z
    .array(
      z.object({
        text: z.string().describe("The requirement text"),
        type: z
          .enum(["education", "experience", "certification", "other"])
          .describe("Type of requirement"),
      })
    )
    .describe("Non-skill requirements like education, years of experience"),

  responsibilities: z
    .array(z.string())
    .describe("Key job responsibilities and duties"),

  benefits: z.array(z.string()).describe("Benefits and perks offered"),

  redFlags: z
    .array(z.string())
    .describe(
      "Potential concerns: vague descriptions, unrealistic expectations, mismatched seniority/requirements, buzzword overload. Empty array if none."
    ),

  learningResources: z
    .array(skillLearningSchema)
    .describe(
      "Learning resources for each required and nice-to-have skill, ordered by roadmapOrder"
    ),

  preparationRoadmap: z
    .array(
      z.object({
        phase: z
          .string()
          .describe("e.g. 'Week 1-2: Core Language Skills'"),
        tasks: z
          .array(z.string())
          .describe("Specific preparation tasks for this phase"),
        priority: z
          .enum(["critical", "high", "medium"])
          .describe("Priority level of this phase"),
      })
    )
    .describe(
      "Phased preparation plan, ordered chronologically, covering 4-8 weeks"
    ),
});

export type JobAnalysis = z.infer<typeof jobAnalysisSchema>;
export type LearningResource = z.infer<typeof learningResourceSchema>;
export type SkillLearning = z.infer<typeof skillLearningSchema>;
