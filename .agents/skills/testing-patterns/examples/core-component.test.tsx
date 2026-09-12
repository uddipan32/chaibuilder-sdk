import { act, renderHook } from "@testing-library/react";
import { useAtom } from "jotai";
import { describe, expect, it } from "vitest";
import { CoreTestProvider } from "~/core/__tests__/test-utils";
import { selectedBlockIdsAtom } from "~/hooks/use-selected-blockIds";

describe("Example Core Component Test", () => {
  it("should use real Jotai atoms without mocking", () => {
    const { result } = renderHook(
      () => {
        const [blockIds, setBlockIds] = useAtom(selectedBlockIdsAtom);
        return { blockIds, setBlockIds };
      },
      { wrapper: CoreTestProvider }
    );

    act(() => {
      result.current.setBlockIds(["block-1", "block-2"]);
    });

    expect(result.current.blockIds).toEqual(["block-1", "block-2"]);
  });

  it("should test component behavior with real atoms", () => {
    const { result } = renderHook(
      () => {
        const [blockIds, setBlockIds] = useAtom(selectedBlockIdsAtom);

        const addBlock = (id: string) => {
          setBlockIds((prev) => [...prev, id]);
        };

        return { blockIds, addBlock };
      },
      { wrapper: CoreTestProvider }
    );

    act(() => {
      result.current.addBlock("block-1");
      result.current.addBlock("block-2");
    });

    expect(result.current.blockIds).toHaveLength(2);
    expect(result.current.blockIds).toContain("block-1");
    expect(result.current.blockIds).toContain("block-2");
  });
});
