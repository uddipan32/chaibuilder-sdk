import { getThemeFontsUrls } from "~/builder/core/components/canvas/static/chai-theme-helpers";
import { ChaiFontByUrl } from "~/types";

describe("getThemeFontsUrls", () => {
  it("returns [] for empty input", () => {
    expect(getThemeFontsUrls([])).toEqual([]);
  });

  it("dedupes by family and by URL (two families sharing one bundled stylesheet)", () => {
    const shared = "https://fonts.googleapis.com/css2?family=Inter&family=Lora&display=swap";
    const fonts = [
      { family: "Inter", url: shared },
      { family: "Lora", url: shared },
      { family: "Inter", url: shared }, // duplicate family
      { family: "Roboto", url: "https://fonts.googleapis.com/css2?family=Roboto" },
    ] as ChaiFontByUrl[];
    // Consumers key <link rel="stylesheet"> by URL, so URLs must be unique.
    expect(getThemeFontsUrls(fonts)).toEqual([shared, "https://fonts.googleapis.com/css2?family=Roboto"]);
  });
});
