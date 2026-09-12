/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { Provider, WritableAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import {
  getBlockIdFromUrl,
  updateBlockIdInUrl,
  useBlockSelectionQuerySync,
} from "~/builder/hooks/use-block-selection-query-sync";
import { isPageLoadedAtom } from "~/builder/hooks/use-is-page-loaded";
import { selectedBlockIdsAtom, useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
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

const blocks: ChaiBlock[] = [
  { _id: "block-1", _type: "Box" },
  { _id: "block-2", _type: "Box", _parent: "block-1" },
  { _id: "block-3", _type: "Box" },
];

describe("getBlockIdFromUrl", () => {
  beforeEach(() => {
    // Reset URL before each test
    window.history.replaceState({}, "", "/");
  });

  it("should return null when no block param is present", () => {
    expect(getBlockIdFromUrl()).toBeNull();
  });

  it("should return block id from query param", () => {
    window.history.replaceState({}, "", "/?bid=block-1");
    expect(getBlockIdFromUrl()).toBe("block-1");
  });
});

describe("updateBlockIdInUrl", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("should set block query param", () => {
    updateBlockIdInUrl("block-1");
    expect(new URLSearchParams(window.location.search).get("bid")).toBe("block-1");
  });

  it("should remove block query param when null", () => {
    updateBlockIdInUrl("block-1");
    updateBlockIdInUrl(null);
    expect(new URLSearchParams(window.location.search).has("bid")).toBe(false);
  });

  it("should preserve other query params", () => {
    window.history.replaceState({}, "", "/?page=home&lang=en");
    updateBlockIdInUrl("block-2");
    const params = new URLSearchParams(window.location.search);
    expect(params.get("bid")).toBe("block-2");
    expect(params.get("page")).toBe("home");
    expect(params.get("lang")).toBe("en");
  });
});

describe("useBlockSelectionQuerySync", () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    replaceStateSpy = vi.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  it("should preselect block from URL on page load", () => {
    window.history.replaceState({}, "", "/?bid=block-2");

    const { result } = renderHook(
      () => {
        useBlockSelectionQuerySync();
        return useSelectedBlockIds();
      },
      {
        wrapper: ({ children }) => (
          <TestProvider
            initialValues={[
              [presentBlocksAtom, blocks],
              [selectedBlockIdsAtom, []],
              [isPageLoadedAtom, true],
            ]}>
            {children}
          </TestProvider>
        ),
      },
    );

    expect(result.current[0]).toEqual(["block-2"]);
  });

  it("should clear stale block param if block does not exist", () => {
    window.history.replaceState({}, "", "/?bid=non-existent");

    renderHook(
      () => {
        useBlockSelectionQuerySync();
        return useSelectedBlockIds();
      },
      {
        wrapper: ({ children }) => (
          <TestProvider
            initialValues={[
              [presentBlocksAtom, blocks],
              [selectedBlockIdsAtom, []],
              [isPageLoadedAtom, true],
            ]}>
            {children}
          </TestProvider>
        ),
      },
    );

    expect(new URLSearchParams(window.location.search).has("bid")).toBe(false);
  });

  it("should not preselect block when page is not loaded", () => {
    window.history.replaceState({}, "", "/?bid=block-1");

    const { result } = renderHook(
      () => {
        useBlockSelectionQuerySync();
        return useSelectedBlockIds();
      },
      {
        wrapper: ({ children }) => (
          <TestProvider
            initialValues={[
              [presentBlocksAtom, blocks],
              [selectedBlockIdsAtom, []],
              [isPageLoadedAtom, false],
            ]}>
            {children}
          </TestProvider>
        ),
      },
    );

    expect(result.current[0]).toEqual([]);
  });

  it("should update URL when block selection changes", () => {
    const { result } = renderHook(
      () => {
        useBlockSelectionQuerySync();
        return useSelectedBlockIds();
      },
      {
        wrapper: ({ children }) => (
          <TestProvider
            initialValues={[
              [presentBlocksAtom, blocks],
              [selectedBlockIdsAtom, []],
              [isPageLoadedAtom, true],
            ]}>
            {children}
          </TestProvider>
        ),
      },
    );

    act(() => {
      result.current[1](["block-3"]);
    });

    expect(new URLSearchParams(window.location.search).get("bid")).toBe("block-3");
  });

  it("should remove block param from URL when selection is cleared", () => {
    window.history.replaceState({}, "", "/?bid=block-1");

    const { result } = renderHook(
      () => {
        useBlockSelectionQuerySync();
        return useSelectedBlockIds();
      },
      {
        wrapper: ({ children }) => (
          <TestProvider
            initialValues={[
              [presentBlocksAtom, blocks],
              [selectedBlockIdsAtom, []],
              [isPageLoadedAtom, true],
            ]}>
            {children}
          </TestProvider>
        ),
      },
    );

    // First it restores block-1 from URL
    expect(result.current[0]).toEqual(["block-1"]);

    // Now clear selection
    act(() => {
      result.current[1]([]);
    });

    expect(new URLSearchParams(window.location.search).has("bid")).toBe(false);
  });
});
