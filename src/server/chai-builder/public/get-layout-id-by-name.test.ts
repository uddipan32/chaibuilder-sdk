import { afterEach, describe, expect, it, vi } from "vitest";

const { mockWarn } = vi.hoisted(() => ({
  mockWarn: vi.fn(),
}));

vi.mock("consola", () => ({
  consola: {
    warn: mockWarn,
    withTag: () => ({
      info: vi.fn(),
      success: vi.fn(),
      warn: mockWarn,
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("get-layout-id-by-name", () => {
  afterEach(() => {
    mockWarn.mockClear();
  });

  it("builds cache key per app and name", async () => {
    const { layoutIdByNameCacheKey } = await import("./get-layout-id-by-name");
    expect(layoutIdByNameCacheKey("app-1", "Main Layout")).toEqual([
      "layout-id-by-name-app-1-Main Layout",
    ]);
  });

  it("uses layouts-index tag", async () => {
    const { layoutIdByNameCacheTags, LAYOUTS_INDEX_TAG } = await import("./get-layout-id-by-name");
    expect(layoutIdByNameCacheTags()).toEqual([LAYOUTS_INDEX_TAG]);
    expect(LAYOUTS_INDEX_TAG).toBe("layouts-index");
  });

  it("draft mode uses appPages; online uses appPagesOnline", async () => {
    const { getLayoutPagesTable } = await import("./get-layout-id-by-name");
    const { schema } = await import("~/server/chai-actions/db");
    expect(getLayoutPagesTable(true)).toBe(schema.appPages);
    expect(getLayoutPagesTable(false)).toBe(schema.appPagesOnline);
  });

  it("pickOldestLayoutId returns null for empty rows", async () => {
    const { pickOldestLayoutId } = await import("./get-layout-id-by-name");
    expect(pickOldestLayoutId([], "Main")).toBeNull();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("pickOldestLayoutId returns single id without warn", async () => {
    const { pickOldestLayoutId } = await import("./get-layout-id-by-name");
    expect(pickOldestLayoutId([{ id: "layout-a" }], "Main")).toBe("layout-a");
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("pickOldestLayoutId collision: oldest wins + warn", async () => {
    const { pickOldestLayoutId } = await import("./get-layout-id-by-name");
    expect(pickOldestLayoutId([{ id: "oldest" }, { id: "newer" }], "Main Layout")).toBe("oldest");
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn.mock.calls[0][0]).toContain("Multiple layouts named");
    expect(mockWarn.mock.calls[0][0]).toContain("Main Layout");
    expect(mockWarn.mock.calls[0][0]).toContain("oldest");
  });
});
