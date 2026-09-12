import { removeBraces } from "./remove-braces";

describe("removeBraces", () => {
  it("should remove braces at the start and end", () => {
    expect(removeBraces("{Hello World}")).toBe("Hello World");
  });

  it("should handle whitespace around the braces", () => {
    expect(removeBraces("  {Hello World}  ")).toBe("Hello World");
    expect(removeBraces("{  Hello World  }")).toBe("Hello World");
  });

  it("should not remove braces if they are not at both start and end", () => {
    expect(removeBraces("Function {test}()")).toBe("Function {test}()");
    expect(removeBraces("{Hello")).toBe("{Hello");
    expect(removeBraces("World}")).toBe("World}");
  });

  it("should not remove inner braces", () => {
    expect(removeBraces("{const a = { b: 1 };}")).toBe("const a = { b: 1 };");
  });

  it("should return original string if no braces", () => {
    expect(removeBraces("Hello World")).toBe("Hello World");
  });

  it("should handle empty string", () => {
    expect(removeBraces("")).toBe("");
  });

  it("should handle empty braces", () => {
    expect(removeBraces("{}")).toBe("");
  });
});
