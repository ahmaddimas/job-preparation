/**
 * Structured logger with timing helpers.
 * Outputs JSON lines in production, readable format in dev.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  msg: string;
  requestId?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const IS_DEV = process.env.NODE_ENV !== "production";

function log(level: LogLevel, msg: string, meta: Record<string, unknown> = {}) {
  const entry: LogEntry = { level, msg, ts: new Date().toISOString(), ...meta };

  if (IS_DEV) {
    const duration = entry.durationMs != null ? ` (${entry.durationMs}ms)` : "";
    const extras = Object.entries(meta)
      .filter(([k]) => k !== "requestId")
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ");
    const prefix = entry.requestId ? `[${entry.requestId}]` : "";
    const line = `[${level.toUpperCase()}]${prefix} ${msg}${duration}${extras ? " | " + extras : ""}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } else {
    const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    logFn(JSON.stringify(entry));
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};

/**
 * Times an async operation and logs the result.
 * Returns the value and the elapsed ms.
 */
export async function timed<T>(
  label: string,
  fn: () => Promise<T>,
  meta: Record<string, unknown> = {}
): Promise<{ value: T; durationMs: number }> {
  const start = performance.now();
  try {
    const value = await fn();
    const durationMs = Math.round(performance.now() - start);
    logger.info(label, { ...meta, durationMs, status: "ok" });
    return { value, durationMs };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    logger.error(label, { ...meta, durationMs, status: "error", error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Generate a short random request ID for correlating log lines. */
export function generateRequestId(): string {
  return Math.random().toString(36).slice(2, 9);
}
