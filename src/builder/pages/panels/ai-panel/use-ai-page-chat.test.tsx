/**
 * @vitest-environment happy-dom
 *
 * Guards the core "don't lose work" behavior: partial AI edits are persisted on
 * a timeout/error, checkpointed after each section, and never saved on a user
 * abort (which reverts).
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture the useChat config so tests can fire onFinish / onError / onToolCall.
let captured: any = null;
const chatApi = {
  sendMessage: vi.fn(async () => {}),
  stop: vi.fn(async () => {}),
  addToolOutput: vi.fn(),
  status: "ready",
  messages: [] as any[],
  setMessages: vi.fn(),
};
vi.mock("@ai-sdk/react", () => ({
  useChat: (config: any) => {
    captured = config;
    return chatApi;
  },
}));

const savePageAsync = vi.fn(async () => {});
vi.mock("~/builder/hooks/use-save-page", () => ({ useSavePage: () => ({ savePageAsync }) }));

// Controllable block store — applying a section swaps the array reference, which
// is how the hook detects the page was modified.
let currentBlocks: any[] = [];
vi.mock("~/builder/atoms/store", () => ({ getCurrentBlocks: () => currentBlocks }));
const addBlocks = vi.fn((blocks: any[]) => {
  currentBlocks = [...currentBlocks, ...blocks];
});
vi.mock("~/builder/hooks/history/use-blocks-store-undoable-actions", () => ({
  useBlocksStoreUndoableActions: () => ({
    addBlocks,
    setNewBlocks: vi.fn((b: any) => {
      currentBlocks = b;
    }),
  }),
}));
vi.mock("~/builder/hooks/use-partial-blocks-store", () => ({
  partialBlocksListAtom: {},
  useCheckPartialCanAdd: () => () => ({ canAdd: true }),
}));
vi.mock("~/utils/import-html/html-to-json", () => ({ getBlocksFromHTML: async () => [{ _id: "b1", _type: "Box" }] }));

// Remaining deps — minimal stand-ins.
vi.mock("ai", () => ({
  DefaultChatTransport: class {
    constructor(_: any) {}
  },
  isToolUIPart: () => false,
  lastAssistantMessageIsCompleteWithToolCalls: () => false,
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("jotai", () => ({ atom: (init?: unknown) => ({ init }), useAtomValue: () => ({}), useSetAtom: () => vi.fn() }));
vi.mock("~/builder/atoms/builder", () => ({ chaiDesignTokensAtom: {}, usePageExternalData: () => ({}) }));
vi.mock("~/builder/core/functions/common-functions", () => ({ generateUUID: () => "uuid" }));
vi.mock("~/builder/hooks/use-bind-prop", () => ({ useBindProp: () => vi.fn() }));
vi.mock("~/builder/hooks/use-blocks-html-for-ai", () => ({ useBlocksHtmlForAi: () => () => "" }));
vi.mock("~/builder/hooks/use-builder-prop", () => ({ useBuilderProp: () => false }));
vi.mock("~/builder/hooks/use-remove-blocks", () => ({ useRemoveBlocks: () => vi.fn() }));
vi.mock("~/builder/hooks/use-replace-block", () => ({ useReplaceBlock: () => vi.fn() }));
vi.mock("~/builder/pages/constants/AI_CREDITS", () => ({ AI_CREDITS_QUERY_KEY: "credits" }));
vi.mock("~/builder/pages/hooks/pages/use-current-page", () => ({ usePrimaryPage: () => ({ data: {} }) }));
vi.mock("~/builder/pages/hooks/project/use-builder-prop", () => ({
  useApiUrl: () => "api",
  usePagesProp: (_: any, d: any) => d,
}));
vi.mock("~/registry", () => ({ getRegisteredChaiBlock: () => ({}) }));
vi.mock("./ai-models-context", () => ({ useAIConfig: () => ({ context: {} }) }));
vi.mock("./canvas-stream-preview", () => ({
  clearStreamCanvas: vi.fn(),
  streamHtmlToCanvasForAdd: vi.fn(),
  streamHtmlToCanvasForEdit: vi.fn(),
}));
vi.mock("./page-outline-for-ai", () => ({ buildDataBindingPayload: () => ({}), buildPageOutlineForAi: () => "" }));

import { AI_OMITTED_HTML_SENTINEL } from "~/constants/AI_TOOL_HISTORY";
import { useAiPageChat } from "./use-ai-page-chat";

const applySection = () =>
  captured.onToolCall({ toolCall: { toolName: "add_blocks", toolCallId: "t1", input: { html: "<div></div>" } } });

const startRun = async (result: any) => {
  await act(async () => {
    await result.current.sendPrompt("build a page", { model: "m" });
  });
};

describe("useAiPageChat — don't-lose-work behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentBlocks = [];
  });

  it("checkpoints (debounced) after a section lands", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAiPageChat());
    await startRun(result);
    await act(async () => {
      await applySection();
    });
    expect(savePageAsync).not.toHaveBeenCalled(); // still within the debounce window
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    expect(savePageAsync).toHaveBeenCalledTimes(1); // section checkpointed
    vi.useRealTimers();
  });

  it("persists partial work on error/timeout", async () => {
    const { result } = renderHook(() => useAiPageChat());
    await startRun(result);
    await act(async () => {
      await applySection();
    });
    act(() => captured.onFinish({ message: { parts: [] }, isAbort: false, isError: true }));
    expect(savePageAsync).toHaveBeenCalled();
  });

  it("persists on a hard onError too", async () => {
    const { result } = renderHook(() => useAiPageChat());
    await startRun(result);
    await act(async () => {
      await applySection();
    });
    savePageAsync.mockClear();
    act(() => captured.onError(new Error("connection lost")));
    expect(savePageAsync).toHaveBeenCalled();
  });

  it("never applies the pruned-history sentinel as a block", async () => {
    const { result } = renderHook(() => useAiPageChat());
    await startRun(result);
    await act(async () => {
      await captured.onToolCall({
        toolCall: { toolName: "add_blocks", toolCallId: "t1", input: { html: AI_OMITTED_HTML_SENTINEL } },
      });
    });
    expect(addBlocks).not.toHaveBeenCalled();
    expect(currentBlocks).toEqual([]);
  });

  it("does NOT persist on a user abort (the run is reverted)", async () => {
    const { result } = renderHook(() => useAiPageChat());
    await startRun(result);
    await act(async () => {
      await applySection();
    });
    savePageAsync.mockClear();
    act(() => captured.onFinish({ message: { parts: [] }, isAbort: true, isError: false }));
    expect(savePageAsync).not.toHaveBeenCalled();
  });
});
