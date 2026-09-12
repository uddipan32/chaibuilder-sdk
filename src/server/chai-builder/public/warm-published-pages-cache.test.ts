import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetFullPage, mockGetSiteSettings, mockGetPageStyles, mockFetch, mockGetOnlinePageBySlug } = vi.hoisted(
  () => ({
    mockGetFullPage: vi.fn(),
    mockGetSiteSettings: vi.fn(),
    mockGetPageStyles: vi.fn(),
    mockFetch: vi.fn(),
    mockGetOnlinePageBySlug: vi.fn(),
  }),
);

vi.mock("consola", () => ({
  consola: {
    withTag: () => ({
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("./get-full-page", () => ({
  getFullPage: mockGetFullPage,
}));

vi.mock("./get-site-settings", () => ({
  getSiteSettings: mockGetSiteSettings,
}));

vi.mock("./get-page-styles", () => ({
  getPageStyles: mockGetPageStyles,
}));

vi.mock("~/server/chai-actions/db", () => ({
  db: {
    query: {
      appPagesOnline: {
        findFirst: mockGetOnlinePageBySlug,
      },
    },
  },
  safeQuery: async (fn: () => Promise<unknown>) => ({ data: await fn(), error: null }),
  schema: {
    appPagesOnline: {
      app: "app",
      slug: "slug",
    },
  },
}));

import { extractPageIdsFromTags, warmPublishedPagesCache } from "./warm-published-pages-cache";

describe("warm-published-pages-cache", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("extractPageIdsFromTags", () => {
    it("extracts unique page ids and ignores non-page tags", () => {
      const tags = [
        "page-abc123",
        "page-abc123",
        "page-def456",
        "page-styles",
        "breadcrumb-abc123",
        "slug-cGFnZQ",
        "website-settings-app-1",
      ];

      expect(extractPageIdsFromTags(tags)).toEqual(["abc123", "def456"]);
    });

    it("does not treat page slug tags as page ids", () => {
      expect(extractPageIdsFromTags(["page-slug:abc123", "page-abc123"])).toEqual(["abc123"]);
    });
  });

  describe("warmPublishedPagesCache", () => {
    it("prefetches static routes and skips style warmup for those page ids", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      mockGetOnlinePageBySlug.mockResolvedValue({
        id: "static-page",
        primaryPage: null,
        dynamic: false,
        slug: "/about",
      });

      const result = await warmPublishedPagesCache({
        appId: "app-1",
        siteUrl: "https://example.com",
        tags: ["page-static-page"],
        paths: ["/about"],
      });

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/about", expect.any(Object));
      expect(mockGetPageStyles).not.toHaveBeenCalled();
      expect(result.routesWarmed).toBe(1);
      expect(result.stylesWarmed).toBe(0);
      expect(result.stylesSkipped).toBe(1);
    });

    it("warms styles for dynamic pages and skips route prefetch", async () => {
      mockGetSiteSettings.mockResolvedValue({ designTokens: {} });
      mockGetPageStyles.mockResolvedValue(".page-styles{}");
      mockGetOnlinePageBySlug.mockResolvedValue({
        id: "dynamic-page",
        primaryPage: null,
        dynamic: true,
        slug: "/blog",
      });
      mockGetFullPage.mockResolvedValue({
        id: "dynamic-page",
        slug: "/blog",
        dynamic: true,
        blocks: [{ _id: "1", _type: "Box", _parent: null }],
      });

      const result = await warmPublishedPagesCache({
        appId: "app-1",
        siteUrl: "https://example.com",
        tags: ["page-dynamic-page"],
        paths: ["/blog"],
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockGetPageStyles).toHaveBeenCalledTimes(1);
      expect(result.routesSkipped).toBe(1);
      expect(result.stylesWarmed).toBe(1);
    });

    it("warms styles for slug pages and skips partial pages without slug", async () => {
      mockGetSiteSettings.mockResolvedValue({ designTokens: {} });
      mockGetPageStyles.mockResolvedValue(".page-styles{}");
      mockGetFullPage.mockImplementation(async (pageId: string) => {
        if (pageId === "slug-page") {
          return {
            id: pageId,
            slug: "/about",
            dynamic: true,
            blocks: [{ _id: "1", _type: "Box", _parent: null }],
          };
        }

        return { id: pageId, slug: "", dynamic: false, blocks: [] };
      });

      const result = await warmPublishedPagesCache({
        appId: "app-1",
        siteUrl: null,
        tags: ["page-slug-page", "page-partial-block"],
        paths: [],
      });

      expect(result.stylesWarmed).toBe(1);
      expect(result.stylesSkipped).toBe(1);
      expect(mockGetPageStyles).toHaveBeenCalledTimes(1);
    });

    it("falls back to style warmup for static pages when siteUrl is missing", async () => {
      mockGetSiteSettings.mockResolvedValue({ designTokens: {} });
      mockGetPageStyles.mockResolvedValue(".page-styles{}");
      mockGetFullPage.mockResolvedValue({
        id: "static-page",
        slug: "/about",
        dynamic: false,
        blocks: [{ _id: "1", _type: "Box", _parent: null }],
      });

      const result = await warmPublishedPagesCache({
        appId: "app-1",
        siteUrl: null,
        tags: ["page-static-page"],
        paths: ["/about"],
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockGetPageStyles).toHaveBeenCalledTimes(1);
      expect(result.routesSkipped).toBe(1);
      expect(result.stylesWarmed).toBe(1);
    });

    it("returns zero counts when there is nothing to warm", async () => {
      const result = await warmPublishedPagesCache({
        appId: "app-1",
        siteUrl: "https://example.com",
        tags: ["website-settings-app-1"],
        paths: [],
      });

      expect(result).toEqual({
        routesWarmed: 0,
        routesSkipped: 0,
        routesFailed: 0,
        stylesWarmed: 0,
        stylesSkipped: 0,
        stylesFailed: 0,
        totalMs: expect.any(Number),
      });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockGetFullPage).not.toHaveBeenCalled();
    });
  });
});
