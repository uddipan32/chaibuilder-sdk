/**
 * @vitest-environment happy-dom
 */
import {
  createManualDynamicPage,
  createPlaceholderDynamicPage,
  PLACEHOLDER_DYNAMIC_SLUG,
  readUrlSlug,
  resolveEffectiveLang,
  updateUrlSlug,
} from "../use-dynamic-page-selector.utils";

describe("use-dynamic-page-selector.utils", () => {
  describe("resolveEffectiveLang", () => {
    it("returns selectedLang when provided", () => {
      expect(resolveEffectiveLang("fr", "en")).toBe("fr");
    });

    it("returns fallbackLang when selectedLang is empty", () => {
      expect(resolveEffectiveLang("", "en")).toBe("en");
    });
  });

  describe("createManualDynamicPage", () => {
    it("builds a selection from a typed identifier", () => {
      expect(createManualDynamicPage("my-slug", "en")).toEqual({
        id: "my-slug",
        name: "my-slug",
        slug: "my-slug",
        identifier: "my-slug",
        lang: "en",
        manual: true,
      });
    });

    it("trims surrounding whitespace", () => {
      expect(createManualDynamicPage("  spaced  ", "fr")?.identifier).toBe("spaced");
    });

    it("returns null for blank input", () => {
      expect(createManualDynamicPage("", "en")).toBeNull();
      expect(createManualDynamicPage("   ", "en")).toBeNull();
    });
  });

  describe("createPlaceholderDynamicPage", () => {
    it("builds a flagged placeholder selection for the given language", () => {
      expect(createPlaceholderDynamicPage("fr")).toEqual({
        id: PLACEHOLDER_DYNAMIC_SLUG,
        name: PLACEHOLDER_DYNAMIC_SLUG,
        slug: PLACEHOLDER_DYNAMIC_SLUG,
        identifier: PLACEHOLDER_DYNAMIC_SLUG,
        lang: "fr",
        manual: true,
        placeholder: true,
      });
    });
  });

  describe("readUrlSlug", () => {
    const originalWindow = global.window;

    beforeEach(() => {
      // Mock window
      global.window = Object.create(window);
      Object.defineProperty(window, "location", {
        value: { search: "" },
      });
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it("returns null if no slug in URL", () => {
      window.location.search = "?other=123";
      expect(readUrlSlug()).toBeNull();
    });

    it("returns slug from URL", () => {
      window.location.search = "?slug=test-page-123";
      expect(readUrlSlug()).toBe("test-page-123");
    });
  });

  describe("updateUrlSlug", () => {
    const originalWindow = global.window;
    let mockReplaceState: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockReplaceState = vi.fn();
      global.window = Object.create(window);
      Object.defineProperty(window, "location", {
        value: { href: "http://localhost:3000/test?other=123" },
      });
      Object.defineProperty(window, "history", {
        value: { replaceState: mockReplaceState },
      });
    });

    afterEach(() => {
      global.window = originalWindow;
      vi.clearAllMocks();
    });

    it("adds slug to URL when provided", () => {
      updateUrlSlug("new-page");
      expect(mockReplaceState).toHaveBeenCalledWith({}, "", "http://localhost:3000/test?other=123&slug=new-page");
    });

    it("removes slug from URL when null is provided", () => {
      window.location.href = "http://localhost:3000/test?slug=old-page&other=123";
      updateUrlSlug(null);
      expect(mockReplaceState).toHaveBeenCalledWith({}, "", "http://localhost:3000/test?other=123");
    });
  });
});
