import { resetFrameworkAdapterForTests, setFrameworkAdapter } from "~/server/framework-adapter";
import { ChaiBlock, ChaiPageProps } from "~/types/common";
import DataProviderPropsBlock from "./async-props-block";

describe("createCacheKey logic", () => {
  // Test the cache key generation logic that matches the actual implementation
  const createCacheKey = (args: { block: any; lang: string }): string => {
    // This matches the actual implementation in the component
    const { _id, _name, _parent, ...blockWithoutIds } = args.block;
    return JSON.stringify({
      blockType: blockWithoutIds,
      lang: args.lang,
    });
  };

  const mockBlock = {
    _id: "block-123",
    _type: "TestBlock",
    _name: "Test Block",
  };

  it("should generate consistent cache keys for identical arguments", () => {
    const args = {
      block: mockBlock,
      lang: "en",
    };

    const key1 = createCacheKey(args);
    const key2 = createCacheKey(args);

    expect(key1).toBe(key2);
    expect(key1).toContain('"lang":"en"');
    expect(key1).toContain('"blockType"');
    expect(key1).toContain('"_type":"TestBlock"');
  });

  it("should generate different cache keys for different properties", () => {
    const baseArgs = {
      block: mockBlock,
      lang: "en",
    };

    // Different languages should produce different keys
    const keyEn = createCacheKey({ ...baseArgs, lang: "en" });
    const keyEs = createCacheKey({ ...baseArgs, lang: "es" });
    expect(keyEn).not.toBe(keyEs);

    // Different block types should produce different keys
    const keyBlock1 = createCacheKey({
      ...baseArgs,
      block: { ...mockBlock, _type: "Block1" },
    });
    const keyBlock2 = createCacheKey({
      ...baseArgs,
      block: { ...mockBlock, _type: "Block2" },
    });
    expect(keyBlock1).not.toBe(keyBlock2);

    // Block IDs should NOT affect cache keys (they are omitted)
    const keyBlockId1 = createCacheKey({
      ...baseArgs,
      block: { ...mockBlock, _id: "id1" },
    });
    const keyBlockId2 = createCacheKey({
      ...baseArgs,
      block: { ...mockBlock, _id: "id2" },
    });
    expect(keyBlockId1).toBe(keyBlockId2); // Should be the same since _id is omitted
  });

  it("should omit block internal fields from cache key", () => {
    const blockWithInternalFields = {
      _id: "should-be-omitted",
      _name: "should-be-omitted",
      _parent: "should-be-omitted",
      _type: "TestBlock",
      customProp: "should-be-included",
    };

    const args = {
      block: blockWithInternalFields,
      lang: "en",
    };

    expect(() => createCacheKey(args)).not.toThrow();
    const key = createCacheKey(args);

    // Should not throw and should generate a valid key
    expect(key).toBeTruthy();
    expect(key).toContain('"lang":"en"');
    expect(key).toContain('"_type":"TestBlock"');
    expect(key).toContain('"customProp":"should-be-included"');

    // Should NOT contain internal fields
    expect(key).not.toContain('"_id"');
    expect(key).not.toContain('"_name"');
    expect(key).not.toContain('"_parent"');
  });
});

describe("DataProviderPropsBlock", () => {
  // Use unique IDs for each test to avoid cache collisions
  let testCounter = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    testCounter++;
  });

  it("should call dataProvider and pass data to children", async () => {
    const mockBlock = {
      _id: `test-block-${testCounter}`,
      _type: "TestBlock",
      _name: "Test Block",
    } as ChaiBlock;

    const mockPageProps = {
      page: {
        _id: `test-page-${testCounter}`,
        name: "Test Page",
        slug: "test-page",
      },
      slug: "test-page",
    } as ChaiPageProps;

    const mockData = { data: "test-data", value: 123 };
    const mockDataProvider = vi.fn().mockResolvedValue(mockData);
    const mockChildren = vi.fn().mockReturnValue("Test Content");

    const props = {
      lang: "en",
      pageProps: mockPageProps,
      block: mockBlock,
      dataProvider: mockDataProvider,
      draft: false,
      children: mockChildren,
    };

    const result = await DataProviderPropsBlock(props);

    expect(mockDataProvider).toHaveBeenCalledWith({
      pageProps: mockPageProps,
      block: mockBlock,
      lang: "en",
      draft: false,
      inBuilder: false,
    });
    expect(mockChildren).toHaveBeenCalledWith(mockData);
    expect(result).toBe("Test Content");
  });

  it("should strip $cacheTags from children props and register them when live", async () => {
    const mockBlock = {
      _id: `tags-block-${testCounter}`,
      _type: "TagsBlock",
      _name: "Tags Block",
    } as ChaiBlock;

    const mockPageProps = {
      page: {
        _id: `tags-page-${testCounter}`,
        name: "Tags Page",
        slug: "tags-page",
      },
      slug: "tags-page",
    } as ChaiPageProps;

    const wrapped = vi.fn().mockResolvedValue(null);
    const persistentCache = vi.fn(() => wrapped);
    setFrameworkAdapter({ persistentCache: persistentCache as any });

    const mockData = {
      data: "test-data",
      value: 123,
      $cacheTags: ["es-company-1-listings"],
    };
    const mockDataProvider = vi.fn().mockResolvedValue(mockData);
    const mockChildren = vi.fn().mockReturnValue("Test Content");

    const props = {
      lang: "en",
      pageProps: mockPageProps,
      block: mockBlock,
      dataProvider: mockDataProvider,
      draft: false,
      children: mockChildren,
    };

    await DataProviderPropsBlock(props);

    expect(mockChildren).toHaveBeenCalledWith({
      data: "test-data",
      value: 123,
    });
    expect(persistentCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["chai-render-tags", "es-company-1-listings"],
      { revalidate: false, tags: ["es-company-1-listings"] },
    );
    resetFrameworkAdapterForTests();
  });

  it("should strip $cacheTags without registering them in draft mode", async () => {
    const mockBlock = {
      _id: `draft-tags-block-${testCounter}`,
      _type: "DraftTagsBlock",
      _name: "Draft Tags Block",
    } as ChaiBlock;

    const mockPageProps = {
      page: {
        _id: `draft-tags-page-${testCounter}`,
        name: "Draft Tags Page",
        slug: "draft-tags-page",
      },
      slug: "draft-tags-page",
    } as ChaiPageProps;

    const persistentCache = vi.fn(() => vi.fn().mockResolvedValue(null));
    setFrameworkAdapter({ persistentCache: persistentCache as any });

    const mockData = {
      data: "test-data",
      $cacheTags: ["es-company-1-listings"],
    };
    const mockDataProvider = vi.fn().mockResolvedValue(mockData);
    const mockChildren = vi.fn().mockReturnValue("Test Content");

    const props = {
      lang: "en",
      pageProps: mockPageProps,
      block: mockBlock,
      dataProvider: mockDataProvider,
      draft: true,
      children: mockChildren,
    };

    await DataProviderPropsBlock(props);

    expect(mockChildren).toHaveBeenCalledWith({ data: "test-data" });
    expect(persistentCache).not.toHaveBeenCalled();
    resetFrameworkAdapterForTests();
  });

  it("should handle synchronous dataProvider", async () => {
    const mockBlock = {
      _id: `sync-block-${testCounter}`,
      _type: "SyncBlock",
      _name: "Sync Block",
    } as ChaiBlock;

    const mockPageProps = {
      page: {
        _id: `sync-page-${testCounter}`,
        name: "Sync Page",
        slug: "sync-page",
      },
      slug: "sync-page",
    } as ChaiPageProps;

    const mockData = { data: "sync-data" };
    const mockDataProvider = vi.fn().mockReturnValue(mockData);
    const mockChildren = vi.fn().mockReturnValue("Sync Content");

    const props = {
      lang: "en",
      pageProps: mockPageProps,
      block: mockBlock,
      dataProvider: mockDataProvider,
      draft: false,
      children: mockChildren,
    };

    const result = await DataProviderPropsBlock(props);

    expect(mockChildren).toHaveBeenCalledWith(mockData);
    expect(result).toBe("Sync Content");
  });

  it("should handle dataProvider errors", async () => {
    const mockBlock = {
      _id: `error-block-${testCounter}`,
      _type: "ErrorBlock",
      _name: "Error Block",
    } as ChaiBlock;

    const mockPageProps = {
      page: {
        _id: `error-page-${testCounter}`,
        name: "Error Page",
        slug: "error-page",
      },
      slug: "error-page",
    } as ChaiPageProps;

    const mockError = new Error("DataProvider failed");
    const mockDataProvider = vi.fn().mockRejectedValue(mockError);
    const mockChildren = vi.fn().mockReturnValue("Error Content");

    const props = {
      lang: "en",
      pageProps: mockPageProps,
      block: mockBlock,
      dataProvider: mockDataProvider,
      draft: false,
      children: mockChildren,
    };

    await expect(DataProviderPropsBlock(props)).rejects.toThrow("DataProvider failed");
  });
});

describe("DataProviderPropsBlock - Memoization Behavior", () => {
  let cacheTestCounter = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheTestCounter++;
  });

  it("should demonstrate the component works with memoization", async () => {
    const mockBlock = {
      _id: `cache-demo-block-${cacheTestCounter}`,
      _type: "CacheDemoBlock",
      _name: "Cache Demo Block",
    } as ChaiBlock;

    const mockPageProps = {
      page: {
        _id: `cache-demo-page-${cacheTestCounter}`,
        name: "Cache Demo Page",
        slug: "cache-demo-page",
      },
      slug: "cache-demo-page",
    } as ChaiPageProps;

    const mockDataProvider = vi.fn().mockResolvedValue({ data: "cached-data" });
    const mockChildren = vi.fn().mockReturnValue("Cached Content");

    const props = {
      lang: "en",
      pageProps: mockPageProps,
      block: mockBlock,
      dataProvider: mockDataProvider,
      draft: false,
      children: mockChildren,
    };

    const result = await DataProviderPropsBlock(props);

    expect(mockDataProvider).toHaveBeenCalledWith({
      pageProps: mockPageProps,
      block: mockBlock,
      lang: "en",
      draft: false,
      inBuilder: false,
    });
    expect(result).toBe("Cached Content");
  });

  it("should handle calls with different arguments (different cache keys)", async () => {
    const mockBlock = {
      _id: `multi-lang-block-${cacheTestCounter}`,
      _type: "MultiLangBlock",
      _name: "Multi Lang Block",
    } as ChaiBlock;

    const mockPageProps = {
      page: {
        _id: `multi-lang-page-${cacheTestCounter}`,
        name: "Multi Lang Page",
        slug: "multi-lang-page",
      },
      slug: "multi-lang-page",
    } as ChaiPageProps;

    const mockDataProvider = vi
      .fn()
      .mockResolvedValueOnce({ data: "en-data" })
      .mockResolvedValueOnce({ data: "es-data" });
    const mockChildren = vi.fn().mockReturnValue("Content");

    const baseProps = {
      pageProps: mockPageProps,
      block: mockBlock,
      dataProvider: mockDataProvider,
      draft: false,
      children: mockChildren,
    };

    // These should have different cache keys due to different languages
    await DataProviderPropsBlock({ ...baseProps, lang: "en" });
    await DataProviderPropsBlock({ ...baseProps, lang: "es" });

    // Should be called twice because different languages create different cache keys
    expect(mockDataProvider).toHaveBeenCalledTimes(2);
    expect(mockDataProvider).toHaveBeenNthCalledWith(1, expect.objectContaining({ lang: "en" }));
    expect(mockDataProvider).toHaveBeenNthCalledWith(2, expect.objectContaining({ lang: "es" }));
  });
});
