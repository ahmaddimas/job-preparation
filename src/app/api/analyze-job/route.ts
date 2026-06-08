import dns from "node:dns/promises";

import { NextResponse } from "next/server";

import { analyzeWithAI, type AiConfig } from "@/lib/analyze";
import { truncateForAI } from "@/lib/html-cleaner";
import { logger, timed, generateRequestId } from "@/lib/logger";

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

async function fetchJobContent(url: string, requestId: string): Promise<string> {
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

  const jinaUrl = `https://r.jina.ai/${parsedUrl.toString()}`;
  logger.info("jina.fetch.start", { requestId, url: parsedUrl.hostname });

  let response: Response;
  try {
    const { value, durationMs } = await timed(
      "jina.fetch",
      () =>
        fetch(jinaUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; JobPrepBot/1.0)" },
          redirect: "follow",
          signal: AbortSignal.timeout(15_000),
          cache: "no-store",
        }),
      { requestId, url: parsedUrl.hostname }
    );
    response = value;
    logger.info("jina.fetch.done", { requestId, status: response.status, durationMs });
  } catch (err) {
    logger.error("jina.fetch.failed", { requestId, error: err instanceof Error ? err.message : String(err) });
    throw new Error(
      "Unable to fetch the URL. The source site may block automated requests. Try pasting the job description text directly."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Unable to fetch the URL (status ${response.status}). Try pasting the job description text directly.`
    );
  }

  const { value: rawText, durationMs: readMs } = await timed(
    "jina.read_body",
    () => response.text(),
    { requestId }
  );
  logger.info("jina.content", { requestId, rawBytes: rawText.length, readMs });

  return rawText.slice(0, 1_000_000);
}

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const totalStart = performance.now();

  logger.info("request.start", { requestId });

  try {
    const body = (await request.json()) as {
      url?: string;
      text?: string;
      aiConfig?: AiConfig;
    };

    const inputMode = body.url ? "url" : "text";
    logger.info("request.input", { requestId, inputMode, provider: body.aiConfig?.provider, model: body.aiConfig?.model });

    if (!body.aiConfig || !body.aiConfig.apiKey) {
      return NextResponse.json(
        { error: "AI API Key is missing. Please configure it in Settings." },
        { status: 401 }
      );
    }

    let jobText: string;

    if (body.text && body.text.trim().length > 0) {
      jobText = body.text.trim();
      logger.info("input.text", { requestId, chars: jobText.length });
    } else if (body.url && body.url.trim().length > 0) {
      const { value, durationMs } = await timed(
        "fetchJobContent",
        () => fetchJobContent(body.url!.trim(), requestId),
        { requestId }
      );
      jobText = value;
      logger.info("input.url.fetched", { requestId, chars: jobText.length, durationMs });
    } else {
      return NextResponse.json(
        { error: "Please provide a job URL or paste the job description text." },
        { status: 400 }
      );
    }

    if (jobText.length < 50) {
      return NextResponse.json(
        { error: "The content is too short to analyze. Please provide a complete job posting." },
        { status: 400 }
      );
    }

    const truncated = truncateForAI(jobText);
    logger.info("input.truncated", { requestId, originalChars: jobText.length, truncatedChars: truncated.length });

    logger.info("ai.stream.start", { requestId, provider: body.aiConfig.provider, model: body.aiConfig.model });
    const aiStart = performance.now();

    const stream = await timed(
      "ai.init",
      () => analyzeWithAI(truncated, body.aiConfig!),
      { requestId }
    );

    const totalMs = Math.round(performance.now() - totalStart);
    const aiInitMs = Math.round(performance.now() - aiStart);
    logger.info("ai.stream.ready", { requestId, aiInitMs, totalMsBeforeStream: totalMs });

    return stream.value.toTextStreamResponse();
  } catch (err) {
    const totalMs = Math.round(performance.now() - totalStart);
    const message = err instanceof Error ? err.message : "Something went wrong while analyzing the job posting.";

    logger.error("request.error", { requestId, totalMs, error: message });

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

    return NextResponse.json(
      { error: "Something went wrong while analyzing the job posting. Check your API key and try again." },
      { status: 500 }
    );
  }
}
