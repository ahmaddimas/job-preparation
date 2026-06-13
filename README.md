# Job Preparation Assistant

[![CI](https://github.com/ahmaddimas/job-preparation/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmaddimas/job-preparation/actions/workflows/ci.yml)
[![Deploy](https://github.com/ahmaddimas/job-preparation/actions/workflows/deploy.yml/badge.svg)](https://github.com/ahmaddimas/job-preparation/actions/workflows/deploy.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)]()

**Live:** [job-preparation.vercel.app](https://job-preparation-ahmaddimas-projects.vercel.app/)

AI-powered Next.js app that analyzes job postings and returns a skills checklist, tech stack breakdown, curated learning resources, a phased preparation roadmap, gap analysis against your skills, and AI-generated cover letters.

Supports Google Gemini, OpenAI, Anthropic, Groq, and OpenRouter. API keys are entered in the app's Settings modal and stored in the browser only.

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 |
| AI | Vercel AI SDK 6, Zod 4.4 (structured output) |
| Providers | Gemini, OpenAI, Anthropic, Groq, OpenRouter |
| Streaming | NDJSON via TransformStream |
| Testing | Vitest 4.1, Testing Library, jsdom |
| CI/CD | GitHub Actions + Vercel |
| Coverage | 100% line coverage (154+ tests) |

## Features

- **URL or text input** — paste a job listing URL or raw description
- **Real-time streaming** — results appear incrementally as the AI generates them
- **Skills checklist** — track your readiness with interactive checkboxes
- **Gap analysis** — compare your skills against job requirements for strong matches, partial matches, and concrete gaps
- **Cover letter generation** — AI-generated cover letter mapped to the job and your skills
- **Learning resources** — expandable resource cards per skill
- **Application tracker** — track each job through prepping → applied → phone screen → onsite → offer
- **Job history** — saved automatically; load or delete past analyses
- **Multiple AI providers** — switch between Gemini, OpenAI, Anthropic, Groq, OpenRouter
- **SSRF protection** — DNS-level private IP blocking for URL inputs

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your API key in Settings, paste a job URL or description.

Get a free Google Gemini key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Scripts

```bash
npm run dev           # dev server
npm run build         # production build
npm run lint          # ESLint
npm run type-check    # TypeScript check
npm run test:run      # run tests once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [CI/CD & Deployment setup](docs/DEPLOYMENT.md)

## License

MIT
