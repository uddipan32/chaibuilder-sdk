import { describe, expect, it } from "vitest";
import {
  alternatePagesCacheKey,
  breadcrumbCacheKey,
  decodeSlug,
  encodeSlug,
  pageBySlugCacheKey,
  pageSlugCacheKey,
  pageSlugsBatchCacheKey,
  pageSlugTag,
  pageSlugTagsForPageIds,
  routingTagsForMutation,
  routingTagsForPage,
  routingTagsForPages,
  routingTagsForSlug,
  slugTag,
} from "~/server/chai-builder/public/page-routing-cache";

describe("page-routing-cache", () => {
  it("roundtrips slug encoding", () => {
    const slugs = ["/about", "/about/", "/blog/post-1", "/path with spaces", "/unicode/日本語"];
    for (const slug of slugs) {
      expect(decodeSlug(encodeSlug(slug))).toBe(slug);
    }
  });

  it("produces distinct keys for similar slugs", () => {
    expect(encodeSlug("/about")).not.toBe(encodeSlug("/about/"));
    expect(pageBySlugCacheKey("app-1", false, "/about")).not.toEqual(pageBySlugCacheKey("app-1", false, "/about/"));
  });

  it("builds separate keys for draft and online", () => {
    expect(pageBySlugCacheKey("app-1", false, "/about")).toEqual([`page-by-slug-app-1-online-${encodeSlug("/about")}`]);
    expect(pageBySlugCacheKey("app-1", true, "/about")).toEqual([`page-by-slug-app-1-draft-${encodeSlug("/about")}`]);
    expect(pageSlugCacheKey("app-1", false, "page-abc")).toEqual(["page-slug-app-1-online-page-abc"]);
    expect(pageSlugCacheKey("app-1", true, "page-abc")).toEqual(["page-slug-app-1-draft-page-abc"]);
    expect(pageSlugsBatchCacheKey("app-1", false, ["b-id", "a-id"])).toEqual([
      "page-slugs-batch-app-1-online-a-id,b-id",
    ]);
  });

  it("keeps default-language slug keys identical and namespaces non-default languages", () => {
    // Empty langKey == default language: byte-identical to the pre-i18n key so
    // warm entries are reused.
    expect(pageSlugCacheKey("app-1", false, "page-abc", "")).toEqual(["page-slug-app-1-online-page-abc"]);
    expect(pageSlugsBatchCacheKey("app-1", false, ["b-id", "a-id"], "")).toEqual([
      "page-slugs-batch-app-1-online-a-id,b-id",
    ]);
    // A non-default language gets its own namespace and never collides with the
    // default entry.
    expect(pageSlugCacheKey("app-1", false, "page-abc", "en")).toEqual(["page-slug-app-1-online-en-page-abc"]);
    expect(pageSlugCacheKey("app-1", false, "page-abc", "en")).not.toEqual(
      pageSlugCacheKey("app-1", false, "page-abc", ""),
    );
    expect(pageSlugsBatchCacheKey("app-1", false, ["b-id", "a-id"], "en")).toEqual([
      "page-slugs-batch-app-1-online-en-a-id,b-id",
    ]);
  });

  it("builds companion cache keys", () => {
    expect(alternatePagesCacheKey("app-1", false, "primary-1")).toEqual(["alternate-app-1-online-primary-1"]);
    expect(breadcrumbCacheKey("app-1", true, "page-abc")).toEqual(["breadcrumb-app-1-draft-page-abc"]);
  });

  it("builds slug tags from encoded slug", () => {
    expect(slugTag("/about")).toBe(`slug-${encodeSlug("/about")}`);
  });

  it("builds page slug tags with colon separator", () => {
    expect(pageSlugTag("page-abc")).toBe("page-slug:page-abc");
    expect(pageSlugTagsForPageIds(["a", "b", "a"])).toEqual(["page-slug:a", "page-slug:b"]);
  });

  it("does not emit page slug tags from draft-side mutation tags", () => {
    const tags = routingTagsForMutation("page-abc", {
      slugs: { old: "/old", new: "/new" },
      slugUpdates: [{ id: "child-1", oldSlug: "/old/child", newSlug: "/new/child" }],
    });
    expect(tags.some((tag) => tag.startsWith("page-slug:"))).toBe(false);
  });

  it("builds routing tags for slug lookup", () => {
    expect(routingTagsForSlug("/about")).toEqual([slugTag("/about")]);
  });

  it("builds routing tags for page and slug", () => {
    expect(routingTagsForPage("page-abc", "/about").sort()).toEqual(
      ["page-page-abc", "breadcrumb-page-abc", slugTag("/about")].sort(),
    );
  });

  it("builds mutation tags with old and new slugs", () => {
    expect(
      routingTagsForMutation("page-abc", {
        slugs: { old: "/old", new: "/new" },
        primaryPageId: "primary-1",
      }).sort(),
    ).toEqual(["page-page-abc", "breadcrumb-page-abc", slugTag("/old"), slugTag("/new"), "alternate-primary-1"].sort());
  });

  it("builds tags for slug update batches", () => {
    expect(
      routingTagsForMutation("page-abc", {
        slugUpdates: [
          { id: "page-abc", oldSlug: "/old", newSlug: "/new" },
          { id: "child-1", oldSlug: "/old/child", newSlug: "/new/child" },
        ],
      }).sort(),
    ).toEqual(
      [
        "page-page-abc",
        "breadcrumb-page-abc",
        "page-child-1",
        "breadcrumb-child-1",
        slugTag("/old"),
        slugTag("/new"),
        slugTag("/old/child"),
        slugTag("/new/child"),
      ].sort(),
    );
  });

  it("builds tags for multiple pages", () => {
    // A deleted language variant must also bust its primary's page-slug tag, since
    // language-aware link resolution caches the variant slug under the primary id.
    expect(routingTagsForPages([{ id: "p1", slug: "/a", primaryPage: "primary-1" }]).sort()).toEqual(
      ["page-p1", "breadcrumb-p1", "page-slug:p1", slugTag("/a"), "alternate-primary-1", "page-slug:primary-1"].sort(),
    );
  });
});
