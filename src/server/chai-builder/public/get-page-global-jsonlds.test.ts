import { describe, expect, it } from "vitest";
import { pickGlobalJsonLds } from "./get-page-global-jsonlds";

const row = (id: string, lang: string, jsonld: unknown, primaryPage: string | null = null) => ({
  id,
  primaryPage,
  jsonld,
  lang,
});

describe("pickGlobalJsonLds", () => {
  it("resolves ids in order, matching by id or primaryPage", () => {
    const rows = [row("a", "", { "@type": "AutoDealer" }), row("b", "", { "@type": "Car" })];
    expect(pickGlobalJsonLds(rows, ["b", "a"], "fr")).toEqual([
      { id: "b", jsonld: { "@type": "Car" } },
      { id: "a", jsonld: { "@type": "AutoDealer" } },
    ]);
  });

  it("prefers the current language, then falls back to the default-language row", () => {
    const rows = [
      row("a", "", { v: "default" }),
      row("a2", "fr", { v: "fr" }, "a"), // fr variant references primary "a"
    ];
    // fr requested -> the fr variant wins
    expect(pickGlobalJsonLds(rows, ["a"], "fr")).toEqual([{ id: "a2", jsonld: { v: "fr" } }]);
    // en requested (no en variant) -> default-language row
    expect(pickGlobalJsonLds(rows, ["a"], "en")).toEqual([{ id: "a", jsonld: { v: "default" } }]);
  });

  it("skips ids with no matching row", () => {
    const rows = [row("a", "", { "@type": "AutoDealer" })];
    expect(pickGlobalJsonLds(rows, ["a", "missing"], "fr")).toEqual([{ id: "a", jsonld: { "@type": "AutoDealer" } }]);
  });
});
