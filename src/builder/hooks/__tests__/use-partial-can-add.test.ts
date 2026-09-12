/**
 * @vitest-environment happy-dom
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCanAddPartial, useCheckPartialCanAdd } from "~/builder/hooks/partial-blocks/use-partial-can-add";
import { usePartialGraph } from "~/builder/hooks/partial-blocks/use-partial-graph";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { getPartialUsageDepth } from "~/utils/partial-nesting";

vi.mock("~/builder/hooks/use-builder-prop", () => ({
  useBuilderProp: vi.fn(),
}));

vi.mock("~/builder/hooks/partial-blocks/use-partial-graph", () => ({
  usePartialGraph: vi.fn(),
}));

const mockUseBuilderProp = useBuilderProp as any;
const mockUsePartialGraph = usePartialGraph as any;

type GraphSetup = {
  pageId: string;
  dependencies?: Record<string, string[]>;
  partialPages?: string[];
};

const setup = ({ pageId, dependencies = {}, partialPages = [] }: GraphSetup) => {
  mockUseBuilderProp.mockImplementation((key: string, fallback: unknown) => (key === "pageId" ? pageId : fallback));
  const partialSet = new Set(partialPages);
  mockUsePartialGraph.mockReturnValue({
    dependencies,
    isPartialPage: (id: string) => partialSet.has(id),
    getUsageDepth: (id: string) => getPartialUsageDepth(id, dependencies),
  });
};

const check = (targetId: string) => {
  const { result } = renderHook(() => useCheckPartialCanAdd());
  return result.current(targetId);
};

describe("useCheckPartialCanAdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows everything when no page id is set", () => {
    setup({ pageId: "" });
    expect(check("A").canAdd).toBe(true);
  });

  describe("editing a regular page", () => {
    it("allows a partial-free partial", () => {
      setup({ pageId: "page-1", partialPages: ["A"] });
      expect(check("A").canAdd).toBe(true);
    });

    it("allows a partial one level deep (page -> A -> B)", () => {
      setup({ pageId: "page-1", partialPages: ["A", "B"], dependencies: { A: ["B"], B: [] } });
      expect(check("A").canAdd).toBe(true);
    });

    it("blocks a partial whose chain would exceed the depth limit", () => {
      // MAX_PARTIAL_DEPTH = 3: page -> A -> B -> C is allowed, so the chain has
      // to reach four deep (A -> B -> C -> D) to exceed the limit.
      setup({
        pageId: "page-1",
        partialPages: ["A", "B", "C", "D"],
        dependencies: { A: ["B"], B: ["C"], C: ["D"], D: [] },
      });
      const result = check("A");
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain("Maximum nesting depth");
    });
  });

  describe("editing a partial", () => {
    it("blocks adding the partial into itself", () => {
      setup({ pageId: "A", partialPages: ["A"] });
      const result = check("A");
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain("itself");
    });

    it("blocks a circular reference (target contains the current partial)", () => {
      setup({ pageId: "A", partialPages: ["A", "B"], dependencies: { B: ["A"] } });
      const result = check("B");
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain("circular");
    });

    it("allows a partial-free partial", () => {
      setup({ pageId: "A", partialPages: ["A", "B"], dependencies: { A: [], B: [] } });
      expect(check("B").canAdd).toBe(true);
    });

    it("blocks a partial that itself contains partials", () => {
      // MAX_PARTIAL_DEPTH = 3: editing A (used nowhere), adding a partial that
      // is itself two deep (B -> C -> D) makes A -> B -> C -> D = 4, over the
      // limit. A single nested level (B -> C) would now be allowed.
      setup({
        pageId: "A",
        partialPages: ["A", "B", "C", "D"],
        dependencies: { A: [], B: ["C"], C: ["D"], D: [] },
      });
      const result = check("B");
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain("contains other partials");
    });

    it("blocks all partials when the current partial is used inside another partial", () => {
      // Top -> Outer -> A: A already sits at the maximum depth, so nothing more
      // can be added inside it (adding B would make level 4).
      setup({
        pageId: "A",
        partialPages: ["A", "B", "Outer", "Top"],
        dependencies: { Top: ["Outer"], Outer: ["A"], A: [], B: [] },
      });
      const result = check("B");
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain("used inside another partial");
    });
  });
});

describe("useCanAddPartial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to the same rules", () => {
    setup({ pageId: "A", partialPages: ["A"] });
    const { result } = renderHook(() => useCanAddPartial("A"));
    expect(result.current.canAdd).toBe(false);
  });
});
