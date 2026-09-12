/**
 * @vitest-environment happy-dom
 */
import { renderHook } from "@testing-library/react";
import { ACTIONS } from "~/builder/pages/constants/ACTIONS";
import { isAIAction, useAiRequestHelper } from "../use-ai-request-helper";

// Mock dependencies
vi.mock("~/builder/pages/hooks/ai/use-ai-context", () => ({
  useAiContext: vi.fn(() => ({
    data: {
      site: { name: "Test Site", description: "Test Description" },
      page: { title: "Test Page", slug: "test-page" },
    },
  })),
}));

import { useAiContext } from "~/builder/pages/hooks/ai/use-ai-context";

describe("isAIAction", () => {
  it("should identify GENERATE_SEO_FIELD as AI action", () => {
    expect(isAIAction(ACTIONS.AI_GENERATE_SEO_FIELD)).toBe(true);
  });

  it("should identify AI_ENHANCE_CONTEXT as AI action", () => {
    expect(isAIAction(ACTIONS.AI_ENHANCE_CONTEXT)).toBe(true);
  });

  it("should handle non-AI actions correctly", () => {
    expect(isAIAction("CREATE_PAGE")).toBe(false);
    expect(isAIAction("UPDATE_PAGE")).toBe(false);
    expect(isAIAction("DELETE_PAGE")).toBe(false);
    expect(isAIAction("GET_WEBSITE_DATA")).toBe(false);
  });
});

describe("useAiRequestHelper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-implement the mock after clearing
    vi.mocked(useAiContext).mockReturnValue({
      data: {
        site: { name: "Test Site", description: "Test Description" },
        page: { title: "Test Page", slug: "test-page" },
      },
    } as any);
  });

  describe("Context Injection", () => {
    it("should inject AI context when includeContext is true", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, { prompt: "test prompt" }, { includeContext: true });

      expect(prepared.data.context).toEqual({
        site: { name: "Test Site", description: "Test Description" },
        page: { title: "Test Page", slug: "test-page" },
      });
    });

    it("should not inject context when includeContext is false", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, { prompt: "test prompt" }, { includeContext: false });

      expect(prepared.data.context).toBeUndefined();
    });

    it("should inject context by default (includeContext not specified)", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, { prompt: "test prompt" });

      expect(prepared.data.context).toBeDefined();
    });

    it("should handle missing AI context gracefully", () => {
      vi.mocked(useAiContext).mockReturnValue({ data: null } as any);

      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, { prompt: "test prompt" }, { includeContext: true });

      expect(prepared.data.context).toEqual({});
    });

    it("should merge context with existing data", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(
        ACTIONS.AI_GENERATE_SEO_FIELD,
        { field: "title", keyword: "test", existingField: "value" },
        { includeContext: true },
      );

      expect(prepared.data).toEqual({
        field: "title",
        keyword: "test",
        existingField: "value",
        context: {
          site: { name: "Test Site", description: "Test Description" },
          page: { title: "Test Page", slug: "test-page" },
        },
      });
    });

    it("should not override existing context in data", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const existingContext = { custom: "context" };
      const prepared = prepareAIRequest(
        ACTIONS.AI_EDIT_PAGE,
        { prompt: "test", context: existingContext },
        { includeContext: true },
      );

      expect(prepared.data.context).toEqual(existingContext);
    });
  });

  describe("AI Action Detection", () => {
    it("should not inject context for non-AI actions", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest("CREATE_PAGE", { slug: "test-page" }, { includeContext: true });

      expect(prepared.data.context).toBeUndefined();
    });

    it("should inject context for GENERATE_SEO_FIELD action", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_GENERATE_SEO_FIELD, { field: "title" }, { includeContext: true });

      expect(prepared.data.context).toBeDefined();
    });

    it("should inject context for AI_ENHANCE_CONTEXT action", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_ENHANCE_CONTEXT, { text: "test" }, { includeContext: true });

      expect(prepared.data.context).toBeDefined();
    });
  });

  describe("Request Preparation", () => {
    it("should format request data correctly", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, { prompt: "test", model: "gpt-4" }, { includeContext: true });

      expect(prepared).toHaveProperty("action");
      expect(prepared).toHaveProperty("data");
      expect(prepared.action).toBe(ACTIONS.AI_EDIT_PAGE);
      expect(prepared.data.prompt).toBe("test");
      expect(prepared.data.model).toBe("gpt-4");
    });

    it("should preserve all original data fields", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const originalData = {
        field1: "value1",
        field2: "value2",
        field3: { nested: "value" },
        field4: [1, 2, 3],
      };

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, originalData, { includeContext: true });

      expect(prepared.data.field1).toBe("value1");
      expect(prepared.data.field2).toBe("value2");
      expect(prepared.data.field3).toEqual({ nested: "value" });
      expect(prepared.data.field4).toEqual([1, 2, 3]);
    });

    it("should add context to correct location in data", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, { prompt: "test" }, { includeContext: true });

      expect(prepared.data).toHaveProperty("context");
      expect(prepared.data.context).toHaveProperty("site");
      expect(prepared.data.context).toHaveProperty("page");
    });

    it("should handle nested data structures", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const complexData = {
        level1: {
          level2: {
            level3: "deep value",
          },
          array: [{ id: 1 }, { id: 2 }],
        },
        topLevel: "value",
      };

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, complexData, { includeContext: true });

      expect(prepared.data.level1.level2.level3).toBe("deep value");
      expect(prepared.data.level1.array).toHaveLength(2);
      expect(prepared.data.topLevel).toBe("value");
      expect(prepared.data.context).toBeDefined();
    });

    it("should handle empty data object", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, {}, { includeContext: true });

      expect(prepared.data).toEqual({
        context: {
          site: { name: "Test Site", description: "Test Description" },
          page: { title: "Test Page", slug: "test-page" },
        },
      });
    });

    it("should handle null data", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, null as any, { includeContext: true });

      expect(prepared.data).toHaveProperty("context");
    });

    it("should return action unchanged", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const testAction = ACTIONS.AI_GENERATE_SEO_FIELD;
      const prepared = prepareAIRequest(testAction, { test: "data" });

      expect(prepared.action).toBe(testAction);
    });
  });

  describe("aiContext property", () => {
    it("should expose aiContext from hook", () => {
      const { result } = renderHook(() => useAiRequestHelper());

      expect(result.current.aiContext).toEqual({
        site: { name: "Test Site", description: "Test Description" },
        page: { title: "Test Page", slug: "test-page" },
      });
    });

    it("should expose isAIAction function", () => {
      const { result } = renderHook(() => useAiRequestHelper());

      expect(result.current.isAIAction).toBe(isAIAction);
      expect(result.current.isAIAction(ACTIONS.AI_EDIT_PAGE)).toBe(true);
      expect(result.current.isAIAction("CREATE_PAGE")).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined options parameter", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, { prompt: "test" }, undefined);

      expect(prepared.data.context).toBeDefined();
    });

    it("should handle empty options object", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, { prompt: "test" }, {});

      expect(prepared.data.context).toBeDefined();
    });

    it("should handle partial AI context (only site)", () => {
      vi.mocked(useAiContext).mockReturnValue({
        data: { site: { name: "Site Only" } },
      } as any);

      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, { prompt: "test" }, { includeContext: true });

      expect(prepared.data.context).toEqual({ site: { name: "Site Only" } });
    });

    it("should handle partial AI context (only page)", () => {
      vi.mocked(useAiContext).mockReturnValue({
        data: { page: { title: "Page Only" } },
      } as any);

      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const prepared = prepareAIRequest(ACTIONS.AI_EDIT_PAGE, { prompt: "test" }, { includeContext: true });

      expect(prepared.data.context).toEqual({ page: { title: "Page Only" } });
    });

    it("should not mutate original data object", () => {
      const { result } = renderHook(() => useAiRequestHelper());
      const { prepareAIRequest } = result.current;

      const originalData = { prompt: "test", existing: "field" };
      const originalDataCopy = { ...originalData };

      prepareAIRequest(ACTIONS.AI_EDIT_PAGE, originalData, { includeContext: true });

      expect(originalData).toEqual(originalDataCopy);
    });
  });
});
