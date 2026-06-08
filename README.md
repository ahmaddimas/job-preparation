# Job Preparation Assistant

[![CI](https://github.com/ahmaddimas/job-preparation/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmaddimas/job-preparation/actions/workflows/ci.yml)
[![Deploy](https://github.com/ahmaddimas/job-preparation/actions/workflows/deploy.yml/badge.svg)](https://github.com/ahmaddimas/job-preparation/actions/workflows/deploy.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)]()

**Live:** [job-preparation.vercel.app](https://job-preparation-ahmaddimas-projects.vercel.app/)

AI-powered Next.js app that analyzes job postings and returns a skills checklist, tech stack breakdown, curated learning resources, and a phased preparation roadmap.

Supports Google Gemini, OpenAI, Anthropic, Groq, and OpenRouter. API keys are entered in the app's Settings modal and stored in the browser only.

## Features

- **URL or text input** — paste a job listing URL or raw description
- **Real-time streaming** — results appear incrementally as the AI generates them
- **Skills checklist** — track your readiness with interactive checkboxes
- **Learning resources** — expandable resource cards per skill
- **Job history** — saved automatically; load or delete past analyses
- **Multiple AI providers** — switch between Gemini, OpenAI, Anthropic, Groq, OpenRouter
- **SSRF protection** — DNS-level private IP blocking for URL inputs

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your API key in ⚙️ Settings, paste a job URL or description.

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
