import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

const NODE_ENV = process.env.NODE_ENV;

const env = process.env as Record<string, string>;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  env.NODE_ENV = NODE_ENV!;
});

describe("logger", () => {
  describe("in dev mode", () => {
    beforeEach(() => {
      env.NODE_ENV = "development";
    });

    it("logs info messages", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { logger } = await import("@/lib/logger");
      logger.info("test.message", { key: "value" });
      expect(logSpy).toHaveBeenCalled();
      expect(logSpy.mock.calls[0][0]).toContain("test.message");
      logSpy.mockRestore();
    });

    it("logs warn messages", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { logger } = await import("@/lib/logger");
      logger.warn("test.warn");
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("logs error messages", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { logger } = await import("@/lib/logger");
      logger.error("test.error");
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("includes durationMs in format", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { logger } = await import("@/lib/logger");
      logger.info("slow", { durationMs: 500 });
      expect(logSpy.mock.calls[0][0]).toContain("(500ms)");
      logSpy.mockRestore();
    });

    it("includes requestId prefix", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { logger } = await import("@/lib/logger");
      logger.info("msg", { requestId: "abc123" });
      expect(logSpy.mock.calls[0][0]).toContain("[abc123]");
      logSpy.mockRestore();
    });
  });

  describe("in production mode", () => {
    beforeEach(async () => {
      env.NODE_ENV = "production";
      vi.resetModules();
    });

    it("logs JSON in production", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { logger } = await import("@/lib/logger");
      logger.info("prod.msg");
      const output = logSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe("info");
      expect(parsed.msg).toBe("prod.msg");
      expect(parsed.ts).toBeDefined();
      logSpy.mockRestore();
    });

    it("logs errors to console.error in production", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { logger } = await import("@/lib/logger");
      logger.error("prod.error");
      const output = errorSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe("error");
      errorSpy.mockRestore();
    });

    it("logs warnings to console.warn in production", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { logger } = await import("@/lib/logger");
      logger.warn("prod.warn");
      const output = warnSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe("warn");
      warnSpy.mockRestore();
    });
  });
});

describe("timed", () => {
  it("returns value and duration on success", async () => {
    const { timed, logger } = await import("@/lib/logger");
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
    const result = await timed("test.op", () => Promise.resolve(42));
    expect(result.value).toBe(42);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(infoSpy).toHaveBeenCalledWith("test.op", expect.objectContaining({ status: "ok" }));
    infoSpy.mockRestore();
  });

  it("throws and logs error on failure", async () => {
    const { timed, logger } = await import("@/lib/logger");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    await expect(
      timed("test.op", () => Promise.reject(new Error("boom")))
    ).rejects.toThrow("boom");
    expect(errorSpy).toHaveBeenCalledWith("test.op", expect.objectContaining({ status: "error" }));
    errorSpy.mockRestore();
  });

  it("handles non-Error throw", async () => {
    const { timed, logger } = await import("@/lib/logger");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    await expect(
      timed("test.op", () => Promise.reject("string error"))
    ).rejects.toBe("string error");
    expect(errorSpy).toHaveBeenCalledWith("test.op", expect.objectContaining({ status: "error" }));
    errorSpy.mockRestore();
  });
});

describe("generateRequestId", () => {
  it("generates a 7-character string", async () => {
    const { generateRequestId } = await import("@/lib/logger");
    const id = generateRequestId();
    expect(id).toHaveLength(7);
    expect(typeof id).toBe("string");
  });

  it("generates unique ids", async () => {
    const { generateRequestId } = await import("@/lib/logger");
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBeGreaterThan(90); // some collisions possible but very unlikely
  });
});
