# Architecture

## Project structure

```
src/
├── app/
│   ├── api/analyze-job/route.ts   # POST endpoint
│   ├── page.tsx                   # Main UI
│   ├── layout.tsx                 # Root layout
│   └── globals.css
├── components/
│   └── Card.tsx                   # Reusable animated card
├── hooks/
│   └── useJobAnalysis.ts          # API call + state
├── lib/
│   ├── analyze.ts                 # AI orchestration
│   ├── html-cleaner.ts            # HTML → plain text
│   └── schema.ts                  # Zod schemas + types
└── tests/
    ├── lib/
    └── api/
```

## API route `/api/analyze-job`

1. Validates request (API key present, URL or text provided)
2. For URLs: DNS-resolves the hostname, blocks private/local IPs (SSRF protection), fetches via [Jina Reader](https://jina.ai/reader/) to handle JS-heavy SPAs
3. Truncates content to 50k chars before sending to AI
4. Returns structured `JobAnalysis` JSON validated by Zod

## AI provider strategy pattern

`src/lib/analyze.ts` uses a registry of factory functions instead of a switch statement. Adding a provider is a single entry:

```typescript
const providerStrategies: Record<AiProvider, ModelFactory> = {
  google: async (apiKey, model) => { ... },
  openai: async (apiKey, model) => { ... },
  // new provider goes here
};
```

## `useJobAnalysis` hook

Separates fetch logic from the UI. The page component only calls `analyze()` and reads `{ result, loading, error }`.

## Schema validation

All AI output passes through a Zod schema before reaching the UI — type safety across the AI boundary.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5 |
| AI | Vercel AI SDK + Zod |
| Testing | Vitest, Testing Library |
| CI/CD | GitHub Actions + Vercel |
