/**
 * @vitest-environment happy-dom
 */
import { renderHook } from "@testing-library/react";
import { Provider, WritableAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import React from "react";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { useCollectionItemBindingContext } from "~/builder/hooks/use-collection-item-binding-context";
import { selectedBlockIdsAtom } from "~/builder/hooks/use-selected-blockIds";
import { blockRepeaterDataAtom } from "~/builder/hooks/async-props/use-async-props";
import { ChaiBlock } from "~/types/common";

type AtomTuple = [WritableAtom<any, any[], any>, any];

const HydrateAtoms = ({ initialValues, children }: { initialValues: AtomTuple[]; children: React.ReactNode }) => {
  useHydrateAtoms(initialValues);
  return children;
};

const TestProvider = ({ initialValues, children }: { initialValues: AtomTuple[]; children: React.ReactNode }) => (
  <Provider>
    <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
  </Provider>
);

describe("useCollectionItemBindingContext", () => {
  const blocks: ChaiBlock[] = [
    { _id: "outer", _type: "CollectionItem", repeaterItems: "{{#listings}}" },
    { _id: "ci", _type: "CollectionItem", _parent: "outer", repeaterItems: "{{#agents}}" },
    { _id: "heading", _type: "Heading", _parent: "ci" },
    { _id: "loose", _type: "Heading" },
  ];
  const repeaterData = {
    ci: { status: "loaded", props: [{ name: "Ann" }], repeaterItems: "{{#agents}}" },
    outer: { status: "loaded", props: [{ title: "First" }], repeaterItems: "{{#listings}}" },
  };

  const renderWithSelection = (selectedIds: string[]) =>
    renderHook(() => useCollectionItemBindingContext(), {
      wrapper: ({ children }) => (
        <TestProvider
          initialValues={[
            [presentBlocksAtom, blocks],
            [selectedBlockIdsAtom, selectedIds],
            [blockRepeaterDataAtom, repeaterData],
          ]}>
          {children}
        </TestProvider>
      ),
    });

  it("resolves the nearest CollectionItem ancestor's found item", () => {
    const { result } = renderWithSelection(["heading"]);
    expect(result.current.itemPath).toBe("#agents/ci");
    expect(result.current.itemData).toEqual({ name: "Ann" });
  });

  it("returns nothing outside a CollectionItem", () => {
    const { result } = renderWithSelection(["loose"]);
    expect(result.current.itemPath).toBe("");
    expect(result.current.itemData).toBeUndefined();
  });

  it("shadows an outer CollectionItem with the nearest one", () => {
    const { result } = renderWithSelection(["ci"]);
    expect(result.current.itemPath).toBe("#agents/ci");
    expect(result.current.itemData).toEqual({ name: "Ann" });
  });
});
