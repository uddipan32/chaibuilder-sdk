import { handlei18N } from "~/builder/hooks/use-html-to-blocks";
import { getRegisteredChaiBlock } from "~/registry";
import { ChaiBlock } from "~/types/common";

// Mock the runtime module
vi.mock("~/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/registry")>();
  return {
    ...actual,
    getRegisteredChaiBlock: vi.fn(),
  };
});

describe("handlei18N", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return blocks unchanged when no block definition exists", () => {
    const blocks: ChaiBlock[] = [{ _type: "Paragraph", _id: "1", content: "Hello" }];
    const currentBlocks: ChaiBlock[] = [];

    vi.mocked(getRegisteredChaiBlock).mockReturnValue(undefined);

    const result = handlei18N(blocks, currentBlocks);

    expect(result).toEqual(blocks);
    expect(getRegisteredChaiBlock).toHaveBeenCalledWith("Paragraph");
  });

  it("should return blocks unchanged when block definition has no i18nProps", () => {
    const blocks: ChaiBlock[] = [{ _type: "Paragraph", _id: "1", content: "Hello" }];
    const currentBlocks: ChaiBlock[] = [];

    vi.mocked(getRegisteredChaiBlock).mockReturnValue({
      type: "Paragraph",
      label: "Paragraph",
      // No i18nProps
    } as any);

    const result = handlei18N(blocks, currentBlocks);

    expect(result).toEqual(blocks);
  });

  it("should merge i18n values when matching block is found in currentBlocks", () => {
    const blocks: ChaiBlock[] = [{ _type: "Paragraph", _id: "1", content: "Hello" }];
    const currentBlocks: ChaiBlock[] = [
      {
        _type: "Paragraph",
        _id: "2",
        content: "Hello",
        "content-es": "Hola",
        "content-fr": "Bonjour",
      },
    ];

    vi.mocked(getRegisteredChaiBlock).mockReturnValue({
      type: "Paragraph",
      label: "Paragraph",
      i18nProps: ["content"],
    } as any);

    const result = handlei18N(blocks, currentBlocks);

    expect(result).toEqual([
      {
        _type: "Paragraph",
        _id: "1",
        content: "Hello",
        "content-es": "Hola",
        "content-fr": "Bonjour",
      },
    ]);
  });

  it("should handle multiple i18n properties", () => {
    const blocks: ChaiBlock[] = [{ _type: "Button", _id: "1", content: "Click me", label: "Submit" }];
    const currentBlocks: ChaiBlock[] = [
      {
        _type: "Button",
        _id: "2",
        content: "Click me",
        "content-es": "Haz clic",
        label: "Submit",
        "label-es": "Enviar",
      },
    ];

    vi.mocked(getRegisteredChaiBlock).mockReturnValue({
      type: "Button",
      label: "Button",
      i18nProps: ["content", "label"],
    } as any);

    const result = handlei18N(blocks, currentBlocks);

    expect(result).toEqual([
      {
        _type: "Button",
        _id: "1",
        content: "Click me",
        label: "Submit",
        "content-es": "Haz clic",
        "label-es": "Enviar",
      },
    ]);
  });

  it("should handle trimmed content matching", () => {
    const blocks: ChaiBlock[] = [{ _type: "Paragraph", _id: "1", content: "  Hello  " }];
    const currentBlocks: ChaiBlock[] = [
      {
        _type: "Paragraph",
        _id: "2",
        content: "Hello",
        "content-es": "Hola",
      },
    ];

    vi.mocked(getRegisteredChaiBlock).mockReturnValue({
      type: "Paragraph",
      label: "Paragraph",
      i18nProps: ["content"],
    } as any);

    const result = handlei18N(blocks, currentBlocks);

    expect(result).toEqual([
      {
        _type: "Paragraph",
        _id: "1",
        content: "  Hello  ",
        "content-es": "Hola",
      },
    ]);
  });

  it("should not merge when no matching content is found", () => {
    const blocks: ChaiBlock[] = [{ _type: "Paragraph", _id: "1", content: "Hello" }];
    const currentBlocks: ChaiBlock[] = [
      {
        _type: "Paragraph",
        _id: "2",
        content: "Goodbye",
        "content-es": "Adiós",
      },
    ];

    vi.mocked(getRegisteredChaiBlock).mockReturnValue({
      type: "Paragraph",
      label: "Paragraph",
      i18nProps: ["content"],
    } as any);

    const result = handlei18N(blocks, currentBlocks);

    expect(result).toEqual([{ _type: "Paragraph", _id: "1", content: "Hello" }]);
  });

  it("should handle multiple blocks of the same type", () => {
    const blocks: ChaiBlock[] = [
      { _type: "Paragraph", _id: "1", content: "Hello" },
      { _type: "Paragraph", _id: "2", content: "World" },
    ];
    const currentBlocks: ChaiBlock[] = [
      {
        _type: "Paragraph",
        _id: "3",
        content: "Hello",
        "content-es": "Hola",
      },
      {
        _type: "Paragraph",
        _id: "4",
        content: "World",
        "content-es": "Mundo",
      },
    ];

    vi.mocked(getRegisteredChaiBlock).mockReturnValue({
      type: "Paragraph",
      label: "Paragraph",
      i18nProps: ["content"],
    } as any);

    const result = handlei18N(blocks, currentBlocks);

    expect(result).toEqual([
      {
        _type: "Paragraph",
        _id: "1",
        content: "Hello",
        "content-es": "Hola",
      },
      {
        _type: "Paragraph",
        _id: "2",
        content: "World",
        "content-es": "Mundo",
      },
    ]);
  });

  it("should only merge i18n keys with correct prefix", () => {
    const blocks: ChaiBlock[] = [{ _type: "Paragraph", _id: "1", content: "Hello" }];
    const currentBlocks: ChaiBlock[] = [
      {
        _type: "Paragraph",
        _id: "2",
        content: "Hello",
        "content-es": "Hola",
        "content-fr": "Bonjour",
        "title-es": "Título", // Should not be merged as it's not content-*
        otherProp: "value", // Should not be merged
      },
    ];

    vi.mocked(getRegisteredChaiBlock).mockReturnValue({
      type: "Paragraph",
      label: "Paragraph",
      i18nProps: ["content"],
    } as any);

    const result = handlei18N(blocks, currentBlocks);

    expect(result).toEqual([
      {
        _type: "Paragraph",
        _id: "1",
        content: "Hello",
        "content-es": "Hola",
        "content-fr": "Bonjour",
      },
    ]);
    expect(result[0]).not.toHaveProperty("title-es");
    expect(result[0]).not.toHaveProperty("otherProp");
  });

  it("should handle empty blocks array", () => {
    const blocks: ChaiBlock[] = [];
    const currentBlocks: ChaiBlock[] = [
      {
        _type: "Paragraph",
        _id: "1",
        content: "Hello",
        "content-es": "Hola",
      },
    ];

    const result = handlei18N(blocks, currentBlocks);

    expect(result).toEqual([]);
    expect(getRegisteredChaiBlock).not.toHaveBeenCalled();
  });

  it("should handle empty currentBlocks array", () => {
    const blocks: ChaiBlock[] = [{ _type: "Paragraph", _id: "1", content: "Hello" }];
    const currentBlocks: ChaiBlock[] = [];

    vi.mocked(getRegisteredChaiBlock).mockReturnValue({
      type: "Paragraph",
      label: "Paragraph",
      i18nProps: ["content"],
    } as any);

    const result = handlei18N(blocks, currentBlocks);

    expect(result).toEqual([{ _type: "Paragraph", _id: "1", content: "Hello" }]);
  });
});
