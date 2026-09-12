/**
 * @vitest-environment happy-dom
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider as JotaiProvider, createStore } from "jotai";
import React from "react";
import { useLanguages } from "~/builder/hooks/use-languages";
import { ACTIONS } from "~/builder/pages/constants/ACTIONS";
import { useApiUrl } from "~/builder/pages/hooks/project/use-builder-prop";
import { usePageType } from "~/builder/pages/hooks/project/use-page-types";
import { useFetch } from "~/builder/pages/hooks/utils/use-fetch";
import { usePrimaryPage } from "../use-current-page";
import { useDynamicPageSelector } from "../use-dynamic-page-selector";
import * as utils from "../use-dynamic-page-selector.utils";

vi.mock("~/builder/hooks/use-languages");
vi.mock("../use-current-page");
vi.mock("~/builder/pages/hooks/utils/use-fetch");
vi.mock("~/builder/pages/hooks/project/use-builder-prop");
vi.mock("~/builder/pages/hooks/project/use-page-types");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("useDynamicPageSelector", () => {
  let mockFetchAPI: ReturnType<typeof vi.fn>;
  let mockReadUrlSlug: ReturnType<typeof vi.spyOn>;
  let mockUpdateUrlSlug: ReturnType<typeof vi.spyOn>;
  let store: ReturnType<typeof createStore>;

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(JotaiProvider, { store }, children),
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    store = createStore();

    mockReadUrlSlug = vi.spyOn(utils, "readUrlSlug").mockReturnValue(null);
    mockUpdateUrlSlug = vi.spyOn(utils, "updateUrlSlug").mockImplementation(() => {});

    (useLanguages as any).mockReturnValue({
      selectedLang: "en",
      fallbackLang: "en",
    });

    (usePrimaryPage as any).mockReturnValue({
      data: {
        pageType: "product",
        dynamic: true,
      },
    });

    (useApiUrl as any).mockReturnValue("https://api.test");

    (usePageType as any).mockReturnValue({ key: "product", hasGetDynamicPages: true });

    mockFetchAPI = vi.fn().mockResolvedValue([
      { id: "1", slug: "iphone-15", name: "iPhone 15", lang: "en" },
      { id: "2", slug: "macbook", name: "MacBook", lang: "en" },
    ]);
    (useFetch as any).mockReturnValue(mockFetchAPI);
  });

  it("should select first page on initial load when no URL slug is present", async () => {
    const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

    await waitFor(() => {
      expect(result.current.dynamicPage).not.toBeNull();
    });

    expect(result.current.dynamicPage).toEqual({
      id: "1",
      slug: "iphone-15",
      name: "iPhone 15",
      lang: "en",
    });
    expect(result.current.isLangMissing).toBe(false);
  });

  it("should fetch specific page on initial load when URL slug is present", async () => {
    mockReadUrlSlug.mockReturnValue("macbook");
    // All calls return macbook (search list + active slug lookup both return it)
    mockFetchAPI.mockResolvedValue([{ id: "2", slug: "macbook", name: "MacBook", lang: "en" }]);

    const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

    await waitFor(() => {
      expect(result.current.dynamicPage?.slug).toBe("macbook");
    });

    expect(mockFetchAPI).toHaveBeenCalledWith(
      "https://api.test",
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: "macbook",
          lang: "en",
        }),
      }),
    );
  });

  it("should set isLangMissing when URL slug is present but not found", async () => {
    mockReadUrlSlug.mockReturnValue("not-found");
    mockFetchAPI.mockResolvedValue([]); // not found

    const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLangMissing).toBe(true);
    });

    expect(result.current.dynamicPage).toBeNull();
  });

  it("should handle language switch with page selected", async () => {
    // Simulate: URL has slug=iphone-15, lang is now fr (lang already switched)
    mockReadUrlSlug.mockReturnValue("iphone-15");

    (useLanguages as any).mockReturnValue({
      selectedLang: "fr",
      fallbackLang: "en",
    });

    mockFetchAPI.mockResolvedValue([{ id: "3", slug: "iphone-15", name: "iPhone 15 FR", lang: "fr" }]);

    const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

    await waitFor(() => {
      expect(result.current.dynamicPage?.lang).toBe("fr");
    });

    expect(result.current.isLangMissing).toBe(false);

    expect(mockFetchAPI).toHaveBeenCalledWith(
      "https://api.test",
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: "iphone-15",
          lang: "fr",
        }),
      }),
    );
  });

  it("should show isLangMissing when switching to language without translation", async () => {
    // Simulate: URL has slug=iphone-15, lang is now es (no translation available)
    mockReadUrlSlug.mockReturnValue("iphone-15");

    (useLanguages as any).mockReturnValue({
      selectedLang: "es",
      fallbackLang: "en",
    });

    mockFetchAPI.mockResolvedValue([]); // No spanish translation

    const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLangMissing).toBe(true);
    });

    expect(result.current.dynamicPage).toBeNull();
  });

  it("should update dynamic page and URL when calling updateDynamicPage", async () => {
    const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

    await waitFor(() => {
      expect(result.current.dynamicPage).not.toBeNull();
    });

    act(() => {
      result.current.updateDynamicPage({ id: "99", slug: "new-page", name: "New Page", lang: "en" });
    });

    expect(result.current.dynamicPage?.slug).toBe("new-page");
    expect(result.current.isLangMissing).toBe(false);
    expect(mockUpdateUrlSlug).toHaveBeenCalledWith("new-page");
  });

  it("should drop the selection when moving to another dynamic page", async () => {
    (usePrimaryPage as any).mockReturnValue({
      data: { id: "blog-page", pageType: "blog", dynamic: true },
    });

    const { result, rerender } = renderHook(() => useDynamicPageSelector(), { wrapper });

    await waitFor(() => {
      expect(result.current.dynamicPage?.slug).toBe("iphone-15");
    });

    // Navigate to a different dynamic page — its items are unrelated
    mockFetchAPI.mockResolvedValue([{ id: "10", slug: "/install", name: "Install", lang: "en" }]);
    (usePrimaryPage as any).mockReturnValue({
      data: { id: "docs-page", pageType: "docs", dynamic: true },
    });
    rerender();

    await waitFor(() => {
      expect(result.current.dynamicPage?.slug).toBe("/install");
    });
    expect(mockUpdateUrlSlug).toHaveBeenCalledWith(null);
  });

  describe("empty collection fallback", () => {
    it("selects a placeholder page when the collection is empty and no URL slug is set", async () => {
      mockFetchAPI.mockResolvedValue([]); // page type lists items, but there are none

      const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

      await waitFor(() => {
        expect(result.current.dynamicPage?.identifier).toBe("placeholder-slug");
      });

      expect(result.current.dynamicPage).toMatchObject({
        slug: "placeholder-slug",
        identifier: "placeholder-slug",
        manual: true,
        placeholder: true,
        lang: "en",
      });
      expect(result.current.isLangMissing).toBe(false);
      // Synthetic selection must never be written to the URL.
      expect(mockUpdateUrlSlug).not.toHaveBeenCalledWith("placeholder-slug");
    });

    it("does not use a placeholder when the collection has items", async () => {
      // default mock returns two items -> first item wins, no placeholder
      const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

      await waitFor(() => {
        expect(result.current.dynamicPage).not.toBeNull();
      });

      expect(result.current.dynamicPage?.placeholder).toBeUndefined();
      expect(result.current.dynamicPage?.slug).toBe("iphone-15");
    });

    it("hands over to the first real item once the collection gains an entry", async () => {
      mockFetchAPI.mockResolvedValue([]); // start empty -> placeholder is selected

      const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

      await waitFor(() => {
        expect(result.current.dynamicPage?.placeholder).toBe(true);
      });

      // The user creates the first item; the list query refetches with a real entry.
      mockFetchAPI.mockResolvedValue([{ id: "1", slug: "first-item", name: "First Item", lang: "en" }]);
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: [ACTIONS.GET_DYNAMIC_PAGES] });
      });

      await waitFor(() => {
        expect(result.current.dynamicPage?.slug).toBe("first-item");
      });
      // The synthetic placeholder is gone — a real item now drives the canvas.
      expect(result.current.dynamicPage?.placeholder).toBeUndefined();
    });

    it("selects a placeholder for a non-listing dynamic page when no URL slug is set", async () => {
      // A page type that can't list its items (e.g. promotion_vdp) still needs a
      // selection so the overlay clears; its builder dataProvider supplies preview data.
      (usePageType as any).mockReturnValue({ key: "product", hasGetDynamicPages: false });

      const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

      await waitFor(() => {
        expect(result.current.dynamicPage?.placeholder).toBe(true);
      });

      expect(result.current.dynamicPage).toMatchObject({
        identifier: "placeholder-slug",
        manual: true,
        placeholder: true,
        lang: "en",
      });
      // No listing endpoint is queried for a page type that can't list items.
      expect(mockFetchAPI).not.toHaveBeenCalled();
      expect(mockUpdateUrlSlug).not.toHaveBeenCalledWith("placeholder-slug");
    });

    it("does not use a placeholder when a typed URL slug fails to resolve", async () => {
      mockReadUrlSlug.mockReturnValue("ghost");
      mockFetchAPI.mockResolvedValue([]); // empty collection AND the lookup fails

      const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

      await waitFor(() => {
        expect(result.current.failedLookupIdentifier).toBe("ghost");
      });

      // The "open it anyway" flow owns this case; no silent placeholder override.
      expect(result.current.dynamicPage).toBeNull();
    });
  });

  describe("manual identifiers", () => {
    it("should select a typed identifier via selectManualPage", async () => {
      const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

      await waitFor(() => {
        expect(result.current.dynamicPage).not.toBeNull();
      });

      act(() => {
        result.current.selectManualPage("typed-slug");
      });

      expect(result.current.dynamicPage).toMatchObject({
        id: "typed-slug",
        name: "typed-slug",
        slug: "typed-slug",
        identifier: "typed-slug",
        manual: true,
        lang: "en",
      });
      expect(result.current.isLangMissing).toBe(false);
      expect(result.current.searchQuery).toBe("");
      expect(mockUpdateUrlSlug).toHaveBeenCalledWith("typed-slug");
    });

    it("should ignore a blank identifier", async () => {
      const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

      await waitFor(() => {
        expect(result.current.dynamicPage).not.toBeNull();
      });

      const before = result.current.dynamicPage;
      act(() => {
        result.current.selectManualPage("   ");
      });

      expect(result.current.dynamicPage).toBe(before);
      expect(mockUpdateUrlSlug).not.toHaveBeenCalledWith("   ");
    });

    it("should resolve a URL identifier directly when the page type cannot list pages", async () => {
      (usePageType as any).mockReturnValue({ key: "product", hasGetDynamicPages: false });
      mockReadUrlSlug.mockReturnValue("only-known-by-url");
      mockFetchAPI.mockResolvedValue([]);

      const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

      await waitFor(() => {
        expect(result.current.dynamicPage?.identifier).toBe("only-known-by-url");
      });

      expect(result.current.dynamicPage?.manual).toBe(true);
      expect(result.current.isLangMissing).toBe(false);
      // No lookup is attempted — the endpoint would always answer `[]`.
      expect(mockFetchAPI).not.toHaveBeenCalled();
    });

    it("should carry a manual selection across a language switch without a lookup", async () => {
      const { result, rerender } = renderHook(() => useDynamicPageSelector(), { wrapper });

      await waitFor(() => {
        expect(result.current.dynamicPage).not.toBeNull();
      });

      act(() => {
        result.current.selectManualPage("typed-slug");
      });

      mockFetchAPI.mockClear();
      (useLanguages as any).mockReturnValue({ selectedLang: "fr", fallbackLang: "en" });
      rerender();

      await waitFor(() => {
        expect(result.current.dynamicPage?.lang).toBe("fr");
      });

      expect(result.current.dynamicPage?.manual).toBe(true);
      expect(result.current.dynamicPage?.identifier).toBe("typed-slug");
      expect(result.current.isLangMissing).toBe(false);
      expect(mockFetchAPI).not.toHaveBeenCalledWith(
        "https://api.test",
        expect.objectContaining({ data: expect.objectContaining({ identifier: "typed-slug" }) }),
      );
    });

    it("should expose a failed lookup so it can be opened anyway", async () => {
      mockReadUrlSlug.mockReturnValue("ghost");
      mockFetchAPI.mockResolvedValue([]);

      const { result } = renderHook(() => useDynamicPageSelector(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLangMissing).toBe(true);
      });
      expect(result.current.failedLookupIdentifier).toBe("ghost");

      act(() => {
        result.current.selectManualPage("ghost");
      });

      expect(result.current.isLangMissing).toBe(false);
      expect(result.current.failedLookupIdentifier).toBeNull();
      expect(result.current.dynamicPage?.manual).toBe(true);
    });
  });
});
