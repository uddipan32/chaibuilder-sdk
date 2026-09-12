/**
 * Path rules shared by the redirects table and the `onPageNotFound` handler.
 *
 * Deliberately free of DB imports: the config registry pulls this in, and its module graph is
 * loaded by the Payload CLI.
 */

/**
 * Browsers read `//evil.com` and `/\evil.com` as protocol-relative URLs pointing at another
 * origin, so "starts with a slash" is not enough to call a target internal - that check alone
 * is an open redirect. Neither form is ever a legitimate internal path.
 */
export function isProtocolRelative(path: string): boolean {
  return /^\/[/\\]/.test(path);
}

/**
 * Normalize a target returned by an app's `onPageNotFound` handler, or null if it is unusable.
 *
 * Looser than the redirects table on purpose: handlers are app code, so a query string
 * (`/search?q=…`) or a deliberate external URL (an old site on another domain) are both fair
 * game. Protocol-relative targets and non-http(s) schemes are not.
 */
export function normalizeHandlerRedirect(target: unknown): string | null {
  if (typeof target !== "string") return null;

  const trimmed = target.trim();
  if (!trimmed || isProtocolRelative(trimmed)) return null;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Bare words, `javascript:`, `mailto:` and friends are never a redirect we should follow.
  return null;
}
