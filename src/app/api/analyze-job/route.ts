import dns from "node:dns/promises";

import { NextResponse } from "next/server";

import { analyzeWithAI, type AiConfig } from "@/lib/analyze";
import { truncateForAI } from "@/lib/html-cleaner";

const PRIVATE_IPV4_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
];

function isPrivateIpv4(host: string): boolean {
  if (PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(host))) {
    return true;
  }

  const match = host.match(/^172\.(\d{1,3})\./);
  if (!match) {
    return false;
  }

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function isPrivateIpv6(host: string): boolean {
  return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80");
}

function isBlockedHostname(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return normalizedHost === "localhost" || normalizedHost.endsWith(".localhost") || normalizedHost === "0.0.0.0";
}

async function isPrivateHost(hostname: string): Promise<boolean> {
  if (isBlockedHostname(hostname) || isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    return true;
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    return addresses.some((entry) =>
      entry.family === 4 ? isPrivateIpv4(entry.address) : isPrivateIpv6(entry.address),
    );
  } catch {
    return false;
  }
}

async function fetchJobContent(url: string): Promise<string> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL format.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }

  if (await isPrivateHost(parsedUrl.hostname)) {
    throw new Error("Private or local addresses are not allowed.");
  }

  let response: Response;
  try {
    // We use r.jina.ai to cleanly extract text from Javascript-heavy SPAs (like workable.com)
    const jinaUrl = `https://r.jina.ai/${parsedUrl.toString()}`;
    response = await fetch(jinaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JobPrepBot/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Unable to fetch the URL. The source site may block automated requests. Try pasting the job description text directly."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Unable to fetch the URL (status ${response.status}). Try pasting the job description text directly.`
    );
  }

  return (await response.text()).slice(0, 1_000_000);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      url?: string;
      text?: string;
      aiConfig?: AiConfig;
    };

    if (!body.aiConfig || !body.aiConfig.apiKey) {
      return NextResponse.json(
        { error: "AI API Key is missing. Please configure it in Settings." },
        { status: 401 }
      );
    }

    let jobText: string;

    if (body.text && body.text.trim().length > 0) {
      jobText = body.text.trim();
    } else if (body.url && body.url.trim().length > 0) {
      // Fetch cleanly extracted markdown content via Jina Reader
      jobText = await fetchJobContent(body.url.trim());
    } else {
      return NextResponse.json(
        {
          error:
            "Please provide a job URL or paste the job description text.",
        },
        { status: 400 }
      );
    }

    if (jobText.length < 50) {
      return NextResponse.json(
        {
          error:
            "The content is too short to analyze. Please provide a complete job posting.",
        },
        { status: 400 }
      );
    }

    const truncated = truncateForAI(jobText);
    const stream = await analyzeWithAI(truncated, body.aiConfig);

    return stream.toTextStreamResponse();
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Something went wrong while analyzing the job posting.";

    if (
      err instanceof Error &&
      (message.includes("URL") ||
        message.includes("fetch") ||
        message.includes("Private") ||
        message.includes("short") ||
        message.includes("HTML"))
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("Analysis error:", err);
    return NextResponse.json(
      {
        error:
          "Something went wrong while analyzing the job posting. Check your API key and try again.",
      },
      { status: 500 }
    );
  }
}
