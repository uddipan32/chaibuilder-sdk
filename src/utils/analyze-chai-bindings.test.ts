import { describe, expect, it } from "vitest";
import { analyzeChaiBindings, suggestChaiBindingConversion } from "./analyze-chai-bindings";

describe("analyzeChaiBindings", () => {
  it("classifies nested bindings and reports locations", () => {
    const analyses = analyzeChaiBindings([
      {
        _id: "hero",
        _type: "Heading",
        content: "{{page.title | uppercase}}",
        _show: "{{page.active}}",
        nested: { label: "{{page.title.toLowerCase()}}" },
      },
    ]);
    expect(analyses).toEqual([
      expect.objectContaining({ blockId: "hero", propertyPath: "content", classification: "pipe" }),
      expect.objectContaining({ blockId: "hero", propertyPath: "_show", classification: "path" }),
      expect.objectContaining({
        blockId: "hero",
        propertyPath: "nested.label",
        classification: "invalid",
        suggestedConversion: "page.title | lowercase",
      }),
    ]);
  });

  it("suggests common method, fallback, join, and comparison conversions", () => {
    expect(suggestChaiBindingConversion("name.toUpperCase()")).toBe("name | uppercase");
    expect(suggestChaiBindingConversion("tags.join(', ')")).toBe("tags | join ', '");
    expect(suggestChaiBindingConversion("name ?? 'Unknown'")).toBe("name | default 'Unknown'");
    expect(suggestChaiBindingConversion("price >= 10")).toBe("price | gte 10");
    expect(suggestChaiBindingConversion("active === true")).toBe("active | equals true");
  });
});
