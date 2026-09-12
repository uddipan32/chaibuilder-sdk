/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { builderStore } from "~/builder/atoms/store";
import { useStreamMultipleBlocksProps } from "~/builder/hooks/use-update-blocks-props";

const updateBlocksRuntime = vi.fn();
const updateMultipleBlocksProps = vi.fn();

vi.mock("~/builder/hooks/history/use-blocks-store-undoable-actions", () => ({
  useBlocksStoreUndoableActions: vi.fn(() => ({
    updateBlocksRuntime,
    updateMultipleBlocksProps,
  })),
}));

describe("useStreamMultipleBlocksProps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    builderStore.set(presentBlocksAtom, [
      { _id: "heading", _type: "Heading", "content-es": "Before" },
      { _id: "body", _type: "Text", "content-es": "Old body" },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("commits one history item with values captured before AI streaming", async () => {
    const { result } = renderHook(() => useStreamMultipleBlocksProps());
    const translatedBlocks = [
      { _id: "heading", "content-es": "Después" },
      { _id: "body", "content-es": "Nuevo cuerpo" },
    ];

    let updatePromise: Promise<void>;
    act(() => {
      updatePromise = result.current(translatedBlocks);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
      await updatePromise!;
    });

    expect(updateMultipleBlocksProps).toHaveBeenCalledTimes(1);
    expect(updateMultipleBlocksProps).toHaveBeenCalledWith(translatedBlocks, [
      { _id: "heading", "content-es": "Before" },
      { _id: "body", "content-es": "Old body" },
    ]);
  });
});
