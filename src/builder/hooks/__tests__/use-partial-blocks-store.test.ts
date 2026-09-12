import { getPartialDepth, wouldCreateCycle } from "~/builder/hooks/use-partial-blocks-store";

describe("wouldCreateCycle", () => {
  it("should return true for self-reference", () => {
    const result = wouldCreateCycle("A", "A", {});
    expect(result).toBe(true);
  });

  it("should return false when no cycle exists with empty dependencies", () => {
    const result = wouldCreateCycle("A", "B", {});
    expect(result).toBe(false);
  });

  it("should return true for direct cycle (B contains A)", () => {
    const dependencies = { B: ["A"] };
    const result = wouldCreateCycle("A", "B", dependencies);
    expect(result).toBe(true);
  });

  it("should return true for transitive cycle (B -> C -> A)", () => {
    const dependencies = { B: ["C"], C: ["A"] };
    const result = wouldCreateCycle("A", "B", dependencies);
    expect(result).toBe(true);
  });

  it("should return false when no cycle exists (unrelated partials)", () => {
    const dependencies = { B: ["C"], C: ["D"] };
    const result = wouldCreateCycle("A", "B", dependencies);
    expect(result).toBe(false);
  });

  it("should return true for deep transitive cycle (B -> C -> D -> A)", () => {
    const dependencies = { B: ["C"], C: ["D"], D: ["A"] };
    const result = wouldCreateCycle("A", "B", dependencies);
    expect(result).toBe(true);
  });

  it("should handle multiple dependencies without cycle", () => {
    const dependencies = { B: ["C", "D"], C: ["E"], D: ["F"] };
    const result = wouldCreateCycle("A", "B", dependencies);
    expect(result).toBe(false);
  });

  it("should return true when one branch has cycle", () => {
    const dependencies = { B: ["C", "D"], C: ["E"], D: ["A"] };
    const result = wouldCreateCycle("A", "B", dependencies);
    expect(result).toBe(true);
  });

  it("should handle cycle in dependency graph that doesn't include current", () => {
    // B -> C -> D -> C (cycle), but doesn't include A
    const dependencies = { B: ["C"], C: ["D"], D: ["C"] };
    const result = wouldCreateCycle("A", "B", dependencies);
    expect(result).toBe(false);
  });
});

describe("getPartialDepth", () => {
  it("should return 1 for partial with no dependencies", () => {
    const result = getPartialDepth("A", {});
    expect(result).toBe(1);
  });

  it("should return 2 for single level nesting", () => {
    const dependencies = { A: ["B"] };
    const result = getPartialDepth("A", dependencies);
    expect(result).toBe(2);
  });

  it("should return 3 for two levels of nesting", () => {
    const dependencies = { A: ["B"], B: ["C"] };
    const result = getPartialDepth("A", dependencies);
    expect(result).toBe(3);
  });

  it("should return max depth when multiple children exist", () => {
    // A -> B -> D (depth 3)
    // A -> C (depth 2)
    // Max depth should be 3
    const dependencies = { A: ["B", "C"], B: ["D"] };
    const result = getPartialDepth("A", dependencies);
    expect(result).toBe(3);
  });

  it("should handle cycle by stopping at visited node", () => {
    // A -> B -> A (cycle)
    const dependencies = { A: ["B"], B: ["A"] };
    const result = getPartialDepth("A", dependencies);
    // Should return 2 (A -> B), not infinite
    expect(result).toBe(2);
  });

  it("should return 4 for three levels of nesting", () => {
    const dependencies = { A: ["B"], B: ["C"], C: ["D"] };
    const result = getPartialDepth("A", dependencies);
    expect(result).toBe(4);
  });

  it("should return 5 for four levels of nesting", () => {
    const dependencies = { A: ["B"], B: ["C"], C: ["D"], D: ["E"] };
    const result = getPartialDepth("A", dependencies);
    expect(result).toBe(5);
  });

  it("should handle complex tree structure", () => {
    // A -> B -> D -> F (depth 4)
    // A -> B -> E (depth 3)
    // A -> C (depth 2)
    const dependencies = { A: ["B", "C"], B: ["D", "E"], D: ["F"] };
    const result = getPartialDepth("A", dependencies);
    expect(result).toBe(4);
  });

  it("should return 1 for partial not in dependencies map", () => {
    const dependencies = { B: ["C"] };
    const result = getPartialDepth("A", dependencies);
    expect(result).toBe(1);
  });
});
