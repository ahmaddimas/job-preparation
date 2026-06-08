import dns from "node:dns/promises";

import { NextResponse } from "next/server";

import { analyzeJobPosting } from "@/lib/job-analyzer";

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

export async function POST(request: Request) {
  try {
    const { url } = (await request.json()) as { url?: string };

    if (!url) {
      return NextResponse.json({ error: "Please provide a job URL." }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only HTTP and HTTPS URLs are allowed." }, { status: 400 });
    }

    if (await isPrivateHost(parsedUrl.hostname)) {
      return NextResponse.json({ error: "Private or local addresses are not allowed." }, { status: 400 });
    }

    let response: Response;
    try {
      response = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JobPrepBot/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Unable to fetch the URL. The source site may block automated requests." },
        { status: 400 },
      );
    }

    if (!response.ok) {
      return NextResponse.json({ error: `Unable to fetch the URL (status ${response.status}).` }, { status: 400 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ error: "The URL did not return an HTML job page." }, { status: 400 });
    }

    const html = (await response.text()).slice(0, 1_000_000);
    const result = analyzeJobPosting(html);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Something went wrong while analyzing the job posting." }, { status: 500 });
  }
}
