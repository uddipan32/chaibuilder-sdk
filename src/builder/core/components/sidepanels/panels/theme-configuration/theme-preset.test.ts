import { describe, expect, it } from "vitest";
import type { ChaiDesignTokens, ChaiTheme } from "~/types";
import { resolveThemePreset } from "./theme-preset";

const theme = {
  fontFamily: { heading: "Inter", body: "Inter" },
  borderRadius: "8px",
  colors: {},
} as ChaiTheme;

describe("resolveThemePreset", () => {
  it("keeps legacy theme-only presets working", () => {
    expect(resolveThemePreset({ editorial: theme }, "editorial")).toEqual({ theme });
  });

  it("resolves a theme with optional design-token overrides", () => {
    const designTokens: ChaiDesignTokens = {
      "dt#card": { name: "Card", value: "rounded-none border-2 shadow-none" },
    };

    expect(resolveThemePreset({ editorial: { theme, designTokens } }, "editorial")).toEqual({
      theme,
      designTokens,
    });
  });

  it("returns undefined when preset name is absent", () => {
    expect(resolveThemePreset({ editorial: theme }, "missing")).toBeUndefined();
  });
});
