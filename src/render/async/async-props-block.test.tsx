import { afterEach, describe, expect, it, vi } from "vitest";
import { resetFrameworkAdapterForTests, setFrameworkAdapter } from "~/server/framework-adapter";
import { ChaiBlock, ChaiPageProps } from "~/types/common";
import AsyncDataProviderPropsBlock from "./async-props-block";

const mockBlock = { _id: "block-1", _type: "TestBlock" } as ChaiBlock;
const mockPageProps = { slug: "test-page" } as ChaiPageProps;

const baseProps = {
  lang: "en",
  pageProps: mockPageProps,
  block: mockBlock,
};

describe("AsyncDataProviderPropsBlock", () => {
  afterEach(() => {
    resetFrameworkAdapterForTests();
  });

  it("awaits the provider promise and passes data to children", async () => {
    const mockChildren = vi.fn().mockReturnValue("Content");
    const result = await AsyncDataProviderPropsBlock({
      ...baseProps,
      dataProvider: Promise.resolve({ data: "async-data" }),
      draft: false,
      children: mockChildren,
    });
    expect(mockChildren).toHaveBeenCalledWith({ data: "async-data" });
    expect(result).toBe("Content");
  });

  it("strips $cacheTags from children props and registers them when live", async () => {
    const wrapped = vi.fn().mockResolvedValue(null);
    const persistentCache = vi.fn(() => wrapped);
    setFrameworkAdapter({ persistentCache: persistentCache as any });

    const mockChildren = vi.fn().mockReturnValue("Content");
    await AsyncDataProviderPropsBlock({
      ...baseProps,
      dataProvider: Promise.resolve({ data: "async-data", $cacheTags: ["es-company-1-offices"] }),
      draft: false,
      children: mockChildren,
    });

    expect(mockChildren).toHaveBeenCalledWith({ data: "async-data" });
    expect(persistentCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["chai-render-tags", "es-company-1-offices"],
      { revalidate: false, tags: ["es-company-1-offices"] },
    );
  });

  it("strips $cacheTags without registering them in draft mode", async () => {
    const persistentCache = vi.fn(() => vi.fn().mockResolvedValue(null));
    setFrameworkAdapter({ persistentCache: persistentCache as any });

    const mockChildren = vi.fn().mockReturnValue("Content");
    await AsyncDataProviderPropsBlock({
      ...baseProps,
      dataProvider: Promise.resolve({ data: "async-data", $cacheTags: ["es-company-1-offices"] }),
      draft: true,
      children: mockChildren,
    });

    expect(mockChildren).toHaveBeenCalledWith({ data: "async-data" });
    expect(persistentCache).not.toHaveBeenCalled();
  });
});
