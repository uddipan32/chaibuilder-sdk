/**
 * @vitest-environment happy-dom
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocks for useProcessAiStream dependencies
const mockAddPredefinedBlock = vi.fn();
const mockReplaceBlock = vi.fn();
const mockRemoveBlocks = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockAddCustomBlock = vi.fn();
const mockBindProp = vi.fn();

vi.mock("~/builder/hooks/use-add-block", () => ({
  useAddBlock: () => ({ addPredefinedBlock: mockAddPredefinedBlock }),
}));
vi.mock("~/builder/hooks/use-replace-block", () => ({
  useReplaceBlock: () => mockReplaceBlock,
}));
vi.mock("~/builder/hooks/use-remove-blocks", () => ({
  useRemoveBlocks: () => mockRemoveBlocks,
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));
vi.mock("~/builder/hooks/use-add-custom-block", () => ({
  useAddCustomBlock: () => mockAddCustomBlock,
}));
vi.mock("~/builder/hooks/use-bind-prop", () => ({
  useBindProp: () => mockBindProp,
}));

import { useProcessAiStream } from "./use-process-ai-stream";

// Helper to create a mock ReadableStreamReader from chunks of strings
const createMockReader = (chunks: string[]) => {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    read: async () => {
      if (index >= chunks.length) {
        return { done: true, value: undefined };
      }
      const chunk = chunks[index++];
      return { done: false, value: encoder.encode(chunk) };
    },
  } as any;
};

describe("useProcessAiStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect data stream mode and process line-by-line using manual parser", async () => {
    const reader = createMockReader([
      '0:"--START--\\n"\n',
      '0:"--MSG=Streaming message\\n"\n',
      '0:"--END--\\n"\n'
    ]);
    const setMessages = vi.fn();

    const { result } = renderHook(() => useProcessAiStream());
    await result.current(reader, setMessages);

    // Verify messages updated with streaming content
    expect(setMessages).toHaveBeenCalled();
  });

  it("should handle remove_blocks tool call in data stream mode", async () => {
    const reader = createMockReader([
      '9:{"toolCallId":"1","toolName":"remove_blocks","args":{"ids":["abc","def"],"reason":"Removing footer"}}\n',
      'd:{"finishReason":"stop"}\n'
    ]);
    const setMessages = vi.fn();

    const { result } = renderHook(() => useProcessAiStream());
    await result.current(reader, setMessages);

    expect(mockRemoveBlocks).toHaveBeenCalledWith(["abc", "def"]);
    expect(setMessages).toHaveBeenCalled();
  });

  it("should handle add_custom_block tool call in data stream mode", async () => {
    const reader = createMockReader([
      '9:{"toolCallId":"2","toolName":"add_custom_block","args":{"type":"ProductCard","props":{"productId":"123"},"reason":"Adding product card"}}\n',
      'd:{"finishReason":"stop"}\n'
    ]);
    const setMessages = vi.fn();

    const { result } = renderHook(() => useProcessAiStream());
    await result.current(reader, setMessages);

    expect(mockAddCustomBlock).toHaveBeenCalledWith("ProductCard", undefined, undefined, { productId: "123" });
    expect(setMessages).toHaveBeenCalled();
  });

  it("should handle bind_prop tool call in data stream mode", async () => {
    const reader = createMockReader([
      '9:{"toolCallId":"3","toolName":"bind_prop","args":{"blockId":"xyz","propName":"title","bindingPath":"{{product.name}}","reason":"Binding title"}}\n',
      'd:{"finishReason":"stop"}\n'
    ]);
    const setMessages = vi.fn();

    const { result } = renderHook(() => useProcessAiStream());
    await result.current(reader, setMessages);

    expect(mockBindProp).toHaveBeenCalledWith("xyz", "title", "{{product.name}}");
    expect(setMessages).toHaveBeenCalled();
  });

  it("should fall back to legacy text stream mode if first chunk is not JSONL", async () => {
    const reader = createMockReader([
      "--START--\n",
      "--MSG=Hello from legacy text stream\n",
      "--END--\n"
    ]);
    const setMessages = vi.fn();

    const { result } = renderHook(() => useProcessAiStream());
    await result.current(reader, setMessages);

    expect(setMessages).toHaveBeenCalled();
  });

  it("should handle AI SDK v6 UI message SSE stream format", async () => {
    const reader = createMockReader([
      'data: {"type":"start-step"}\n\n',
      'data: {"type":"text-delta","id":"0","delta":"--START--\\n"}\n\n',
      'data: {"type":"text-delta","id":"0","delta":"--ACTION=ADD|PARENT=undefined|POS=-1--\\n"}\n\n',
      'data: {"type":"text-delta","id":"0","delta":"--HTML--\\n<section>Hero</section>\\n--ENDHTML--\\n"}\n\n',
      'data: {"type":"text-delta","id":"0","delta":"--ENDACTION--\\n--END--\\n"}\n\n',
      'data: {"type":"finish","finishReason":"stop"}\n\n',
      "data: [DONE]\n\n",
    ]);
    const setMessages = vi.fn();

    const { result } = renderHook(() => useProcessAiStream());
    await result.current(reader, setMessages);

    expect(mockAddPredefinedBlock).toHaveBeenCalled();
  });

  it("should handle remove_blocks tool call in UI message SSE stream", async () => {
    const reader = createMockReader([
      'data: {"type":"tool-input-available","toolCallId":"1","toolName":"remove_blocks","input":{"ids":["abc","def"],"reason":"Removing footer"}}\n\n',
      'data: {"type":"finish","finishReason":"stop"}\n\n',
    ]);
    const setMessages = vi.fn();

    const { result } = renderHook(() => useProcessAiStream());
    await result.current(reader, setMessages);

    expect(mockRemoveBlocks).toHaveBeenCalledWith(["abc", "def"]);
    expect(setMessages).toHaveBeenCalled();
  });

  it("should handle tool calls interleaved in plain text stream", async () => {
    const reader = createMockReader([
      "--START--\n",
      "--MSG=Starting operation\n",
      '9:{"toolCallId":"4","toolName":"bind_prop","args":{"blockId":"xyz","propName":"title","bindingPath":"{{product.name}}"}}\n',
      "--END--\n",
      'd:{"finishReason":"stop"}\n',
    ]);
    const setMessages = vi.fn();

    const { result } = renderHook(() => useProcessAiStream());
    await result.current(reader, setMessages);

    expect(mockBindProp).toHaveBeenCalledWith("xyz", "title", "{{product.name}}");
    expect(setMessages).toHaveBeenCalled();
  });
});
