/**
 * @vitest-environment happy-dom
 */
import { renderHook } from "@testing-library/react";
import { Provider, WritableAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import React from "react";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { selectedBlockIdsAtom, useSelectedBlockHierarchy } from "~/builder/hooks/use-selected-blockIds";
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

describe("useSelectedBlockHierarchy", () => {
  const blocks: ChaiBlock[] = [
    { _id: "root", _type: "Box" },
    { _id: "child", _type: "Box", _parent: "root" },
    { _id: "grandchild", _type: "Box", _parent: "child" },
    { _id: "orphan", _type: "Box" },
  ];

  it("should return empty array when no block is selected", () => {
    const { result } = renderHook(() => useSelectedBlockHierarchy(), {
      wrapper: ({ children }) => (
        <TestProvider
          initialValues={[
            [presentBlocksAtom, blocks],
            [selectedBlockIdsAtom, []],
          ]}>
          {children}
        </TestProvider>
      ),
    });

    expect(result.current).toEqual([]);
  });

  it("should return the block itself when a root block is selected", () => {
    const { result } = renderHook(() => useSelectedBlockHierarchy(), {
      wrapper: ({ children }) => (
        <TestProvider
          initialValues={[
            [presentBlocksAtom, blocks],
            [selectedBlockIdsAtom, ["root"]],
          ]}>
          {children}
        </TestProvider>
      ),
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]._id).toBe("root");
  });

  it("should return hierarchy [child, parent] when child is selected", () => {
    const { result } = renderHook(() => useSelectedBlockHierarchy(), {
      wrapper: ({ children }) => (
        <TestProvider
          initialValues={[
            [presentBlocksAtom, blocks],
            [selectedBlockIdsAtom, ["child"]],
          ]}>
          {children}
        </TestProvider>
      ),
    });

    expect(result.current).toHaveLength(2);
    expect(result.current[0]._id).toBe("child");
    expect(result.current[1]._id).toBe("root");
  });

  it("should return hierarchy [grandchild, child, parent] when grandchild is selected", () => {
    const { result } = renderHook(() => useSelectedBlockHierarchy(), {
      wrapper: ({ children }) => (
        <TestProvider
          initialValues={[
            [presentBlocksAtom, blocks],
            [selectedBlockIdsAtom, ["grandchild"]],
          ]}>
          {children}
        </TestProvider>
      ),
    });

    expect(result.current).toHaveLength(3);
    expect(result.current[0]._id).toBe("grandchild");
    expect(result.current[1]._id).toBe("child");
    expect(result.current[2]._id).toBe("root");
  });

  it("should return empty array when selected block is not found", () => {
    const { result } = renderHook(() => useSelectedBlockHierarchy(), {
      wrapper: ({ children }) => (
        <TestProvider
          initialValues={[
            [presentBlocksAtom, blocks],
            [selectedBlockIdsAtom, ["non-existent"]],
          ]}>
          {children}
        </TestProvider>
      ),
    });

    expect(result.current).toEqual([]);
  });

  it("should handle orphan block correctly", () => {
    const { result } = renderHook(() => useSelectedBlockHierarchy(), {
      wrapper: ({ children }) => (
        <TestProvider
          initialValues={[
            [presentBlocksAtom, blocks],
            [selectedBlockIdsAtom, ["orphan"]],
          ]}>
          {children}
        </TestProvider>
      ),
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]._id).toBe("orphan");
  });
});
