"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { CHAI_BUILT_IN_DESIGN_TOKENS } from "~/constants/BUILTIN_TOKENS";
import { ChaiDesignTokens } from "~/types/types";
import { mergeDesignTokens, resolveDesignToken } from "./resolve-design-token";

/**
 * Design tokens for UI *inside* a block's own client subtree (cards, toolbars,
 * map markers). Those components are not registered blocks, so the renderer
 * cannot hand them a `designTokens` prop — the block that owns them mounts this
 * provider with the prop it received.
 *
 * Registered blocks should use the injected `designTokens` prop with
 * `resolveDesignToken` instead; that keeps them RSC.
 */
const ChaiDesignTokensContext = createContext<ChaiDesignTokens>(CHAI_BUILT_IN_DESIGN_TOKENS);

export const ChaiDesignTokensProvider = ({
  tokens,
  children,
}: {
  tokens?: ChaiDesignTokens;
  children: ReactNode;
}) => {
  const value = useMemo(() => mergeDesignTokens(tokens), [tokens]);
  return <ChaiDesignTokensContext.Provider value={value}>{children}</ChaiDesignTokensContext.Provider>;
};

/** Client-only counterpart of `resolveDesignToken`, reading tokens from context. */
export const useDesignToken = (...tokens: string[]): string => {
  const designTokens = useContext(ChaiDesignTokensContext);
  return resolveDesignToken(designTokens, ...tokens);
};
