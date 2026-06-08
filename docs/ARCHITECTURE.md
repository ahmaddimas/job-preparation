# Architecture

## Project structure

```
src/
├── app/
│   ├── api/analyze-job/route.ts   # POST endpoint (NDJSON stream)
│   ├── page.tsx                   # Main UI (results, history, settings)
│   ├── layout.tsx                 # Root layout
│   └── globals.css
├── components/
│   └── Card.tsx                   # Reusable animated card
├── hooks/
│   ├── useJobAnalysis.ts          # API call + streaming state
│   └── useJobHistory.ts           # localStorage-backed CRUD
├── lib/
│   ├── analyze.ts                 # AI orchestration (provider registry)
│   ├── html-cleaner.ts            # HTML → plain text + truncation
│   ├── logger.ts                  # Structured logger + timing helpers
│   ├── schema.ts                  # Zod schemas + types
│   └── storage.ts                 # SSR-safe localStorage utilities
└── tests/
    ├── api/
    ├── app/
    ├── components/
    ├── hooks/
    ├── lib/
    └── setup.ts
```

## API route `/api/analyze-job`

1. Validates request (API key present, URL or text provided)
2. For URLs: DNS-resolves the hostname, blocks private/local IPs (SSRF protection), fetches via [Jina Reader](https://jina.ai/reader/) to handle JS-heavy SPAs
3. Truncates content via `truncateForAI()` before sending to AI
4. Returns a **NDJSON stream** (`application/x-ndjson`) with server-side batching:
   - First partial flushed immediately for low TTFB
   - Subsequent partials batched at 300ms intervals (many models emit 1000+ granular partials)
   - Final complete state re-emitted after stream ends
   - Error chunks carry `{ __type: "stream_error", error: "..." }`
   - Completion marker: `{ "__type": "stream_complete" }`

## NDJSON streaming flow

```
Client (fetch POST)         Server (route.ts)              AI SDK
      │                           │                          │
      ├────── POST /api/analyze ──►                          │
      │                           ├──── analyzeWithAI ──────►│
      │                           │     (streamObject)       │
      │                           ◄──── partialObjectStream ─┤
      │                           │                          │
      │   ┌───────────────────────────────────────┐          │
      │   │  TransformStream batches +            │          │
      │   │  flushes as NDJSON lines              │          │
      │   └───────────────────────────────────────┘          │
      │◄──── {"jobTitle":"...","skills":[...]} ──┤          │
      │◄──── {"__type":"stream_complete"}       ──┤          │
```

## Streaming hook (`useJobAnalysis`)

The hook reads NDJSON lines from the response body:

- Lines are parsed individually — invalid JSON lines are silently skipped
- Each valid partial is pushed to state, throttled at **200ms** to avoid excessive React re-renders
- On stream completion, the final accumulated result is validated against the Zod schema
- If validation succeeds, `learningResources` are sorted by `roadmapOrder` and the validated result is returned
- Returns `restore(data)` — rehydrates state from a stored history entry without re-fetching

```
Response stream → TextDecoder → split("\n") → JSON.parse → throttle 200ms → setState
                                                                   │
                                                            Zod validation
                                                            on stream end
```

## Job history system

**`src/lib/storage.ts`** — SSR-safe `localStorage` abstraction:
- Guarded with `typeof window === "undefined"` for server-side rendering
- Handles parse errors (corrupted data) and quota errors gracefully
- Single storage key: `job-prep-history`

**`src/hooks/useJobHistory.ts`** — React hook wrapping storage:
- `entries` — current history (loaded on mount via `useState` lazy initializer)
- `addEntry(inputKey, result)` — deduplicates by `inputKey`, prepends to list, caps at 50 entries
- `removeEntry(id)` — deletes by ID, returns `true`/`false`
- History is persisted to `localStorage` on every mutation

## Structured logger (`src/lib/logger.ts`)

- **Development**: human-readable `[INFO] [req-abc] msg (123ms) | key=val` format
- **Production**: `JSON.stringify` lines routed to the correct `console` method
- **`timed(label, fn, meta)`**: wraps an async function, logs duration + status (ok/error)
- **`generateRequestId()`**: 7-character random string for correlating log lines across a request

## AI provider strategy pattern

`src/lib/analyze.ts` uses a registry of factory functions:

```typescript
const providerStrategies: Record<AiProvider, ModelFactory> = {
  google: async (apiKey, model) => { ... },
  openai: async (apiKey, model) => { ... },
  // new provider goes here
};
```

Unknown providers fall back to Google with a `console.warn`.

## Schema validation

All AI output passes through a Zod schema (`src/lib/schema.ts`) before reaching the UI — type safety across the AI boundary. The API route uses `streamObject` from the Vercel AI SDK, and the hook performs a final `safeParse` on the accumulated result.

## Test coverage

**154 tests** across **11 test files** with **100% line coverage**:

| Layer | File | Tests |
|-------|------|-------|
| Route | `analyze-job.test.ts` | 26 |
| Page | `page.test.tsx` | 31 |
| Layout | `layout.test.tsx` | 2 |
| Hooks | `useJobAnalysis.test.ts` | 18 |
| Hooks | `useJobHistory.test.ts` | 15 |
| Lib | `analyze.test.ts` | 6 |
| Lib | `logger.test.ts` | 12 |
| Lib | `storage.test.ts` | 7 |
| Lib | `html-cleaner.test.ts` | 20 |
| Lib | `schema.test.ts` | 12 |
| Components | `Card.test.tsx` | 5 |

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5 |
| AI | Vercel AI SDK + Zod |
| Streaming | NDJSON via `TransformStream` |
| Testing | Vitest, Testing Library, jsdom |
| CI/CD | GitHub Actions + Vercel |
