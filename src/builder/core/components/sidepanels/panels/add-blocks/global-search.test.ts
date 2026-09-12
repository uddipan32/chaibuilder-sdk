import { describe, expect, it } from "vitest";
import { matchesGlobalSearch } from "./global-search";

describe("matchesGlobalSearch", () => {
  it("matches labels, descriptions, and tags without case sensitivity", () => {
    expect(
      matchesGlobalSearch("hero", [
        "Call to action",
        "Full-width Hero",
        "marketing",
      ]),
    ).toBe(true);
    expect(
      matchesGlobalSearch("marketing", [
        "Call to action",
        "Full-width Hero",
        "marketing",
      ]),
    ).toBe(true);
    expect(
      matchesGlobalSearch("gallery", [
        "Call to action",
        "Full-width Hero",
        "marketing",
      ]),
    ).toBe(false);
  });
});
