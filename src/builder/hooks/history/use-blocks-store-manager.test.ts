/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { useBlocksStoreManager } from "~/builder/hooks/history/use-blocks-store-manager";

vi.mock("~/builder/hooks/use-broadcast-channel", () => ({
  useBroadcastChannel: vi.fn(() => ({ postMessage: vi.fn() })),
}));

vi.mock("~/builder/hooks/use-update-block-atom", () => ({
  useUpdateBlockAtom: vi.fn(() => vi.fn()),
}));

vi.mock("~/builder/core/components/use-auto-save", () => ({
  useIncrementActionsCount: vi.fn(() => vi.fn()),
}));

vi.mock("~/builder/hooks/use-check-structure", () => ({
  useCheckStructure: vi.fn(),
}));

import { useCheckStructure } from "~/builder/hooks/use-check-structure";

describe("useBlocksStoreManager – updateBlocksProps", () => {
  it("invokes the runValidation callback returned by useCheckStructure", () => {
    const mockRunValidation = vi.fn();
    (useCheckStructure as ReturnType<typeof vi.fn>).mockReturnValue(mockRunValidation);

    const { result } = renderHook(() => useBlocksStoreManager());

    act(() => {
      result.current.updateBlocksProps([{ _id: "block-1", color: "red" }]);
    });

    expect(mockRunValidation).toHaveBeenCalledTimes(1);
  });

  it("invokes the runValidation callback even when an empty blocks array is provided", () => {
    const mockRunValidation = vi.fn();
    (useCheckStructure as ReturnType<typeof vi.fn>).mockReturnValue(mockRunValidation);

    const { result } = renderHook(() => useBlocksStoreManager());

    act(() => {
      result.current.updateBlocksProps([]);
    });

    expect(mockRunValidation).toHaveBeenCalledTimes(1);
  });
});
