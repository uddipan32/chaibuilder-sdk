import { describe, expect, it } from "vitest";
import { getOutlineDropPosition } from "./outline-drop-position";

describe("getOutlineDropPosition", () => {
  const rect = { top: 100, height: 40 };

  it.each([
    [105, true, "before"],
    [120, true, "inside"],
    [135, true, "after"],
    [115, false, "before"],
    [125, false, "after"],
  ] as const)("maps pointer %s with inside=%s to %s", (pointerY, canDropInside, expected) => {
    expect(getOutlineDropPosition(pointerY, rect, canDropInside)).toBe(expected);
  });
});
