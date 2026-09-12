import { describe, expect, it } from "vitest";
import {
  pageDetailsCacheKey,
  pageDetailsCacheTags,
  pageDetailsTagsForMutation,
} from "~/server/chai-builder/public/page-details-cache";

describe("page-details-cache", () => {
  it("builds cache key per app and page", () => {
    expect(pageDetailsCacheKey("app-1", "page-abc")).toEqual(["page-details-app-1-page-abc"]);
  });

  it("builds revalidation tags per page", () => {
    expect(pageDetailsCacheTags("page-abc").sort()).toEqual(["page-details-page-abc", "page-page-abc"].sort());
  });

  it("returns mutation tags for page details only", () => {
    expect(pageDetailsTagsForMutation("page-abc")).toEqual(["page-page-abc"]);
  });
});
