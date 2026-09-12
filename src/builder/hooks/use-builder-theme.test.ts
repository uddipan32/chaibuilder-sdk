import { canvasThemeStorageKey } from "~/builder/atoms/ui";
import {
  builderThemeStorageKey,
  defaultBuilderTheme,
  parseBuilderTheme,
} from "~/builder/hooks/use-builder-theme";

describe("builder theme storage", () => {
  it("keeps the UI preference separate from the canvas theme", () => {
    expect(builderThemeStorageKey).not.toBe(canvasThemeStorageKey);
  });

  it("defaults the builder UI to dark", () => {
    expect(defaultBuilderTheme).toBe("dark");
  });

  it.each([
    ['"light"', "light"],
    ['"dark"', "dark"],
    ["light", "light"],
    ["dark", "dark"],
  ])("parses %s as %s", (value, expected) => {
    expect(parseBuilderTheme(value)).toBe(expected);
  });

  it.each([undefined, null, "", "true", '"sepia"', "not-a-theme"]) (
    "rejects invalid stored value %s",
    (value) => {
      expect(parseBuilderTheme(value)).toBeNull();
    },
  );

  it("does not use the canvas theme storage key", () => {
    expect(builderThemeStorageKey).not.toBe("chai-builder-canvas-theme");
  });
});
