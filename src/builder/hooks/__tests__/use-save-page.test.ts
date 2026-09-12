/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import {
  hasStructureErrorsAtom,
  hasStructureWarningsAtom,
  structureErrorsAtom,
  structureValidationValidAtom,
} from "~/builder/atoms/blocks";
import { userActionsCountAtom } from "~/builder/atoms/builder";
import { builderStore } from "~/builder/atoms/store";
import { canvasIframeAtom } from "~/builder/atoms/ui";
import { partialBlocksAtom } from "~/builder/hooks/partial-blocks/atoms";
import { builderSaveStateAtom, checkMissingTranslations, useSavePage } from "~/builder/hooks/use-save-page";
import { getRegisteredChaiBlock } from "~/registry";

vi.mock("~/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/registry")>();
  return {
    ...actual,
    getRegisteredChaiBlock: vi.fn(),
  };
});

vi.mock("~/builder/hooks/use-builder-prop", () => ({
  useBuilderProp: vi.fn(),
}));

vi.mock("~/builder/hooks/use-get-page-data", () => ({
  useGetPageData: vi.fn(),
}));

vi.mock("~/builder/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

vi.mock("~/builder/hooks/use-languages", () => ({
  useLanguages: vi.fn(),
}));

vi.mock("~/builder/hooks/use-is-page-loaded", () => ({
  useIsPageLoaded: vi.fn(),
}));

vi.mock("~/builder/hooks/use-check-structure", () => ({
  useCheckStructure: vi.fn(),
  validateStructureSync: vi.fn(() => []),
}));

vi.mock("~/builder/hooks/use-theme", () => ({
  useTheme: vi.fn(),
  useThemeOptions: vi.fn(),
}));

const mockGetRegisteredChaiBlock = getRegisteredChaiBlock as any;

describe("checkMissingTranslations", () => {
  beforeEach(() => {
    mockGetRegisteredChaiBlock.mockReset();

    mockGetRegisteredChaiBlock.mockImplementation((blockType: string) => {
      if (blockType === "TextBlock") {
        return { i18nProps: ["title", "content"] };
      }
      if (blockType === "SimpleBlock") {
        return {};
      }
      if (blockType === "UnknownBlock" || blockType === "ErrorBlock") {
        return null;
      }
      return { i18nProps: ["title", "content"] };
    });
  });

  it("skips object page-ref links with no lang value", () => {
    mockGetRegisteredChaiBlock.mockImplementation((blockType: string) => {
      if (blockType === "LinkBlock") return { label: "Link", i18nProps: ["link"] };
      return { i18nProps: ["title"] };
    });
    const PAGE_REF = "pageType:page:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const blocks = [
      {
        _type: "LinkBlock",
        link: { type: "pageType", href: PAGE_REF },
        // no `link-es` — resolved per language at render time
      },
    ];
    expect(checkMissingTranslations(blocks, "es")).toBe(false);
  });

  it("skips bare-string page-ref links", () => {
    mockGetRegisteredChaiBlock.mockImplementation((blockType: string) => {
      if (blockType === "LinkBlock") return { label: "Link", i18nProps: ["link"] };
      return { i18nProps: ["title"] };
    });
    const PAGE_REF = "pageType:page:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const blocks = [{ _type: "LinkBlock", link: PAGE_REF }];
    expect(checkMissingTranslations(blocks, "es")).toBe(false);
  });

  it("still flags external links missing a translation", () => {
    mockGetRegisteredChaiBlock.mockImplementation((blockType: string) => {
      if (blockType === "LinkBlock") return { label: "Link", i18nProps: ["link"] };
      return { i18nProps: ["title"] };
    });
    const blocks = [
      {
        _type: "LinkBlock",
        link: { type: "url", href: "https://example.com" },
      },
    ];
    expect(checkMissingTranslations(blocks, "es")).toBe(true);
  });

  it("should return false when lang is empty", () => {
    const blocks = [{ _type: "TextBlock", title: "Test" }];
    const result = checkMissingTranslations(blocks, "");
    expect(result).toBe(false);
  });

  it("should return false when lang is null/undefined", () => {
    const blocks = [{ _type: "TextBlock", title: "Test" }];
    expect(checkMissingTranslations(blocks, null as any)).toBe(false);
    expect(checkMissingTranslations(blocks, undefined as any)).toBe(false);
  });

  it("should return true when translations are missing", () => {
    const blocks = [
      {
        _type: "TextBlock",
        title: "Test Title",
        content: "Test Content",
        // Missing title-es and content-es
      },
    ];

    const result = checkMissingTranslations(blocks, "es");
    expect(result).toBe(true);
  });

  it("should return false when all translations are present", () => {
    const blocks = [
      {
        _type: "TextBlock",
        title: "Test Title",
        content: "Test Content",
        "title-es": "Título de Prueba",
        "content-es": "Contenido de Prueba",
      },
    ];

    const result = checkMissingTranslations(blocks, "es");
    expect(result).toBe(false);
  });

  it("should return true when some translations are empty", () => {
    const blocks = [
      {
        _type: "TextBlock",
        title: "Test Title",
        content: "Test Content",
        "title-es": "", // Empty translation
        "content-es": "Contenido de Prueba",
      },
    ];

    const result = checkMissingTranslations(blocks, "es");
    expect(result).toBe(true);
  });

  it("should return false for blocks without _type", () => {
    const blocks = [
      {
        // No _type property
        title: "Test Title",
      },
    ];

    const result = checkMissingTranslations(blocks, "es");
    expect(result).toBe(false);
  });

  it("should skip PartialBlock types", () => {
    const blocks = [
      {
        _type: "PartialBlock",
        title: "Test Title",
        // PartialBlock should be skipped regardless of missing translations
      },
    ];

    const result = checkMissingTranslations(blocks, "es");
    expect(result).toBe(false);
  });

  it("should return false for blocks with no registered definition", () => {
    const blocks = [
      {
        _type: "UnknownBlock",
        title: "Test Title",
      },
    ];

    const result = checkMissingTranslations(blocks, "es");
    expect(result).toBe(false);
  });

  it("should return false for blocks with no i18nProps", () => {
    const blocks = [
      {
        _type: "SimpleBlock",
        title: "Test Title",
      },
    ];

    const result = checkMissingTranslations(blocks, "es");
    expect(result).toBe(false);
  });

  it("should handle getRegisteredChaiBlock throwing error", () => {
    const blocks = [
      {
        _type: "ErrorBlock",
        title: "Test Title",
      },
    ];

    const result = checkMissingTranslations(blocks, "es");
    expect(result).toBe(false);
  });

  it("should handle empty blocks array", () => {
    const result = checkMissingTranslations([], "es");
    expect(result).toBe(false);
  });

  it("should handle multiple blocks with mixed translation status", () => {
    const blocks = [
      {
        _type: "TextBlock",
        title: "Title 1",
        "title-es": "Título 1", // Has translation
      },
      {
        _type: "TextBlock",
        title: "Title 2",
        // Missing translation - should return true
      },
    ];

    const result = checkMissingTranslations(blocks, "es");
    expect(result).toBe(true);
  });

  it("should handle multiple blocks all with translations", () => {
    // Override mock for this test to only check title
    mockGetRegisteredChaiBlock.mockImplementation((blockType: string) => {
      if (blockType === "TextBlock") {
        return { i18nProps: ["title"] }; // Only check title for this test
      }
      return { i18nProps: ["title"] };
    });

    const blocks = [
      {
        _type: "TextBlock",
        title: "Title 1",
        "title-es": "Título 1",
      },
      {
        _type: "TextBlock",
        title: "Title 2",
        "title-es": "Título 2",
      },
    ];

    const result = checkMissingTranslations(blocks, "es");
    expect(result).toBe(false);
  });
});

describe("useSavePage - prevent save when no unsaved changes", () => {
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnSaveStateChange: ReturnType<typeof vi.fn>;
  let mockGetPageData: ReturnType<typeof vi.fn>;
  let mockHasPermission: ReturnType<typeof vi.fn>;
  let mockCheckStructure: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockOnSave = vi.fn(async () => {});
    mockOnSaveStateChange = vi.fn();
    mockGetPageData = vi.fn(() => ({ blocks: [] }));
    mockHasPermission = vi.fn(() => true);
    mockCheckStructure = vi.fn();

    const { useBuilderProp } = await import("~/builder/hooks/use-builder-prop");
    const { useGetPageData } = await import("~/builder/hooks/use-get-page-data");
    const { usePermissions } = await import("~/builder/hooks/use-permissions");
    const { useLanguages } = await import("~/builder/hooks/use-languages");
    const { useIsPageLoaded } = await import("~/builder/hooks/use-is-page-loaded");
    const { useCheckStructure } = await import("~/builder/hooks/use-check-structure");

    (useBuilderProp as any).mockImplementation((key: string, defaultValue: any) => {
      if (key === "onSave") return mockOnSave;
      if (key === "onSaveStateChange") return mockOnSaveStateChange;
      return defaultValue;
    });

    (useGetPageData as any).mockReturnValue(mockGetPageData);
    (usePermissions as any).mockReturnValue({
      hasPermission: mockHasPermission,
    });
    (useLanguages as any).mockReturnValue({
      selectedLang: "en",
      fallbackLang: "en",
    });
    (useIsPageLoaded as any).mockReturnValue([true]);
    (useCheckStructure as any).mockReturnValue(mockCheckStructure);

    // Reset atoms
    builderStore.set(builderSaveStateAtom, "SAVED");
    builderStore.set(userActionsCountAtom, 0);
  });

  it("should not call onSave when saveState is SAVED and force is false", async () => {
    builderStore.set(builderSaveStateAtom, "SAVED");

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(mockOnSaveStateChange).not.toHaveBeenCalled();
  });

  it("should call onSave when saveState is UNSAVED", async () => {
    builderStore.set(builderSaveStateAtom, "UNSAVED");

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSaveStateChange).toHaveBeenCalledWith("SAVING");
  });

  it("should call onSave when force is true even if saveState is SAVED", async () => {
    builderStore.set(builderSaveStateAtom, "SAVED");

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(true);
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it("should call onSave when saveState is SAVING", async () => {
    builderStore.set(builderSaveStateAtom, "SAVING");

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it("should not call onSave when no permission and not forced", async () => {
    builderStore.set(builderSaveStateAtom, "UNSAVED");
    mockHasPermission.mockReturnValue(false);

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("should not call onSave when page not loaded and not forced", async () => {
    builderStore.set(builderSaveStateAtom, "UNSAVED");
    const { useIsPageLoaded } = await import("~/builder/hooks/use-is-page-loaded");
    (useIsPageLoaded as any).mockReturnValue([false]);

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("should reset actions count to 0 after save", async () => {
    builderStore.set(builderSaveStateAtom, "UNSAVED");
    builderStore.set(userActionsCountAtom, 5);

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(builderStore.get(userActionsCountAtom)).toBe(0);
  });

  it("should pass autoSave: true to onSave callback in savePageAsync", async () => {
    builderStore.set(builderSaveStateAtom, "UNSAVED");

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        autoSave: true,
      }),
    );
  });

  it("should pass blocks to onSave callback", async () => {
    builderStore.set(builderSaveStateAtom, "UNSAVED");
    const mockBlocks = [{ _id: "1", _type: "Container" }];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        blocks: mockBlocks,
      }),
    );
  });

  it("should not call checkStructure when using savePageAsync", async () => {
    builderStore.set(builderSaveStateAtom, "UNSAVED");
    const mockBlocks = [{ _id: "1", _type: "Container" }];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockCheckStructure).not.toHaveBeenCalled();
  });
});

describe("useSavePage - getAllPartialIds", () => {
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnSaveStateChange: ReturnType<typeof vi.fn>;
  let mockGetPageData: ReturnType<typeof vi.fn>;
  let mockHasPermission: ReturnType<typeof vi.fn>;
  let mockCheckStructure: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockOnSave = vi.fn(async () => {});
    mockOnSaveStateChange = vi.fn();
    mockGetPageData = vi.fn(() => ({ blocks: [] }));
    mockHasPermission = vi.fn(() => true);
    mockCheckStructure = vi.fn();

    const { useBuilderProp } = await import("~/builder/hooks/use-builder-prop");
    const { useGetPageData } = await import("~/builder/hooks/use-get-page-data");
    const { useTheme, useThemeOptions } = await import("~/builder/hooks/use-theme");
    const { usePermissions } = await import("~/builder/hooks/use-permissions");
    const { useLanguages } = await import("~/builder/hooks/use-languages");
    const { useIsPageLoaded } = await import("~/builder/hooks/use-is-page-loaded");
    const { useCheckStructure } = await import("~/builder/hooks/use-check-structure");

    (useBuilderProp as any).mockImplementation((key: string, defaultValue: any) => {
      if (key === "onSave") return mockOnSave;
      if (key === "onSaveStateChange") return mockOnSaveStateChange;
      return defaultValue;
    });

    (useGetPageData as any).mockReturnValue(mockGetPageData);
    (useTheme as any).mockReturnValue([{}]);
    (useThemeOptions as any).mockReturnValue({});
    (usePermissions as any).mockReturnValue({
      hasPermission: mockHasPermission,
    });
    (useLanguages as any).mockReturnValue({
      selectedLang: "en",
      fallbackLang: "en",
    });
    (useIsPageLoaded as any).mockReturnValue([true]);
    (useCheckStructure as any).mockReturnValue(mockCheckStructure);

    // Reset atoms
    builderStore.set(builderSaveStateAtom, "UNSAVED");
    builderStore.set(userActionsCountAtom, 0);
    builderStore.set(partialBlocksAtom, {});
  });

  it("should return empty array when no partial blocks exist", async () => {
    const mockBlocks = [{ _id: "1", _type: "Container" }];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        partialIds: [],
      }),
    );
  });

  it("should return partial IDs from top-level PartialBlock", async () => {
    const mockBlocks = [
      { _id: "1", _type: "Container" },
      { _id: "2", _type: "PartialBlock", partialBlockId: "partial-1" },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    builderStore.set(partialBlocksAtom, {
      "partial-1": { blocks: [], dependencies: [], status: "loaded" },
    });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        partialIds: ["partial-1"],
      }),
    );
  });

  it("should return partial IDs from GlobalBlock type", async () => {
    const mockBlocks = [{ _id: "1", _type: "GlobalBlock", partialBlockId: "global-1" }];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    builderStore.set(partialBlocksAtom, {
      "global-1": { blocks: [], dependencies: [], status: "loaded" },
    });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        partialIds: ["global-1"],
      }),
    );
  });

  it("should collect nested partial IDs from dependencies", async () => {
    const mockBlocks = [{ _id: "1", _type: "PartialBlock", partialBlockId: "partial-1" }];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    builderStore.set(partialBlocksAtom, {
      "partial-1": {
        blocks: [{ _id: "nested", _type: "PartialBlock", partialBlockId: "partial-2" }],
        dependencies: ["partial-2"],
        status: "loaded",
      },
      "partial-2": { blocks: [], dependencies: [], status: "loaded" },
    });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        partialIds: expect.arrayContaining(["partial-1", "partial-2"]),
      }),
    );
  });

  it("should collect deeply nested partial IDs", async () => {
    const mockBlocks = [{ _id: "1", _type: "PartialBlock", partialBlockId: "partial-1" }];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    builderStore.set(partialBlocksAtom, {
      "partial-1": {
        blocks: [],
        dependencies: ["partial-2"],
        status: "loaded",
      },
      "partial-2": {
        blocks: [],
        dependencies: ["partial-3"],
        status: "loaded",
      },
      "partial-3": { blocks: [], dependencies: [], status: "loaded" },
    });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        partialIds: expect.arrayContaining(["partial-1", "partial-2", "partial-3"]),
      }),
    );
  });

  it("should return unique partial IDs when same partial is used multiple times", async () => {
    const mockBlocks = [
      { _id: "1", _type: "PartialBlock", partialBlockId: "partial-1" },
      { _id: "2", _type: "PartialBlock", partialBlockId: "partial-1" },
      { _id: "3", _type: "PartialBlock", partialBlockId: "partial-2" },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    builderStore.set(partialBlocksAtom, {
      "partial-1": { blocks: [], dependencies: [], status: "loaded" },
      "partial-2": { blocks: [], dependencies: [], status: "loaded" },
    });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    const call = mockOnSave.mock.calls[0][0];
    expect(call.partialIds).toHaveLength(2);
    expect(call.partialIds).toContain("partial-1");
    expect(call.partialIds).toContain("partial-2");
  });

  it("should handle circular dependencies without infinite loop", async () => {
    const mockBlocks = [{ _id: "1", _type: "PartialBlock", partialBlockId: "partial-1" }];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    builderStore.set(partialBlocksAtom, {
      "partial-1": {
        blocks: [],
        dependencies: ["partial-2"],
        status: "loaded",
      },
      "partial-2": {
        blocks: [],
        dependencies: ["partial-1"], // circular reference
        status: "loaded",
      },
    });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        partialIds: expect.arrayContaining(["partial-1", "partial-2"]),
      }),
    );
  });

  it("should skip partials that are not loaded", async () => {
    const mockBlocks = [{ _id: "1", _type: "PartialBlock", partialBlockId: "partial-1" }];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    builderStore.set(partialBlocksAtom, {
      "partial-1": {
        blocks: [],
        dependencies: ["partial-2"],
        status: "loading", // not loaded yet
      },
    });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    const call = mockOnSave.mock.calls[0][0];
    expect(call.partialIds).toContain("partial-1");
    expect(call.partialIds).not.toContain("partial-2");
  });

  it("should handle mixed PartialBlock and GlobalBlock types", async () => {
    const mockBlocks = [
      { _id: "1", _type: "PartialBlock", partialBlockId: "partial-1" },
      { _id: "2", _type: "GlobalBlock", partialBlockId: "global-1" },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    builderStore.set(partialBlocksAtom, {
      "partial-1": { blocks: [], dependencies: [], status: "loaded" },
      "global-1": { blocks: [], dependencies: [], status: "loaded" },
    });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        partialIds: expect.arrayContaining(["partial-1", "global-1"]),
      }),
    );
  });
});

describe("useSavePage - getLinkPageIds", () => {
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnSaveStateChange: ReturnType<typeof vi.fn>;
  let mockGetPageData: ReturnType<typeof vi.fn>;
  let mockHasPermission: ReturnType<typeof vi.fn>;
  let mockCheckStructure: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockOnSave = vi.fn(async () => {});
    mockOnSaveStateChange = vi.fn();
    mockGetPageData = vi.fn(() => ({ blocks: [] }));
    mockHasPermission = vi.fn(() => true);
    mockCheckStructure = vi.fn();

    const { useBuilderProp } = await import("~/builder/hooks/use-builder-prop");
    const { useGetPageData } = await import("~/builder/hooks/use-get-page-data");
    const { useTheme, useThemeOptions } = await import("~/builder/hooks/use-theme");
    const { usePermissions } = await import("~/builder/hooks/use-permissions");
    const { useLanguages } = await import("~/builder/hooks/use-languages");
    const { useIsPageLoaded } = await import("~/builder/hooks/use-is-page-loaded");
    const { useCheckStructure } = await import("~/builder/hooks/use-check-structure");

    (useBuilderProp as any).mockImplementation((key: string, defaultValue: any) => {
      if (key === "onSave") return mockOnSave;
      if (key === "onSaveStateChange") return mockOnSaveStateChange;
      return defaultValue;
    });

    (useGetPageData as any).mockReturnValue(mockGetPageData);
    (useTheme as any).mockReturnValue([{}]);
    (useThemeOptions as any).mockReturnValue({});
    (usePermissions as any).mockReturnValue({
      hasPermission: mockHasPermission,
    });
    (useLanguages as any).mockReturnValue({
      selectedLang: "en",
      fallbackLang: "en",
    });
    (useIsPageLoaded as any).mockReturnValue([true]);
    (useCheckStructure as any).mockReturnValue(mockCheckStructure);

    // Reset atoms
    builderStore.set(builderSaveStateAtom, "UNSAVED");
    builderStore.set(userActionsCountAtom, 0);
    builderStore.set(partialBlocksAtom, {});
  });

  it("should return empty array when no blocks have pageType links", async () => {
    const mockBlocks = [
      { _id: "1", _type: "Container" },
      { _id: "2", _type: "Link", link: { href: "/about", target: "_self" } },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: [],
      }),
    );
  });

  it("should extract UUID from Link block with pageType href", async () => {
    const mockBlocks = [
      {
        _id: "1",
        _type: "Link",
        link: {
          href: "pageType:blog:550e8400-e29b-41d4-a716-446655440000",
          target: "_self",
        },
      },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: ["550e8400-e29b-41d4-a716-446655440000"],
      }),
    );
  });

  it("should extract UUID from Button block with link prop", async () => {
    const mockBlocks = [
      {
        _id: "1",
        _type: "Button",
        link: {
          href: "pageType:page:a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          target: "_blank",
        },
      },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
      }),
    );
  });

  it("should extract UUID from any block with link prop", async () => {
    const mockBlocks = [
      {
        _id: "1",
        _type: "Image",
        link: {
          href: "pageType:product:12345678-1234-1234-1234-123456789abc",
          target: "_self",
        },
      },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: ["12345678-1234-1234-1234-123456789abc"],
      }),
    );
  });

  it("should extract UUID from custom prop keys with link object", async () => {
    const mockBlocks = [
      {
        _id: "1",
        _type: "Card",
        cardLink: {
          href: "pageType:blog:11111111-1111-1111-1111-111111111111",
          target: "_self",
        },
        ctaButton: {
          href: "pageType:page:22222222-2222-2222-2222-222222222222",
          target: "_blank",
        },
      },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: expect.arrayContaining([
          "11111111-1111-1111-1111-111111111111",
          "22222222-2222-2222-2222-222222222222",
        ]),
      }),
    );
  });

  it("should extract UUIDs from multiple blocks", async () => {
    const mockBlocks = [
      {
        _id: "1",
        _type: "Link",
        link: {
          href: "pageType:blog:11111111-1111-1111-1111-111111111111",
          target: "_self",
        },
      },
      {
        _id: "2",
        _type: "Button",
        link: {
          href: "pageType:page:22222222-2222-2222-2222-222222222222",
          target: "_blank",
        },
      },
      {
        _id: "3",
        _type: "Image",
        link: {
          href: "pageType:product:33333333-3333-3333-3333-333333333333",
          target: "_self",
        },
      },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: expect.arrayContaining([
          "11111111-1111-1111-1111-111111111111",
          "22222222-2222-2222-2222-222222222222",
          "33333333-3333-3333-3333-333333333333",
        ]),
      }),
    );
  });

  it("should return unique UUIDs when same page is linked multiple times", async () => {
    const mockBlocks = [
      {
        _id: "1",
        _type: "Link",
        link: {
          href: "pageType:blog:11111111-1111-1111-1111-111111111111",
          target: "_self",
        },
      },
      {
        _id: "2",
        _type: "Button",
        link: {
          href: "pageType:blog:11111111-1111-1111-1111-111111111111",
          target: "_blank",
        },
      },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    const call = mockOnSave.mock.calls[0][0];
    expect(call.linkPageIds).toHaveLength(1);
    expect(call.linkPageIds).toContain("11111111-1111-1111-1111-111111111111");
  });

  it("should ignore blocks with regular URL hrefs", async () => {
    const mockBlocks = [
      {
        _id: "1",
        _type: "Link",
        link: { href: "https://example.com", target: "_blank" },
      },
      { _id: "2", _type: "Button", link: { href: "/about", target: "_self" } },
      { _id: "3", _type: "Link", link: { href: "#section", target: "_self" } },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: [],
      }),
    );
  });

  it("should extract UUIDs from all props including internal ones via JSON stringify", async () => {
    const mockBlocks = [
      {
        _id: "1",
        _type: "Container",
        _internalLink: {
          href: "pageType:blog:11111111-1111-1111-1111-111111111111",
        },
        link: {
          href: "pageType:page:22222222-2222-2222-2222-222222222222",
          target: "_self",
        },
      },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    const call = mockOnSave.mock.calls[0][0];
    expect(call.linkPageIds).toHaveLength(2);
    expect(call.linkPageIds).toContain("22222222-2222-2222-2222-222222222222");
    expect(call.linkPageIds).toContain("11111111-1111-1111-1111-111111111111");
  });

  it("should handle blocks with missing link prop", async () => {
    const mockBlocks = [
      { _id: "1", _type: "Container" },
      { _id: "2", _type: "Paragraph", content: "Hello" },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: [],
      }),
    );
  });

  it("should handle blocks with null or undefined link href", async () => {
    const mockBlocks = [
      { _id: "1", _type: "Link", link: { href: null, target: "_self" } },
      {
        _id: "2",
        _type: "Button",
        link: { href: undefined, target: "_blank" },
      },
      { _id: "3", _type: "Image", link: {} },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: [],
      }),
    );
  });

  it("should handle different pageType values", async () => {
    const mockBlocks = [
      {
        _id: "1",
        _type: "Link",
        link: {
          href: "pageType:blog-post:11111111-1111-1111-1111-111111111111",
          target: "_self",
        },
      },
      {
        _id: "2",
        _type: "Link",
        link: {
          href: "pageType:product_page:22222222-2222-2222-2222-222222222222",
          target: "_self",
        },
      },
    ];
    mockGetPageData.mockReturnValue({ blocks: mockBlocks });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: expect.arrayContaining([
          "11111111-1111-1111-1111-111111111111",
          "22222222-2222-2222-2222-222222222222",
        ]),
      }),
    );
  });

  it("should handle empty blocks array", async () => {
    mockGetPageData.mockReturnValue({ blocks: [] });

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      await result.current.savePageAsync(false);
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        linkPageIds: [],
      }),
    );
  });
});

describe("useSavePage - savePage structure validation", () => {
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnSaveStateChange: ReturnType<typeof vi.fn>;
  let mockGetPageData: ReturnType<typeof vi.fn>;
  let mockHasPermission: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockOnSave = vi.fn(async () => {});
    mockOnSaveStateChange = vi.fn();
    mockGetPageData = vi.fn(() => ({ blocks: [] }));
    mockHasPermission = vi.fn(() => true);

    const { useBuilderProp } = await import("~/builder/hooks/use-builder-prop");
    const { useGetPageData } = await import("~/builder/hooks/use-get-page-data");
    const { usePermissions } = await import("~/builder/hooks/use-permissions");
    const { useLanguages } = await import("~/builder/hooks/use-languages");
    const { useIsPageLoaded } = await import("~/builder/hooks/use-is-page-loaded");
    const { useCheckStructure } = await import("~/builder/hooks/use-check-structure");

    (useBuilderProp as any).mockImplementation((key: string, defaultValue: any) => {
      if (key === "onSave") return mockOnSave;
      if (key === "onSaveStateChange") return mockOnSaveStateChange;
      return defaultValue;
    });

    (useGetPageData as any).mockReturnValue(mockGetPageData);
    (usePermissions as any).mockReturnValue({ hasPermission: mockHasPermission });
    (useLanguages as any).mockReturnValue({ selectedLang: "en", fallbackLang: "en" });
    (useIsPageLoaded as any).mockReturnValue([true]);
    (useCheckStructure as any).mockReturnValue(vi.fn());

    // Reset atoms
    builderStore.set(builderSaveStateAtom, "UNSAVED");
    builderStore.set(userActionsCountAtom, 0);
    builderStore.set(partialBlocksAtom, {});
    builderStore.set(structureErrorsAtom, []);
    builderStore.set(structureValidationValidAtom, true);
    builderStore.set(hasStructureErrorsAtom, false);
    builderStore.set(hasStructureWarningsAtom, false);
    builderStore.set(canvasIframeAtom, null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call validateStructureSync and update error atoms when iframe is available", async () => {
    const mockErrors = [{ severity: "error" as const, message: "Broken structure", blockId: "1" }];
    const { validateStructureSync } = await import("~/builder/hooks/use-check-structure");
    (validateStructureSync as any).mockReturnValue(mockErrors);

    const mockDocument = document;
    builderStore.set(canvasIframeAtom, {
      contentDocument: mockDocument,
      contentWindow: { document: mockDocument },
    } as unknown as HTMLIFrameElement);

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      result.current.savePage(false, true);
      await vi.runAllTimersAsync();
    });

    expect(validateStructureSync).toHaveBeenCalledWith(mockDocument);
    expect(builderStore.get(structureErrorsAtom)).toEqual(mockErrors);
    expect(builderStore.get(hasStructureErrorsAtom)).toBe(true);
    expect(builderStore.get(hasStructureWarningsAtom)).toBe(false);
    expect(builderStore.get(structureValidationValidAtom)).toBe(false);
  });

  it("should set hasStructureWarnings when validateStructureSync returns warnings", async () => {
    const mockWarnings = [{ severity: "warning" as const, message: "Minor issue", blockId: "1" }];
    const { validateStructureSync } = await import("~/builder/hooks/use-check-structure");
    (validateStructureSync as any).mockReturnValue(mockWarnings);

    const mockDocument = document;
    builderStore.set(canvasIframeAtom, {
      contentDocument: mockDocument,
      contentWindow: { document: mockDocument },
    } as unknown as HTMLIFrameElement);

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      result.current.savePage(false, true);
      await vi.runAllTimersAsync();
    });

    expect(builderStore.get(structureErrorsAtom)).toEqual(mockWarnings);
    expect(builderStore.get(hasStructureWarningsAtom)).toBe(true);
    expect(builderStore.get(hasStructureErrorsAtom)).toBe(false);
    expect(builderStore.get(structureValidationValidAtom)).toBe(true);
  });

  it("should skip structure validation and not update atoms when iframe is not available", async () => {
    const { validateStructureSync } = await import("~/builder/hooks/use-check-structure");
    builderStore.set(canvasIframeAtom, null);

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      result.current.savePage(false, true);
      await vi.runAllTimersAsync();
    });

    expect(validateStructureSync).not.toHaveBeenCalled();
    expect(builderStore.get(structureErrorsAtom)).toEqual([]);
    expect(builderStore.get(hasStructureErrorsAtom)).toBe(false);
  });

  it("should still call onSave even when validateStructureSync finds errors", async () => {
    const mockErrors = [{ severity: "error" as const, message: "Structural error", blockId: "1" }];
    const { validateStructureSync } = await import("~/builder/hooks/use-check-structure");
    (validateStructureSync as any).mockReturnValue(mockErrors);

    const mockDocument = document;
    builderStore.set(canvasIframeAtom, {
      contentDocument: mockDocument,
      contentWindow: { document: mockDocument },
    } as unknown as HTMLIFrameElement);

    const { result } = renderHook(() => useSavePage());

    await act(async () => {
      result.current.savePage(false, true);
      await vi.runAllTimersAsync();
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });
});
