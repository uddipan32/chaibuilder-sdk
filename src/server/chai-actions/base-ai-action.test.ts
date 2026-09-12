import { describe, expect, it, vi } from "vitest";

// base-ai-action.ts sits at the root of a circular import chain (it's
// extended by every AI action, one of which -- via defaults/config-registry
// -- pulls the builtin action registry back in). Mocking config-registry
// here breaks that cycle before it loads, same as base-ai-action's own
// integration test does for the same reason.
vi.mock("~/server/defaults/config-registry", () => ({
  getConfigAI: vi.fn(() => ({
    logging: { logger: undefined, clientId: null },
    models: {},
  })),
  getConfigFeatures: vi.fn(() => ({})),
}));

describe("buildAiUsageMessageMetadata", () => {
  it("returns totalTokens from the finish part's totalUsage (cbpl#161)", async () => {
    const { buildAiUsageMessageMetadata } = await import("./base-ai-action");
    const result = buildAiUsageMessageMetadata({
      part: { type: "finish", totalUsage: { totalTokens: 12345 } },
    });
    expect(result).toEqual({ totalTokens: 12345 });
  });

  it("returns undefined for every other part type, so it never clobbers metadata a prior part set", async () => {
    const { buildAiUsageMessageMetadata } = await import("./base-ai-action");
    expect(buildAiUsageMessageMetadata({ part: { type: "text-delta" } })).toBeUndefined();
    expect(buildAiUsageMessageMetadata({ part: { type: "tool-call" } })).toBeUndefined();
    expect(buildAiUsageMessageMetadata({ part: { type: "start" } })).toBeUndefined();
  });

  it("falls back to the finish part's usage when totalUsage is missing", async () => {
    const { buildAiUsageMessageMetadata } = await import("./base-ai-action");
    const result = buildAiUsageMessageMetadata({
      part: { type: "finish", usage: { totalTokens: 678 } },
    });
    expect(result).toEqual({ totalTokens: 678 });
  });

  it("prefers totalUsage over usage when both are present", async () => {
    const { buildAiUsageMessageMetadata } = await import("./base-ai-action");
    const result = buildAiUsageMessageMetadata({
      part: { type: "finish", totalUsage: { totalTokens: 12345 }, usage: { totalTokens: 678 } },
    });
    expect(result).toEqual({ totalTokens: 12345 });
  });

  it("degrades to undefined tokens (not a throw) if totalUsage and usage are missing", async () => {
    const { buildAiUsageMessageMetadata } = await import("./base-ai-action");
    const result = buildAiUsageMessageMetadata({ part: { type: "finish" } });
    expect(result).toEqual({ totalTokens: undefined });
  });
});
