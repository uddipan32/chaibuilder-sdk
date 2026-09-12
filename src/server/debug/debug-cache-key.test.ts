import { describe, expect, it } from "vitest";
import { formatCacheKeyForLog, formatPersistentKeyForLog } from "./debug-cache-key";

describe("formatCacheKeyForLog", () => {
  it("summarizes page props objects", () => {
    expect(
      formatCacheKeyForLog("fetchDataByPageType", [
        "page",
        "en",
        false,
        { slug: "/", pageType: "page", pageId: "e4b5714b-7ed7-48f2-acc0-da50e95f8abc" },
      ]),
    ).toBe("page · en · false · slug=/ type=page page=e4b5714b");
  });

  it("summarizes resolve link args", () => {
    expect(formatCacheKeyForLog("resolveLink", ["/products/platform", "en"])).toBe(
      "/products/platform · en",
    );
  });
});

describe("formatPersistentKeyForLog", () => {
  it("summarizes website settings keys", () => {
    expect(formatPersistentKeyForLog(["website-settings-70edd9d5-8026-4d3c-b902-fd3bb32cdaef"])).toBe(
      "app=70edd9d5",
    );
  });

  it("summarizes page details keys", () => {
    expect(
      formatPersistentKeyForLog([
        "page-details-70edd9d5-8026-4d3c-b902-fd3bb32cdaef-e4b5714b-7ed7-48f2-acc0-da50e95f8abc",
      ]),
    ).toBe("app=70edd9d5 page=e4b5714b");
  });
});
