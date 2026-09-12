import { pickOnlyAIProps } from "~/builder/hooks/use-ask-ai";
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

const mockGetRegisteredChaiBlock = getRegisteredChaiBlock as any;

describe("pickOnlyAIProps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should return an empty array when given empty blocks array", () => {
      const result = pickOnlyAIProps([], "en", false);
      expect(result).toEqual([]);
    });

    it("should filter out blocks with no AI props", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "test content",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: [], // No AI props defined
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([]);
    });

    it("should include only blocks with AI props", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "test content",
          title: "test title",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content", "title"],
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: "test content",
          title: "test title",
        },
      ]);
    });

    it("should preserve core block properties (_id, _type, _parent)", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          _parent: "parent1",
          content: "test content",
          nonAiProp: "should not be included",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content"],
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          _parent: "parent1",
          content: "test content",
        },
      ]);
    });

    it("should remove _parent property when it's empty", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          _parent: "",
          content: "test content",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content"],
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: "test content",
        },
      ]);
    });
  });

  describe("language handling", () => {
    it("should use language-specific values when available", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "default content",
          "content-es": "contenido en español",
          title: "default title",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content", "title"],
      });

      const result = pickOnlyAIProps(blocks, "es", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: "contenido en español",
          title: "default title",
        },
      ]);
    });

    it("should fallback to default value when language-specific value is empty", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "default content",
          "content-es": "   ", // empty/whitespace value
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content"],
      });

      const result = pickOnlyAIProps(blocks, "es", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: "default content",
        },
      ]);
    });

    it("should fallback to default value when language-specific value doesn't exist", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "default content",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content"],
      });

      const result = pickOnlyAIProps(blocks, "fr", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: "default content",
        },
      ]);
    });

    it("should handle non-string values correctly", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          enabled: true,
          count: 42,
          config: { key: "value" },
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["enabled", "count", "config"],
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          enabled: true,
          count: 42,
          config: { key: "value" },
        },
      ]);
    });
  });

  describe("translate prompt handling", () => {
    it("should use default values when isTranslatePrompt is true", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "default content",
          "content-es": "contenido en español",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content"],
      });

      const result = pickOnlyAIProps(blocks, "es", true);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: "default content", // Should use default, not Spanish version
        },
      ]);
    });

    it("should use language-specific values when isTranslatePrompt is false", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "default content",
          "content-es": "contenido en español",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content"],
      });

      const result = pickOnlyAIProps(blocks, "es", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: "contenido en español",
        },
      ]);
    });
  });

  describe("registered block handling", () => {
    it("should handle blocks with no registered definition", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "UnknownBlock",
          content: "test content",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue(null);

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([]);
    });

    it("should handle blocks with no aiProps defined", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "test content",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        // No aiProps property
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([]);
    });

    it("should handle blocks with empty aiProps array", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "test content",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: [],
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([]);
    });
  });

  describe("multiple blocks handling", () => {
    it("should process multiple blocks correctly", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "HeadingBlock",
          content: "Heading content",
          title: "Heading title",
        },
        {
          _id: "block2",
          _type: "ParagraphBlock",
          content: "Paragraph content",
          style: "bold",
        },
        {
          _id: "block3",
          _type: "ButtonBlock",
          text: "Click me",
          action: "submit",
        },
      ];

      mockGetRegisteredChaiBlock
        .mockReturnValueOnce({ aiProps: ["content", "title"] }) // HeadingBlock
        .mockReturnValueOnce({ aiProps: ["content"] }) // ParagraphBlock
        .mockReturnValueOnce({ aiProps: [] }); // ButtonBlock - no AI props

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "HeadingBlock",
          content: "Heading content",
          title: "Heading title",
        },
        {
          _id: "block2",
          _type: "ParagraphBlock",
          content: "Paragraph content",
        },
      ]);
    });

    it("should filter out blocks with no AI properties from mixed results", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TextBlock",
          content: "text content",
        },
        {
          _id: "block2",
          _type: "ImageBlock",
          src: "image.jpg",
          alt: "image alt",
        },
        {
          _id: "block3",
          _type: "DivBlock",
          className: "container",
        },
      ];

      mockGetRegisteredChaiBlock
        .mockReturnValueOnce({ aiProps: ["content"] }) // TextBlock
        .mockReturnValueOnce({ aiProps: ["alt"] }) // ImageBlock
        .mockReturnValueOnce({ aiProps: [] }); // DivBlock - no AI props

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TextBlock",
          content: "text content",
        },
        {
          _id: "block2",
          _type: "ImageBlock",
          alt: "image alt",
        },
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle blocks with undefined properties", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: undefined,
          title: "test title",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content", "title"],
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: "", // get() with default "" returns empty string when undefined
          title: "test title",
        },
      ]);
    });

    it("should handle blocks with null values", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: null,
          title: "test title",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content", "title"],
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: null,
          title: "test title",
        },
      ]);
    });

    it("should handle empty language string", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "test content",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content"],
      });

      const result = pickOnlyAIProps(blocks, "", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: "test content",
        },
      ]);
    });

    it("should skip properties that match core block properties", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          _parent: "parent1",
          content: "test content",
        },
      ];

      // Even if aiProps includes core properties, they should be skipped in the loop
      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["_id", "_type", "_parent", "content"],
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          _parent: "parent1",
          content: "test content",
        },
      ]);
    });

    it("should trim whitespace from string values", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "TestBlock",
          content: "default content",
          "content-es": "  contenido con espacios  ",
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content"],
      });

      const result = pickOnlyAIProps(blocks, "es", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "TestBlock",
          content: "contenido con espacios",
        },
      ]);
    });

    it("should handle complex nested block structures", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "parent",
          _type: "ContainerBlock",
          title: "Container Title",
          config: { layout: "grid" },
        },
        {
          _id: "child1",
          _type: "TextBlock",
          _parent: "parent",
          content: "Child 1 content",
        },
        {
          _id: "child2",
          _type: "ImageBlock",
          _parent: "parent",
          alt: "Child 2 alt text",
          src: "image.jpg",
        },
      ];

      mockGetRegisteredChaiBlock
        .mockReturnValueOnce({ aiProps: ["title"] }) // ContainerBlock
        .mockReturnValueOnce({ aiProps: ["content"] }) // TextBlock
        .mockReturnValueOnce({ aiProps: ["alt"] }); // ImageBlock

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "parent",
          _type: "ContainerBlock",
          title: "Container Title",
        },
        {
          _id: "child1",
          _type: "TextBlock",
          _parent: "parent",
          content: "Child 1 content",
        },
        {
          _id: "child2",
          _type: "ImageBlock",
          _parent: "parent",
          alt: "Child 2 alt text",
        },
      ]);
    });

    it("should handle blocks where getRegisteredChaiBlock throws an error", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "ErrorBlock",
          content: "test content",
        },
      ];

      mockGetRegisteredChaiBlock.mockImplementation(() => {
        throw new Error("Block not found");
      });

      expect(() => pickOnlyAIProps(blocks, "en", false)).toThrow("Block not found");
    });

    it("should handle large number of blocks efficiently", () => {
      const blocks: ChaiBlock[] = Array.from({ length: 100 }, (_, i) => ({
        _id: `block${i}`,
        _type: "TestBlock",
        content: `Content ${i}`,
        title: `Title ${i}`,
      }));

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content"],
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toHaveLength(100);
      expect(result[0]).toEqual({
        _id: "block0",
        _type: "TestBlock",
        content: "Content 0",
      });
      expect(result[99]).toEqual({
        _id: "block99",
        _type: "TestBlock",
        content: "Content 99",
      });
    });

    it("should handle mixed AI and non-AI properties", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "block1",
          _type: "MixedBlock",
          content: "AI content",
          title: "AI title",
          style: "non-AI style",
          className: "non-AI class",
          metadata: { key: "non-AI metadata" },
        },
      ];

      mockGetRegisteredChaiBlock.mockReturnValue({
        aiProps: ["content", "title"], // Only these are AI props
      });

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "block1",
          _type: "MixedBlock",
          content: "AI content",
          title: "AI title",
          // style, className, metadata should not be included
        },
      ]);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle typical blog post structure", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "heading1",
          _type: "Heading",
          content: "Blog Post Title",
          tag: "h1",
        },
        {
          _id: "para1",
          _type: "Paragraph",
          content: "This is the first paragraph of the blog post.",
        },
        {
          _id: "image1",
          _type: "Image",
          src: "/blog/image1.jpg",
          alt: "Descriptive alt text for the image",
        },
        {
          _id: "para2",
          _type: "Paragraph",
          content: "This is the second paragraph with more content.",
        },
      ];

      mockGetRegisteredChaiBlock
        .mockReturnValueOnce({ aiProps: ["content"] }) // Heading
        .mockReturnValueOnce({ aiProps: ["content"] }) // Paragraph
        .mockReturnValueOnce({ aiProps: ["alt"] }) // Image
        .mockReturnValueOnce({ aiProps: ["content"] }); // Paragraph

      const result = pickOnlyAIProps(blocks, "en", false);
      expect(result).toEqual([
        {
          _id: "heading1",
          _type: "Heading",
          content: "Blog Post Title",
        },
        {
          _id: "para1",
          _type: "Paragraph",
          content: "This is the first paragraph of the blog post.",
        },
        {
          _id: "image1",
          _type: "Image",
          alt: "Descriptive alt text for the image",
        },
        {
          _id: "para2",
          _type: "Paragraph",
          content: "This is the second paragraph with more content.",
        },
      ]);
    });

    it("should handle multilingual content correctly", () => {
      const blocks: ChaiBlock[] = [
        {
          _id: "heading1",
          _type: "Heading",
          content: "Welcome",
          "content-es": "Bienvenidos",
          "content-fr": "Bienvenue",
        },
        {
          _id: "button1",
          _type: "Button",
          text: "Click here",
          "text-es": "Haz clic aquí",
          "text-fr": "Cliquez ici",
          color: "blue",
        },
      ];

      // Test English
      mockGetRegisteredChaiBlock
        .mockReturnValueOnce({ aiProps: ["content"] }) // Heading
        .mockReturnValueOnce({ aiProps: ["text"] }); // Button

      const resultEn = pickOnlyAIProps(blocks, "en", false);
      expect(resultEn).toEqual([
        {
          _id: "heading1",
          _type: "Heading",
          content: "Welcome",
        },
        {
          _id: "button1",
          _type: "Button",
          text: "Click here",
        },
      ]);

      // Test Spanish - need to reset mocks
      mockGetRegisteredChaiBlock.mockClear();
      mockGetRegisteredChaiBlock
        .mockReturnValueOnce({ aiProps: ["content"] }) // Heading
        .mockReturnValueOnce({ aiProps: ["text"] }); // Button

      const resultEs = pickOnlyAIProps(blocks, "es", false);
      expect(resultEs).toEqual([
        {
          _id: "heading1",
          _type: "Heading",
          content: "Bienvenidos",
        },
        {
          _id: "button1",
          _type: "Button",
          text: "Haz clic aquí",
        },
      ]);

      // Test French - need to reset mocks
      mockGetRegisteredChaiBlock.mockClear();
      mockGetRegisteredChaiBlock
        .mockReturnValueOnce({ aiProps: ["content"] }) // Heading
        .mockReturnValueOnce({ aiProps: ["text"] }); // Button

      const resultFr = pickOnlyAIProps(blocks, "fr", false);
      expect(resultFr).toEqual([
        {
          _id: "heading1",
          _type: "Heading",
          content: "Bienvenue",
        },
        {
          _id: "button1",
          _type: "Button",
          text: "Cliquez ici",
        },
      ]);
    });
  });
});
