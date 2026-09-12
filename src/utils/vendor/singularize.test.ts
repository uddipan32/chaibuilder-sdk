import { describe, expect, it } from "vitest";
import { singularize } from "./singularize";

describe("singularize", () => {
  it("handles regular plurals (collection-slug vocabulary)", () => {
    expect(singularize("pages")).toBe("page");
    expect(singularize("blogs")).toBe("blog");
    expect(singularize("products")).toBe("product");
    expect(singularize("authors")).toBe("author");
  });

  it("handles -ies plurals", () => {
    expect(singularize("categories")).toBe("category");
    expect(singularize("cities")).toBe("city");
    expect(singularize("entries")).toBe("entry");
  });

  it("handles -es plurals after sibilants", () => {
    expect(singularize("boxes")).toBe("box");
    expect(singularize("classes")).toBe("class");
    expect(singularize("dishes")).toBe("dish");
    expect(singularize("branches")).toBe("branch");
    expect(singularize("statuses")).toBe("status");
  });

  it("handles -oes plurals", () => {
    expect(singularize("heroes")).toBe("hero");
  });

  it("handles irregular plurals", () => {
    expect(singularize("children")).toBe("child");
    expect(singularize("people")).toBe("person");
    expect(singularize("media")).toBe("medium");
    expect(singularize("indices")).toBe("index");
  });

  it("preserves leading capitalization for irregulars", () => {
    expect(singularize("People")).toBe("Person");
    expect(singularize("Children")).toBe("Child");
  });

  it("leaves uncountable words unchanged", () => {
    expect(singularize("news")).toBe("news");
    expect(singularize("settings")).toBe("settings");
    expect(singularize("series")).toBe("series");
    expect(singularize("data")).toBe("data");
  });

  it("leaves already-singular words unchanged", () => {
    expect(singularize("page")).toBe("page");
    expect(singularize("class")).toBe("class");
    expect(singularize("hero")).toBe("hero");
  });
});
