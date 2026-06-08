# Job Preparation Assistant

AI-powered Next.js app that analyzes job postings and generates comprehensive preparation plans.

## What It Does

Paste a job URL or raw job description text → the AI analyzes it and returns:

- **Role Overview** — title, company, location, employment type, summary
- **Candidate Profile** — seniority level, role type, team context, ideal candidate description
- **Tech Stack** — technologies grouped by category (Frontend, Backend, DevOps, etc.)
- **Skills Checklist** — interactive checkboxes categorized as Required, Nice-to-Have, or Exceptional
- **Requirements** — education, experience, certifications
- **Responsibilities & Benefits**
- **Red Flags** — unrealistic expectations or vague descriptions
- **Learning Resources** — curated links per skill with difficulty and time estimates
- **Preparation Roadmap** — phased weekly plan with priorities

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get a free API key

Get a free Google AI Studio API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

No billing or credit card required.

### 3. Set environment variable

Create `.env.local` in the project root:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Switching AI Providers

The app uses the [Vercel AI SDK](https://ai-sdk.dev/) for model-agnostic AI access. To switch providers, edit `src/lib/ai-provider.ts`:

```bash
# Install the provider adapter
npm install @ai-sdk/openai    # or @ai-sdk/anthropic, @ai-sdk/groq, @ai-sdk/mistral
```

Then update `src/lib/ai-provider.ts`:

```typescript
import { createOpenAI } from '@ai-sdk/openai';
const openai = createOpenAI();
export const aiModel = openai('gpt-4o-mini');
```

Set the matching env var (e.g., `OPENAI_API_KEY`) in `.env.local`.

**Supported providers:** Google Gemini, OpenAI, Anthropic, Groq, Mistral, OpenRouter, Ollama (local).

## Validation

```bash
npm run lint
npm run build
```

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4**
- **Vercel AI SDK** + **Zod** (structured AI output)
- **Google Gemini 2.5 Flash** (default, free tier)
