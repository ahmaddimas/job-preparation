import dns from "node:dns/promises";

import { NextResponse } from "next/server";

import { analyzeWithAI, type AiConfig } from "@/lib/analyze";
import { MAX_CHARS, truncateForAI } from "@/lib/html-cleaner";
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

  return rawText.slice(0, MAX_CHARS + 5_000);
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

    const { value: stream, durationMs: aiInitMs } = await timed(
      "ai.init",
      () => analyzeWithAI(truncated, body.aiConfig!),
      { requestId }
    );

    const totalMs = Math.round(performance.now() - totalStart);
    logger.info("ai.stream.ready", { requestId, aiInitMs, totalMsBeforeStream: totalMs });

    // Stream partial objects as NDJSON with server-side batching.
    // First chunk flushed immediately for low TTFB; subsequent chunks
    // batched at BATCH_MS intervals (some models emit 1000+ granular partials).
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    let chunkCount = 0;
    let latestPartial: Record<string, unknown> | null = null;
    const BATCH_MS = 300;
    (async () => {
      try {
        logger.info("stream.pipe.start", { requestId });
        let lastBatchTime = performance.now();
        let isFirst = true;

        for await (const partial of stream.partialObjectStream) {
          chunkCount++;
          const now = performance.now();
          latestPartial = partial;

          if (isFirst) {
            isFirst = false;
            const firstChunkMs = Math.round(now - totalStart);
            logger.info("stream.first_chunk", { requestId, keys: Object.keys(partial), firstChunkMs });
            await writer.write(encoder.encode(JSON.stringify(partial) + "\n"));
            lastBatchTime = now;
          } else if (chunkCount % 100 === 0) {
            logger.info("stream.progress", { requestId, chunkCount });
          } else if (now - lastBatchTime >= BATCH_MS) {
            lastBatchTime = now;
            await writer.write(encoder.encode(JSON.stringify(partial) + "\n"));
          }
        }

        const streamDoneMs = Math.round(performance.now() - totalStart);
        logger.info("stream.pipe.done", { requestId, chunkCount, streamDoneMs });
        if (chunkCount === 0) {
          logger.warn("stream.no_chunks", { requestId, model: body.aiConfig?.model, note: "Model may not support structured output / JSON schema mode" });
        }
        // Always flush the final complete state
        if (latestPartial) {
          await writer.write(encoder.encode(JSON.stringify(latestPartial) + "\n"));
        }
        await writer.write(encoder.encode(JSON.stringify({ __type: "stream_complete" }) + "\n"));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error("stream.pipe.error", { requestId, chunkCount, error: errorMsg });
        try {
          await writer.write(encoder.encode(JSON.stringify({ __type: "stream_error", error: errorMsg }) + "\n"));
        } catch { /* ignore write errors during error handling */ }
      } finally {
        try { await writer.close(); } catch { /* ignore close errors */ }
      }
    })();

    return new Response(readable, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
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
