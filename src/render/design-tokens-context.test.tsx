// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { CHAI_BUILT_IN_DESIGN_TOKENS } from "~/constants/BUILTIN_TOKENS";
import { ChaiDesignTokens } from "~/types/types";
import { ChaiDesignTokensProvider, useDesignToken } from "./design-tokens-context";

const withTokens =
  (tokens: ChaiDesignTokens) =>
  ({ children }: { children: ReactNode }) => <ChaiDesignTokensProvider tokens={tokens}>{children}</ChaiDesignTokensProvider>;

describe("useDesignToken", () => {
  it("falls back to built-in tokens without a provider", () => {
    const { result } = renderHook(() => useDesignToken("dt#btn-primary"));
    expect(result.current).toBe(CHAI_BUILT_IN_DESIGN_TOKENS["dt#btn-primary"].value);
  });

  it("merges multiple tokens with later tokens winning conflicts", () => {
    const { result } = renderHook(() => useDesignToken("dt#btn", "dt#btn-sm"));
    // dt#btn sets h-9; dt#btn-sm overrides to h-8.
    expect(result.current).toContain("h-8");
    expect(result.current).not.toContain("h-9");
  });

  it("prefers site tokens from the provider over built-ins", () => {
    const { result } = renderHook(() => useDesignToken("dt#btn-primary"), {
      wrapper: withTokens({ "dt#btn-primary": { name: "Button-Primary", value: "bg-red-500 text-white" } }),
    });
    expect(result.current).toBe("bg-red-500 text-white");
  });

  it("resolves site tokens that are not built-in", () => {
    const { result } = renderHook(() => useDesignToken("dt#cta"), {
      wrapper: withTokens({ "dt#cta": { name: "CTA", value: "rounded-full px-8" } }),
    });
    expect(result.current).toBe("rounded-full px-8");
  });

  it("resolves token values that reference other tokens", () => {
    const { result } = renderHook(() => useDesignToken("dt#cta"), {
      wrapper: withTokens({ "dt#cta": { name: "CTA", value: "dt#btn-primary uppercase" } }),
    });
    expect(result.current).toContain("bg-primary");
    expect(result.current).toContain("uppercase");
  });

  it("guards against self-referencing tokens", () => {
    const { result } = renderHook(() => useDesignToken("dt#loop"), {
      wrapper: withTokens({ "dt#loop": { name: "Loop", value: "dt#loop underline" } }),
    });
    expect(result.current).toBe("dt#loop underline");
  });

  it("returns an empty string for unknown tokens", () => {
    const { result } = renderHook(() => useDesignToken("dt#nope"));
    expect(result.current).toBe("");
  });
});
