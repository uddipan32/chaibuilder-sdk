import { afterEach, describe, expect, it, vi } from "vitest";
import { resetFrameworkAdapterForTests, setFrameworkAdapter } from "~/server/framework-adapter";
import { runInContext } from "../state";
import { consumeProviderTags, registerCacheTags, repeaterDataTag } from "./register-cache-tags";

function spyPersistentCache() {
  const wrapped = vi.fn(async () => null);
  const persistentCache = vi.fn(() => wrapped);
  setFrameworkAdapter({ persistentCache: persistentCache as any });
  return { persistentCache, wrapped };
}

describe("repeaterDataTag", () => {
  it("scopes the source tag by app id", () => {
    expect(repeaterDataTag("app-1", "listings")).toBe("repeater-data-app-1-listings");
  });
});

describe("registerCacheTags", () => {
  afterEach(() => {
    resetFrameworkAdapterForTests();
  });

  it("does nothing for empty or falsy tags", async () => {
    const { persistentCache } = spyPersistentCache();
    await registerCacheTags([]);
    await registerCacheTags(["", undefined as unknown as string]);
    expect(persistentCache).not.toHaveBeenCalled();
  });

  it("dedupes and sorts tags in both the cache key and the tags option", async () => {
    const { persistentCache, wrapped } = spyPersistentCache();
    await registerCacheTags(["b-tag", "a-tag", "b-tag"]);
    expect(persistentCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["chai-render-tags", "a-tag", "b-tag"],
      { revalidate: false, tags: ["a-tag", "b-tag"] },
    );
    expect(wrapped).toHaveBeenCalledTimes(1);
  });

  it("does nothing in draft mode", async () => {
    const { persistentCache } = spyPersistentCache();
    await runInContext({ appId: "app-1", draft: true }, () => registerCacheTags(["a-tag"]));
    expect(persistentCache).not.toHaveBeenCalled();
  });

  it("registers tags for a live (non-draft) request context", async () => {
    const { persistentCache } = spyPersistentCache();
    await runInContext({ appId: "app-1", draft: false }, () => registerCacheTags(["a-tag"]));
    expect(persistentCache).toHaveBeenCalledTimes(1);
  });
});

describe("consumeProviderTags", () => {
  afterEach(() => {
    resetFrameworkAdapterForTests();
  });

  it("strips $cacheTags and registers them when register is true", async () => {
    const { persistentCache } = spyPersistentCache();
    const result = await consumeProviderTags({ items: [1, 2], $cacheTags: ["a-tag"] }, true);
    expect(result).toEqual({ items: [1, 2] });
    expect(persistentCache).toHaveBeenCalledWith(expect.any(Function), ["chai-render-tags", "a-tag"], {
      revalidate: false,
      tags: ["a-tag"],
    });
  });

  it("strips $cacheTags without registering when register is false", async () => {
    const { persistentCache } = spyPersistentCache();
    const result = await consumeProviderTags({ items: [], $cacheTags: ["a-tag"] }, false);
    expect(result).toEqual({ items: [] });
    expect(persistentCache).not.toHaveBeenCalled();
  });

  it("ignores results without $cacheTags or with a non-array value", async () => {
    const { persistentCache } = spyPersistentCache();
    expect(await consumeProviderTags({ items: [] }, true)).toEqual({ items: [] });
    expect(await consumeProviderTags({ $cacheTags: "not-an-array" as unknown as string[] }, true)).toEqual({});
    expect(persistentCache).not.toHaveBeenCalled();
  });
});
