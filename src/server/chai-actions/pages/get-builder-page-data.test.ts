import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetFrameworkAdapterForTests, setFrameworkAdapter } from "~/server/framework-adapter";

const { mockGetConfigPageType, mockToChaiPageType } = vi.hoisted(() => ({
  mockGetConfigPageType: vi.fn(),
  mockToChaiPageType: vi.fn(),
}));

vi.mock("~/server/defaults", () => ({
  getConfigPageType: mockGetConfigPageType,
  toChaiPageType: mockToChaiPageType,
}));

import { GetBuilderPageDataAction } from "./get-builder-page-data";

describe("GetBuilderPageDataAction $cacheTags stripping", () => {
  beforeEach(() => {
    mockGetConfigPageType.mockReset();
    mockToChaiPageType.mockReset();
    resetFrameworkAdapterForTests();
  });

  it("strips $cacheTags from the provider result without registering tags", async () => {
    const persistentCache = vi.fn(() => vi.fn().mockResolvedValue(null));
    setFrameworkAdapter({ persistentCache: persistentCache as any });

    mockGetConfigPageType.mockReturnValue({ key: "listing-details" });
    mockToChaiPageType.mockReturnValue({
      dataProvider: vi.fn(async () => ({
        listing: { id: "listing-1" },
        $cacheTags: ["es-company-1-listings-listing-1"],
      })),
    });

    const action = new GetBuilderPageDataAction();
    const result = await action.execute({ lang: "en", pageType: "listing-details", pageProps: {} });

    expect(result).toEqual({ listing: { id: "listing-1" } });
    expect(persistentCache).not.toHaveBeenCalled();
  });

  it("returns an empty object when the page type has no provider", async () => {
    mockGetConfigPageType.mockReturnValue({ key: "page" });
    mockToChaiPageType.mockReturnValue({});

    const action = new GetBuilderPageDataAction();
    const result = await action.execute({ lang: "en", pageType: "page", pageProps: {} });

    expect(result).toEqual({});
  });
});
