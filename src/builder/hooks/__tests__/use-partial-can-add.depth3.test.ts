/**
 * @vitest-environment happy-dom
 *
 * Same rules as use-partial-can-add.test.ts, but with MAX_PARTIAL_DEPTH
 * mocked to 3 — proves the enforcement is derived from the constant and a
 * depth change needs no rule rewrites.
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCheckPartialCanAdd } from "~/builder/hooks/partial-blocks/use-partial-can-add";
import { usePartialGraph } from "~/builder/hooks/partial-blocks/use-partial-graph";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { getPartialUsageDepth } from "~/utils/partial-nesting";

vi.mock("~/constants/PARTIAL_BLOCKS", () => ({
  MAX_PARTIAL_DEPTH: 3,
}));

vi.mock("~/builder/hooks/use-builder-prop", () => ({
  useBuilderProp: vi.fn(),
}));

vi.mock("~/builder/hooks/partial-blocks/use-partial-graph", () => ({
  usePartialGraph: vi.fn(),
}));

const mockUseBuilderProp = useBuilderProp as any;
const mockUsePartialGraph = usePartialGraph as any;

const setup = ({
  pageId,
  dependencies = {},
  partialPages = [],
}: {
  pageId: string;
  dependencies?: Record<string, string[]>;
  partialPages?: string[];
}) => {
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

describe("useCheckPartialCanAdd with MAX_PARTIAL_DEPTH = 3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a 3-deep chain on a regular page (page -> A -> B -> C)", () => {
    setup({ pageId: "page-1", partialPages: ["A", "B", "C"], dependencies: { A: ["B"], B: ["C"], C: [] } });
    expect(check("A").canAdd).toBe(true);
  });

  it("blocks a 4-deep chain on a regular page", () => {
    setup({
      pageId: "page-1",
      partialPages: ["A", "B", "C", "D"],
      dependencies: { A: ["B"], B: ["C"], C: ["D"], D: [] },
    });
    expect(check("A").canAdd).toBe(false);
  });

  it("allows a partial containing a partial inside a top-level partial", () => {
    // Editing A (used nowhere): adding B (which contains C) => A -> B -> C = 3
    setup({ pageId: "A", partialPages: ["A", "B", "C"], dependencies: { A: [], B: ["C"], C: [] } });
    expect(check("B").canAdd).toBe(true);
  });

  it("blocks a 3-deep partial inside a partial", () => {
    setup({
      pageId: "A",
      partialPages: ["A", "B", "C", "D"],
      dependencies: { A: [], B: ["C"], C: ["D"], D: [] },
    });
    expect(check("B").canAdd).toBe(false);
  });

  it("allows a leaf partial inside a partial that is nested one level deep", () => {
    // Outer -> A already; adding leaf B => Outer -> A -> B = 3
    setup({
      pageId: "A",
      partialPages: ["A", "B", "Outer"],
      dependencies: { Outer: ["A"], A: [], B: [] },
    });
    expect(check("B").canAdd).toBe(true);
  });

  it("blocks a non-leaf partial inside a partial that is nested one level deep", () => {
    setup({
      pageId: "A",
      partialPages: ["A", "B", "C", "Outer"],
      dependencies: { Outer: ["A"], A: [], B: ["C"], C: [] },
    });
    expect(check("B").canAdd).toBe(false);
  });

  it("blocks everything inside a partial nested two levels deep", () => {
    // Top -> Outer -> A: A sits at level 3 already
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
