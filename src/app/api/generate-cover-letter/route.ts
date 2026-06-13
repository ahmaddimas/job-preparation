import { NextResponse } from "next/server";

import { generateWithAI, type AiConfig } from "@/lib/analyze";

export async function POST(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 1_000_000) {
    return NextResponse.json(
      { error: "Request body too large." },
      { status: 413 }
    );
  }

  try {
    const body = (await request.json()) as {
      jobAnalysis: Record<string, unknown>;
      candidateSkills?: string;
      candidateName?: string;
      aiConfig: AiConfig;
    };

    if (!body.jobAnalysis) {
      return NextResponse.json(
        { error: "Job analysis data is required." },
        { status: 400 }
      );
    }

    if (!body.aiConfig || !body.aiConfig.apiKey) {
      return NextResponse.json(
        { error: "AI API key is required." },
        { status: 401 }
      );
    }

    const jobJson = JSON.stringify(body.jobAnalysis, null, 2);
    const name = body.candidateName || "[Your Name]";
    const skills = body.candidateSkills || "";

    const prompt = [
      "Write a professional cover letter for the job described below.",
      `The candidate's name is ${name}.`,
      skills && `The candidate's skills: ${skills}`,
      "",
      "Requirements:",
      "- 250-350 words, 4-5 paragraphs",
      "- Opening: reference the specific role and company, express genuine interest",
      "- Body (2-3 paragraphs): map job requirements to candidate skills with concrete examples",
      "- If candidate skills match well, lead with confidence; if gaps exist, acknowledge honestly and frame as growth areas",
      "- Closing: summarize fit, call to action, professional sign-off with [Your Name]",
      "- Include a header line with today's date and the company name",
      "- Write in first person from the candidate's perspective",
      "",
      "Job details:",
      jobJson,
    ]
      .filter(Boolean)
      .join("\n");

    const stream = await generateWithAI(prompt, body.aiConfig);

    let fullText = "";

    for await (const chunk of stream.textStream) {
      fullText += chunk;
    }

    if (!fullText.trim()) {
      return NextResponse.json(
        { error: "The AI could not generate a cover letter. Try a different model." },
        { status: 500 }
      );
    }

    return NextResponse.json({ coverLetter: fullText.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate cover letter.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
