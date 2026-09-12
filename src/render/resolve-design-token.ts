import { CHAI_BUILT_IN_DESIGN_TOKENS } from "~/constants/BUILTIN_TOKENS";
import { cn } from "~/lib/utils";
import type { ChaiDesignTokens } from "~/types/types";

const DESIGN_TOKEN_PREFIX = "dt#";

/** A token value may reference other tokens; resolve them, guarding against cycles. */
const resolveTokenValue = (value: string | undefined, designTokens: ChaiDesignTokens, seen: Set<string>): string => {
  if (!value) return "";
  return value
    .split(" ")
    .map((cls) => {
      if (!cls.startsWith(DESIGN_TOKEN_PREFIX) || seen.has(cls)) return cls;
      // Unknown reference: keep the literal so the broken token stays visible.
      if (!designTokens[cls]) return cls;
      seen.add(cls);
      const resolved = resolveTokenValue(designTokens[cls].value, designTokens, seen);
      // `seen` is a recursion stack, not a visited set — a token referenced
      // twice as siblings must resolve both times.
      seen.delete(cls);
      return resolved;
    })
    .join(" ");
};

/**
 * Resolves design tokens (`dt#btn`, `dt#input`, …) to their class strings.
 *
 * Plain function, no React — server blocks call it directly with the
 * `designTokens` prop the renderer injects. Client subtrees that sit below a
 * block (cards, toolbars) use the `useDesignToken` hook instead, which reads
 * the same map from context and delegates here.
 */
export const resolveDesignToken = (designTokens: ChaiDesignTokens | undefined, ...tokens: string[]): string => {
  const map = designTokens ?? CHAI_BUILT_IN_DESIGN_TOKENS;
  return cn(tokens.map((token) => resolveTokenValue(map[token]?.value, map, new Set([token]))));
};

/** Site tokens layered over the built-in defaults. Call once per render. */
export const mergeDesignTokens = (tokens?: ChaiDesignTokens): ChaiDesignTokens => ({
  ...CHAI_BUILT_IN_DESIGN_TOKENS,
  ...tokens,
});
