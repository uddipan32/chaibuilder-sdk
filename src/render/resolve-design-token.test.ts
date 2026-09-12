import { describe, expect, it } from "vitest";
import { CHAI_BUILT_IN_DESIGN_TOKENS } from "~/constants/BUILTIN_TOKENS";
import { mergeDesignTokens, resolveDesignToken } from "./resolve-design-token";

describe("resolveDesignToken", () => {
  it("falls back to built-in tokens when no map is given", () => {
    expect(resolveDesignToken(undefined, "dt#btn-primary")).toBe(CHAI_BUILT_IN_DESIGN_TOKENS["dt#btn-primary"].value);
  });

  it("merges multiple tokens with later tokens winning conflicts", () => {
    const merged = resolveDesignToken(CHAI_BUILT_IN_DESIGN_TOKENS, "dt#btn", "dt#btn-sm");
    // dt#btn sets h-9; dt#btn-sm overrides to h-8.
    expect(merged).toContain("h-8");
    expect(merged).not.toContain("h-9");
  });

  it("prefers the given map over built-ins", () => {
    const tokens = mergeDesignTokens({ "dt#btn-primary": { name: "Button-Primary", value: "bg-red-500 text-white" } });
    expect(resolveDesignToken(tokens, "dt#btn-primary")).toBe("bg-red-500 text-white");
  });

  it("resolves token values that reference other tokens", () => {
    const tokens = mergeDesignTokens({ "dt#cta": { name: "CTA", value: "dt#btn-primary uppercase" } });
    const resolved = resolveDesignToken(tokens, "dt#cta");
    expect(resolved).toContain("bg-primary");
    expect(resolved).toContain("uppercase");
  });

  it("guards against self-referencing tokens", () => {
    const tokens = mergeDesignTokens({ "dt#loop": { name: "Loop", value: "dt#loop underline" } });
    expect(resolveDesignToken(tokens, "dt#loop")).toBe("dt#loop underline");
  });

  it("returns an empty string for unknown tokens", () => {
    expect(resolveDesignToken(CHAI_BUILT_IN_DESIGN_TOKENS, "dt#nope")).toBe("");
  });

  it("resolves a token referenced more than once in the same value", () => {
    const tokens = mergeDesignTokens({
      "dt#pad": { name: "Pad", value: "p-4" },
      "dt#twice": { name: "Twice", value: "dt#pad underline dt#pad" },
    });
    // cn/twMerge collapses the duplicate; the second reference must not leak
    // through as the literal `dt#pad`.
    const resolved = resolveDesignToken(tokens, "dt#twice");
    expect(resolved).toContain("p-4");
    expect(resolved).not.toContain("dt#pad");
  });

  it("keeps the literal class when a referenced token is missing", () => {
    const tokens = mergeDesignTokens({ "dt#cta": { name: "CTA", value: "dt#missing uppercase" } });
    expect(resolveDesignToken(tokens, "dt#cta")).toBe("dt#missing uppercase");
  });
});

describe("mergeDesignTokens", () => {
  it("layers site tokens over the built-in defaults", () => {
    const merged = mergeDesignTokens({ "dt#cta": { name: "CTA", value: "rounded-full" } });
    expect(merged["dt#cta"].value).toBe("rounded-full");
    expect(merged["dt#btn"]).toBe(CHAI_BUILT_IN_DESIGN_TOKENS["dt#btn"]);
  });

  it("returns the built-ins when no site tokens are stored", () => {
    expect(mergeDesignTokens()).toEqual(CHAI_BUILT_IN_DESIGN_TOKENS);
  });
});
