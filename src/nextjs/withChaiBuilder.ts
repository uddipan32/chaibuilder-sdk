import type { NextConfig } from "next";

/**
 * Next.js config wrapper for ChaiBuilder.
 *
 * @example
 * ```typescript
 * import { withChaiBuilder } from "~/nextjs";
 *
 * const nextConfig = { ... };
 *
 * export default withChaiBuilder(nextConfig);
 * ```
 */
export function withChaiBuilder(nextConfig: NextConfig = {}): NextConfig {
  return nextConfig;
}
