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

import { setGlobalDebugLevel } from "./debug-level";
import { withDebugTiming } from "./debug-timing";

describe("withDebugTiming", () => {
  afterEach(() => {
    setGlobalDebugLevel(0);
    mockInfo.mockClear();
  });

  it("skips timing logs below level 2", async () => {
    await withDebugTiming("getPage", async () => "ok");
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("logs api timing at level 2", async () => {
    setGlobalDebugLevel(2);

    const result = await withDebugTiming("getPage", async () => "ok");

    expect(result).toBe("ok");
    expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining("api"));
    expect(mockInfo.mock.calls[0][0]).toContain("getPage");
  });
});
