import { describe, it, expect } from "vitest";
import { cleanHtml, truncateForAI } from "@/lib/html-cleaner";

describe("cleanHtml", () => {
  it("strips HTML tags", () => {
    expect(cleanHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("removes script and style blocks entirely", () => {
    const input = `<script>alert('xss')</script><p>Content</p><style>.a{}</style>`;
    expect(cleanHtml(input)).toBe("Content");
  });

  it("removes nav, header, footer blocks", () => {
    const input = `<header>Site header</header><main>Job content</main><footer>Footer</footer>`;
    expect(cleanHtml(input)).toBe("Job content");
  });

  it("converts headings to ## markers", () => {
    const result = cleanHtml("<h1>Requirements</h1>");
    expect(result).toContain("## Requirements");
  });

  it("converts list items to bullet points", () => {
    const result = cleanHtml("<ul><li>React</li><li>TypeScript</li></ul>");
    expect(result).toContain("• React");
    expect(result).toContain("• TypeScript");
  });

  it("decodes HTML entities", () => {
    expect(cleanHtml("&amp; &lt; &gt; &quot; &nbsp;")).toBe("& < > \" \u00a0" .replace(/\u00a0/g, " ").trim() || "& < > \"");
    const result = cleanHtml("AT&amp;T &lt;tag&gt;");
    expect(result).toContain("AT&T");
    expect(result).toContain("<tag>");
  });

  it("decodes numeric HTML entities", () => {
    expect(cleanHtml("&#65;")).toBe("A");
    expect(cleanHtml("&#x41;")).toBe("A");
  });

  it("normalizes multiple whitespace to single space", () => {
    const result = cleanHtml("<p>Hello   world</p>");
    expect(result).toBe("Hello world");
  });

  it("removes empty lines and trims each line", () => {
    const result = cleanHtml("<p>  Line one  </p><p>  Line two  </p>");
    const lines = result.split("\n").filter(Boolean);
    expect(lines).toEqual(["Line one", "Line two"]);
  });

  it("converts <br> to newline", () => {
    const result = cleanHtml("Line 1<br>Line 2<br/>Line 3");
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
    expect(result).toContain("Line 3");
  });

  it("returns empty string for empty input", () => {
    expect(cleanHtml("")).toBe("");
  });
});

describe("truncateForAI", () => {
  it("returns text unchanged when under limit", () => {
    const text = "short text";
    expect(truncateForAI(text)).toBe(text);
  });

  it("truncates text over the default 50,000 char limit", () => {
    const longText = "a".repeat(60_000);
    const result = truncateForAI(longText);
    expect(result.length).toBeLessThan(60_000);
    expect(result).toContain("[Content truncated]");
  });

  it("respects a custom maxChars argument", () => {
    const text = "hello world";
    const result = truncateForAI(text, 5);
    expect(result).toBe("hello\n\n[Content truncated]");
  });

  it("does not append truncation marker when exactly at limit", () => {
    const text = "a".repeat(50_000);
    const result = truncateForAI(text);
    expect(result).toBe(text);
    expect(result).not.toContain("[Content truncated]");
  });
});
