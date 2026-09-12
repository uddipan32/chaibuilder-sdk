import { describe, expect, it } from "vitest";
import { importOptionalPeer } from "./import-optional-peer";

// Vitest runs these in a `vm` with no dynamic-import hook, so the `Function`-built
// import is rejected here and every case below lands on the fallback path. That is
// the point of the fallback: the helper must resolve the package either way.
describe("importOptionalPeer", () => {
  it("loads an installed peer package by bare specifier", async () => {
    // Regression: Turbopack rewrote the old magic-comment import into a stub that
    // threw MODULE_NOT_FOUND ("Cannot find module as expression is too dynamic"),
    // so a configured OpenRouter key silently fell back to the default gateway.
    const mod = await importOptionalPeer<{ createOpenRouter: unknown }>("@openrouter/ai-sdk-provider");

    expect(typeof mod.createOpenRouter).toBe("function");
  });

  it("resolves the same specifier through repeated calls", async () => {
    const [first, second] = await Promise.all([
      importOptionalPeer<Record<string, unknown>>("@openrouter/ai-sdk-provider"),
      importOptionalPeer<Record<string, unknown>>("@openrouter/ai-sdk-provider"),
    ]);

    expect(first.createOpenRouter).toBe(second.createOpenRouter);
  });

  it("rejects when the package is not installed", async () => {
    await expect(importOptionalPeer("@chaibuilder/definitely-not-installed")).rejects.toThrow();
  });
});
