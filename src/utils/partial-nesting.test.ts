import { describe, expect, it } from "vitest";
import { getPartialUsageDepth } from "./partial-nesting";

describe("getPartialUsageDepth", () => {
  it("returns 0 for a partial not used anywhere", () => {
    expect(getPartialUsageDepth("A", {})).toBe(0);
    expect(getPartialUsageDepth("A", { B: ["C"] })).toBe(0);
  });

  it("returns 1 when used inside one top-level partial", () => {
    expect(getPartialUsageDepth("B", { A: ["B"] })).toBe(1);
  });

  it("returns the longest ancestor chain", () => {
    // A -> B -> C: C sits two partial levels deep
    expect(getPartialUsageDepth("C", { A: ["B"], B: ["C"] })).toBe(2);
  });

  it("computes the true chain from closure-style dependencies", () => {
    // Closure columns list transitive ids too: A contains [B, C], B contains [C]
    expect(getPartialUsageDepth("C", { A: ["B", "C"], B: ["C"] })).toBe(2);
  });

  it("takes the max across multiple consumers", () => {
    // X -> B and A -> B where X is itself inside Y
    expect(getPartialUsageDepth("B", { Y: ["X"], X: ["B"], A: ["B"] })).toBe(2);
  });

  it("terminates on cycles", () => {
    // Each partial is counted once around the loop; the contract is
    // termination, not a meaningful depth for an (invalid) cyclic graph.
    expect(getPartialUsageDepth("A", { A: ["B"], B: ["A"] })).toBe(2);
  });

  it("ignores a self-referencing entry", () => {
    expect(getPartialUsageDepth("A", { A: ["A"] })).toBe(0);
  });
});
