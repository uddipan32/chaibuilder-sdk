/**
 * Tiny date formatter. Internal replacement for `date-fns/format`, supporting
 * only the tokens this codebase uses: yyyy, MMM, dd, d, h, mm, a, quoted
 * literals ('at'), and the "PPp" shorthand (medium date + short time).
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDate(input: Date | string | number, pattern: string): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  if (pattern === "PPp") pattern = "MMM d, yyyy, h:mm a";

  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  const tokens: Record<string, string> = {
    yyyy: String(date.getFullYear()),
    MMM: MONTHS[date.getMonth()],
    dd: pad(date.getDate()),
    d: String(date.getDate()),
    mm: pad(date.getMinutes()),
    h: String(hours12),
    a: hours24 < 12 ? "AM" : "PM",
  };

  // Split out quoted literals ('at'), then replace tokens longest-first
  return pattern
    .split(/('[^']*')/)
    .map((part) => {
      if (part.startsWith("'") && part.endsWith("'")) return part.slice(1, -1);
      return part.replace(/yyyy|MMM|dd|mm|d|h|a/g, (token) => tokens[token]);
    })
    .join("");
}
