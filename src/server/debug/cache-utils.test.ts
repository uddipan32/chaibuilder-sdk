import { afterEach, describe, expect, it, vi } from "vitest";

const { mockWarn, mockSuccess } = vi.hoisted(() => ({
  mockWarn: vi.fn(),
  mockSuccess: vi.fn(),
}));

vi.mock("consola", () => ({
  consola: {
    withTag: () => ({
      info: vi.fn(),
      success: mockSuccess,
      warn: mockWarn,
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("react", () => {
  const memo = new Map<string, unknown>();
  return {
    cache: <T extends (...args: unknown[]) => unknown>(fn: T) =>
      ((...args: Parameters<T>) => {
        const key = JSON.stringify(args);
        if (memo.has(key)) {
          return memo.get(key);
        }
        const result = fn(...args);
        memo.set(key, result);
        return result;
      }) as T,
  };
});

vi.mock("~/server/framework-adapter", () => ({
  getFrameworkAdapter: () => ({
    persistentCache: (fn: (...args: unknown[]) => unknown) => fn,
  }),
}));

import { runInContext } from "~/server/chai-builder/state";
import { setGlobalDebugLevel } from "~/server/debug/debug-level";

describe("cache-utils", () => {
  afterEach(() => {
    setGlobalDebugLevel(0);
    mockWarn.mockClear();
    mockSuccess.mockClear();
  });

  it("logs request cache miss then hit for repeated calls", async () => {
    setGlobalDebugLevel(1);

    const { withRequestCache } = await import("~/server/chai-builder/public/cache-utils");
    const fetchData = async (slug: string) => slug;
    const cached = withRequestCache(fetchData, "getPage");

    await runInContext({ appId: "app-1" }, async () => {
      await cached("home");
      await cached("home");
    });

    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn.mock.calls[0][0]).toContain("cache MISS · request · getPage");
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(mockSuccess.mock.calls[0][0]).toContain("cache HIT · request · getPage");
  });
});
