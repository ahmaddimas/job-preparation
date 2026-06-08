/**
 * HTML → plain text cleaner.
 * Strips tags, decodes common entities, preserves meaningful structure.
 * Truncates to a reasonable length for AI context windows.
 */

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&bull;": "•",
  "&hellip;": "…",
};

const ENTITY_REGEX = new RegExp(
  Object.keys(ENTITY_MAP)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "gi"
);

/**
 * Convert raw HTML to clean plain text suitable for AI analysis.
 * Preserves headings, list items, and paragraph breaks.
 */
export function cleanHtml(html: string): string {
  let text = html;

  // Remove script, style, nav, header, footer blocks entirely
  text = text.replace(
    /<(script|style|nav|header|footer|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  );

  // Convert headings to marked lines
  text = text.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_match, _level: string, content: string) => `\n## ${content.trim()}\n`
  );

  // Convert block elements to newlines
  text = text.replace(
    /<\/(p|div|section|article|blockquote|tr|table)>/gi,
    "\n"
  );
  text = text.replace(/<(br|hr)\s*\/?>/gi, "\n");

  // Convert list items to bullet points
  text = text.replace(/<li[^>]*>/gi, "\n• ");

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]*>/g, " ");

  // Decode HTML entities
  text = text.replace(ENTITY_REGEX, (match) => ENTITY_MAP[match.toLowerCase()]);
  text = text.replace(/&#(\d+);/g, (_match, code: string) =>
    String.fromCharCode(Number(code))
  );
  text = text.replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
    String.fromCharCode(parseInt(code, 16))
  );

  // Normalize whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");

  // Trim each line
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text;
}

/** Default AI context limit (~12,500 tokens). */
export const MAX_CHARS = 50_000;

/**
 * Truncate text to fit within AI context limits.
 */
export function truncateForAI(text: string, maxChars = MAX_CHARS): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[Content truncated]";
}
