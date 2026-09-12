import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetFrameworkAdapterForTests, setFrameworkAdapter } from "~/server/framework-adapter";
import { ChaiBlock } from "~/types/common";

const { mockFetchRepeaterItems, mockGetRegisteredChaiBlock } = vi.hoisted(() => ({
  mockFetchRepeaterItems: vi.fn(),
  mockGetRegisteredChaiBlock: vi.fn(),
}));

vi.mock("~/server/repeater-data/fetch-repeater-items", () => ({
  fetchRepeaterItems: mockFetchRepeaterItems,
}));

vi.mock("~/registry/v2/runtime/core", () => ({
  getRegisteredChaiBlock: mockGetRegisteredChaiBlock,
}));

vi.mock("~/server/defaults/block-data-providers", () => ({
  resolveBlockDataProvider: vi.fn(),
}));

// The action imports the ~/server/defaults barrel, which constructs the action
// registry and would circularly import the class under test — mock it out.
vi.mock("~/server/defaults", () => ({
  fetchConfigGlobalData: vi.fn(async () => ({})),
  getConfigPageType: vi.fn(),
  toChaiPageType: vi.fn(),
}));

vi.mock("~/server/repeater-data/build-repeater-query", () => ({
  blockFiltersHaveBindings: vi.fn(() => false),
}));

import { GetBlockAsyncPropsAction } from "./get-block-async-props";

function spyPersistentCache() {
  const persistentCache = vi.fn(() => vi.fn().mockResolvedValue(null));
  setFrameworkAdapter({ persistentCache: persistentCache as any });
  return persistentCache;
}

describe("GetBlockAsyncPropsAction $cacheTags stripping", () => {
  beforeEach(() => {
    mockFetchRepeaterItems.mockReset();
    mockGetRegisteredChaiBlock.mockReset();
    resetFrameworkAdapterForTests();
  });

  it("strips $cacheTags from repeater results without registering tags", async () => {
    const persistentCache = spyPersistentCache();
    mockFetchRepeaterItems.mockResolvedValue({
      items: [{ id: 1 }],
      totalItems: 1,
      $cacheTags: ["es-company-1-listings"],
    });

    const action = new GetBlockAsyncPropsAction();
    const result = await action.execute({
      block: { _id: "b1", _type: "Repeater", repeaterItems: "{{#listings}}" } as ChaiBlock,
      pageProps: {},
      lang: "en",
    });

    expect(result).toEqual({ items: [{ id: 1 }], totalItems: 1 });
    expect(persistentCache).not.toHaveBeenCalled();
  });

  it("strips $cacheTags from dataProvider results without registering tags", async () => {
    const persistentCache = spyPersistentCache();
    mockGetRegisteredChaiBlock.mockReturnValue({
      dataProvider: vi.fn().mockResolvedValue({ locations: [{ id: "o1" }], $cacheTags: ["es-company-1-offices"] }),
    });

    const action = new GetBlockAsyncPropsAction();
    const result = await action.execute({
      block: { _id: "b2", _type: "OfficeLocationsMap" } as ChaiBlock,
      pageProps: {},
      lang: "en",
    });

    expect(result).toEqual({ locations: [{ id: "o1" }] });
    expect(persistentCache).not.toHaveBeenCalled();
  });
});
