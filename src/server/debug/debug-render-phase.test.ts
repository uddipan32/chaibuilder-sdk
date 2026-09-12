import { afterEach, describe, expect, it, vi } from "vitest";

const { mockInfo } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
}));

vi.mock("consola", () => ({
  consola: {
    withTag: () => ({
      info: mockInfo,
      success: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { getOptionalRequestState, runInContext } from "~/server/chai-builder/state";
import { setGlobalDebugLevel } from "./debug-level";
import { withRenderPhase } from "./debug-timing";
import { ensureTrace } from "./debug-trace";

describe("withRenderPhase", () => {
  afterEach(() => {
    setGlobalDebugLevel(0);
    mockInfo.mockClear();
  });

  it("skips phase logs below level 1", async () => {
    await withRenderPhase("ChaiPageCSS", async () => "ok");
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("logs phase start and complete at level 1 within request trace", async () => {
    setGlobalDebugLevel(1);

    await runInContext({ appId: "app-1", draft: false }, async () => {
      ensureTrace("renderPage", "slug=/");
      await withRenderPhase("ChaiPageCSS", async () => "ok");
    });

    expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining("▶ ChaiPageCSS"));
    expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining("◀ ChaiPageCSS"));
  });
});

describe("runInContext reuse", () => {
  it("reuses request state for the same app within a page request", async () => {
    let outerTraceId: string | null = null;
    let innerTraceId: string | null = null;

    runInContext({ appId: "app-1", draft: false }, () => {
      ensureTrace("renderPage", "slug=/");
      outerTraceId = getOptionalRequestState()?.traceId ?? null;

      runInContext({ appId: "app-1", draft: false }, () => {
        innerTraceId = getOptionalRequestState()?.traceId ?? null;
      });
    });

    expect(outerTraceId).toBeTruthy();
    expect(innerTraceId).toBe(outerTraceId);
  });
});
