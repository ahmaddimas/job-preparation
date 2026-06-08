export type JobAnalysis = {
  title: string;
  overview: string;
  requirements: string[];
  benefits: string[];
  hardSkills: string[];
  learningResources: { skill: string; title: string; url: string }[];
};

const headingMap: Record<"overview" | "requirements" | "benefits", string[]> = {
  overview: ["overview", "about", "job description", "about the role", "summary", "what you'll do"],
  requirements: ["requirements", "qualifications", "what we're looking for", "you have", "must have", "skills"],
  benefits: ["benefits", "perks", "what we offer", "compensation", "why join us"],
};

const skillPatterns: { skill: string; pattern: RegExp; resource: { title: string; url: string } }[] = [
  { skill: "JavaScript", pattern: /\bjavascript\b/i, resource: { title: "JavaScript Guide (MDN)", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" } },
  { skill: "TypeScript", pattern: /\btypescript\b/i, resource: { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/" } },
  { skill: "React", pattern: /\breact(?:\.js)?\b/i, resource: { title: "React Learn", url: "https://react.dev/learn" } },
  { skill: "Next.js", pattern: /\bnext(?:\.js)?\b/i, resource: { title: "Next.js Learn", url: "https://nextjs.org/learn" } },
  { skill: "Node.js", pattern: /\bnode(?:\.js)?\b/i, resource: { title: "Node.js Learn", url: "https://nodejs.org/en/learn" } },
  { skill: "Python", pattern: /\bpython\b/i, resource: { title: "Python Tutorial", url: "https://docs.python.org/3/tutorial/" } },
  { skill: "Java", pattern: /\bjava\b/i, resource: { title: "Java Tutorials", url: "https://dev.java/learn/" } },
  { skill: "Go", pattern: /\bgo(?:lang)?\b/i, resource: { title: "A Tour of Go", url: "https://go.dev/tour/" } },
  { skill: "SQL", pattern: /\bsql\b/i, resource: { title: "SQL Tutorial", url: "https://www.w3schools.com/sql/" } },
  { skill: "PostgreSQL", pattern: /\bpostgres(?:ql)?\b/i, resource: { title: "PostgreSQL Tutorial", url: "https://www.postgresql.org/docs/current/tutorial.html" } },
  { skill: "MySQL", pattern: /\bmysql\b/i, resource: { title: "MySQL Tutorial", url: "https://dev.mysql.com/doc/refman/8.0/en/tutorial.html" } },
  { skill: "MongoDB", pattern: /\bmongodb\b/i, resource: { title: "MongoDB University", url: "https://learn.mongodb.com/" } },
  { skill: "AWS", pattern: /\baws\b|amazon web services/i, resource: { title: "AWS Skill Builder", url: "https://skillbuilder.aws/" } },
  { skill: "Docker", pattern: /\bdocker\b/i, resource: { title: "Docker Get Started", url: "https://docs.docker.com/get-started/" } },
  { skill: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/i, resource: { title: "Kubernetes Basics", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" } },
  { skill: "Git", pattern: /\bgit\b/i, resource: { title: "Atlassian Git Tutorials", url: "https://www.atlassian.com/git/tutorials" } },
  { skill: "REST API", pattern: /\brest(?:ful)?\b|\bapi\b/i, resource: { title: "RESTful API Design", url: "https://restfulapi.net/" } },
  { skill: "GraphQL", pattern: /\bgraphql\b/i, resource: { title: "How to GraphQL", url: "https://www.howtographql.com/" } },
  { skill: "CI/CD", pattern: /\bci\/cd\b|\bcontinuous integration\b|\bcontinuous delivery\b/i, resource: { title: "CI/CD Explained", url: "https://www.redhat.com/en/topics/devops/what-is-ci-cd" } },
  { skill: "Testing", pattern: /\btest(?:ing)?\b|\bjest\b|\bcypress\b|\bplaywright\b/i, resource: { title: "Software Testing Fundamentals", url: "https://www.guru99.com/software-testing.html" } },
];

function cleanText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(p|div|li|br|ul|ol|section|article)[^>]*>/gi, "\n")
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, heading: string) => `\n[[heading]]${heading}\n`)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ");
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function toBulletList(text: string): string[] {
  return text
    .split(/[\n•]+/)
    .map(normalizeLine)
    .filter((line) => line.length > 20)
    .slice(0, 8);
}

function getHeadingType(heading: string): keyof typeof headingMap | undefined {
  const normalized = heading.toLowerCase();

  return (Object.keys(headingMap) as (keyof typeof headingMap)[]).find((type) =>
    headingMap[type].some((keyword) => normalized.includes(keyword)),
  );
}

function extractSections(html: string): {
  title: string;
  overview: string;
  requirements: string[];
  benefits: string[];
  fullText: string;
} {
  const text = cleanText(html);
  const lines = text.split("\n").map(normalizeLine).filter(Boolean);

  let title = "Job Opportunity";
  const sectionContent: Record<"overview" | "requirements" | "benefits", string[]> = {
    overview: [],
    requirements: [],
    benefits: [],
  };

  let currentSection: keyof typeof headingMap | undefined;

  for (const line of lines) {
    if (line.startsWith("[[heading]]")) {
      const heading = normalizeLine(line.replace("[[heading]]", ""));
      if (heading && title === "Job Opportunity") {
        title = heading;
      }
      currentSection = getHeadingType(heading);
      continue;
    }

    if (currentSection) {
      sectionContent[currentSection].push(line);
    }
  }

  const fullText = lines.join("\n");

  const requirements = sectionContent.requirements.length
    ? toBulletList(sectionContent.requirements.join("\n"))
    : toBulletList(
        lines
          .filter((line) => /require|qualification|experience|must|proficient|skill/i.test(line))
          .join("\n"),
      );

  const benefits = sectionContent.benefits.length
    ? toBulletList(sectionContent.benefits.join("\n"))
    : toBulletList(
        lines
          .filter((line) => /benefit|insurance|vacation|bonus|remote|allowance|pto|401\(k\)/i.test(line))
          .join("\n"),
      );

  const overview = sectionContent.overview.length
    ? sectionContent.overview.slice(0, 8).join(" ")
    : lines.slice(0, 12).join(" ");

  return { title, overview, requirements, benefits, fullText };
}

function extractHardSkills(fullText: string): string[] {
  const matches = skillPatterns
    .filter(({ pattern }) => pattern.test(fullText))
    .map(({ skill }) => skill);
  return Array.from(new Set(matches));
}

function buildResources(
  hardSkills: string[],
): { skill: string; title: string; url: string }[] {
  return hardSkills.map((skill) => {
    const source = skillPatterns.find((entry) => entry.skill === skill)?.resource;
    if (source) {
      return { skill, ...source };
    }

    return {
      skill,
      title: `${skill} learning resources`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${skill} learning path`)}`,
    };
  });
}

export function analyzeJobPosting(html: string): JobAnalysis {
  const { title, overview, requirements, benefits, fullText } = extractSections(html);
  const hardSkills = extractHardSkills(fullText);

  return {
    title,
    overview: overview || "No overview found in the job posting.",
    requirements,
    benefits,
    hardSkills,
    learningResources: buildResources(hardSkills),
  };
}
