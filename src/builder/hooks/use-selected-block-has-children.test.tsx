/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { Provider, WritableAtom, createStore } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import React from "react";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { useSelectedBlockHasChildren } from "~/builder/hooks/use-selected-block-has-children";
import { selectedBlockIdsAtom } from "~/builder/hooks/use-selected-blockIds";
import { ChaiBlock } from "~/types/common";

type AtomTuple = [WritableAtom<any, any[], any>, any];

const HydrateAtoms = ({ initialValues, children }: { initialValues: AtomTuple[]; children: React.ReactNode }) => {
  useHydrateAtoms(initialValues);
  return children;
};

const blocks: ChaiBlock[] = [
  { _id: "heading", _type: "Heading", content: "Heading goes here" },
  { _id: "span", _type: "Span", _parent: "heading" },
  { _id: "empty-heading", _type: "Heading" },
];

const renderWithBlocks = (pageBlocks: ChaiBlock[], selectedIds: string[]) => {
  const store = createStore();
  const view = renderHook(() => useSelectedBlockHasChildren(), {
    wrapper: ({ children }) => (
      <Provider store={store}>
        <HydrateAtoms
          initialValues={[
            [presentBlocksAtom, pageBlocks],
            [selectedBlockIdsAtom, selectedIds],
          ]}>
          {children}
        </HydrateAtoms>
      </Provider>
    ),
  });
  return { ...view, store };
};

describe("useSelectedBlockHasChildren", () => {
  it("is false when nothing is selected", () => {
    expect(renderWithBlocks(blocks, []).result.current).toBe(false);
  });

  it("is false for a block without children", () => {
    expect(renderWithBlocks(blocks, ["empty-heading"]).result.current).toBe(false);
  });

  it("is true for a block with a direct child", () => {
    expect(renderWithBlocks(blocks, ["heading"]).result.current).toBe(true);
  });

  it("is false again once the child is removed", () => {
    const { result, store } = renderWithBlocks(blocks, ["heading"]);
    expect(result.current).toBe(true);

    act(() => {
      store.set(
        presentBlocksAtom,
        blocks.filter((block) => block._id !== "span"),
      );
    });

    expect(result.current).toBe(false);
  });

  it("is false for a multi selection, which has no settings form", () => {
    expect(renderWithBlocks(blocks, ["heading", "empty-heading"]).result.current).toBe(false);
  });

  it("ignores prop-only edits to the page blocks", () => {
    const { result, store } = renderWithBlocks(blocks, ["heading"]);

    act(() => {
      store.set(
        presentBlocksAtom,
        blocks.map((block) => (block._id === "heading" ? { ...block, content: "Edited" } : block)),
      );
    });

    expect(result.current).toBe(true);
  });
});
