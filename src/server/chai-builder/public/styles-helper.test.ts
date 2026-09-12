import { afterEach, describe, expect, it, vi } from "vitest";

const { mockStat, mockReadFile } = vi.hoisted(() => ({
  mockStat: vi.fn(),
  mockReadFile: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  default: {
    stat: mockStat,
    readFile: mockReadFile,
  },
}));

const BASE_CSS = `
@layer properties;
@layer theme, base, components, utilities;
@layer theme {
  :root, :host { --color-red-500: oklch(63.7% 0.237 25.331); --spacing: 0.25rem; }
}
@layer utilities {
  .bg-red-500 { background: red; }
  .text-lg { font-size: 1.125rem; }
}
@media (min-width: 768px) { .md-only { display: flex; } }
@property --tw-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
`;

const useBaseCss = (css: string = BASE_CSS, mtimeMs = 1000) => {
  mockStat.mockResolvedValue({ mtimeMs, size: css.length });
  mockReadFile.mockResolvedValue(css);
};

const importHelper = async () => {
  const module = await import("./styles-helper");
  return module;
};

describe("filterDuplicateStyles", () => {
  afterEach(() => {
    vi.resetModules();
    mockStat.mockReset();
    mockReadFile.mockReset();
  });

  it("removes top-level rules whose selectors exist in the base stylesheet", async () => {
    useBaseCss();
    const { filterDuplicateStyles } = await importHelper();

    const result = await filterDuplicateStyles(".bg-red-500 { background: red; } .p-4 { padding: 1rem; }");

    expect(result).not.toContain(".bg-red-500");
    expect(result).toContain(".p-4");
  });

  it("keeps duplicate selectors that live inside a media query", async () => {
    useBaseCss();
    const { filterDuplicateStyles } = await importHelper();

    const result = await filterDuplicateStyles(
      "@media (min-width: 768px) { .bg-red-500 { background: red; } } .bg-red-500 { background: red; }",
    );

    expect(result).toContain("@media (min-width: 768px)");
    expect(result).toMatch(/@media[^}]*\.bg-red-500/);
    expect(result.match(/\.bg-red-500/g)).toHaveLength(1);
  });

  it("removes :root custom properties already declared in the base stylesheet, keeps the rest", async () => {
    useBaseCss();
    const { filterDuplicateStyles } = await importHelper();

    const result = await filterDuplicateStyles(
      ":root, :host { --color-red-500: oklch(63.7% 0.237 25.331); --color-amber-500: oklch(76.9% 0.188 70.08); } .p-4 { padding: 1rem; }",
    );

    expect(result).not.toContain("--color-red-500");
    expect(result).toContain("--color-amber-500");
    expect(result).toContain(".p-4");
  });

  it("removes the :root rule entirely when all of its custom properties are duplicates", async () => {
    useBaseCss();
    const { filterDuplicateStyles } = await importHelper();

    const result = await filterDuplicateStyles(":root, :host { --color-red-500: red; --spacing: 0.25rem; }");

    expect(result.trim()).toBe("");
  });

  it("removes @property registrations already made in the base stylesheet", async () => {
    useBaseCss();
    const { filterDuplicateStyles } = await importHelper();

    const result = await filterDuplicateStyles(
      '@property --tw-shadow { syntax: "*"; inherits: false; } @property --tw-blur { syntax: "*"; inherits: false; }',
    );

    expect(result).not.toContain("--tw-shadow");
    expect(result).toContain("@property --tw-blur");
  });

  it("keeps duplicate selectors nested inside @supports and @layer blocks", async () => {
    useBaseCss();
    const { filterDuplicateStyles } = await importHelper();

    const input =
      "@layer properties { @supports (color: red) { .bg-red-500 { background: red; } } } .bg-red-500 { background: red; }";
    const result = await filterDuplicateStyles(input);

    expect(result).toContain("@layer properties");
    expect(result.match(/\.bg-red-500/g)).toHaveLength(1);
  });

  it("keeps rules whose selectors are not in the base stylesheet", async () => {
    useBaseCss();
    const { filterDuplicateStyles } = await importHelper();

    const input = ".not-in-base { color: blue; }";
    expect(await filterDuplicateStyles(input)).toBe(input);
  });

  it("returns the input unchanged when the base stylesheet cannot be read", async () => {
    mockStat.mockRejectedValue(new Error("ENOENT"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { filterDuplicateStyles } = await importHelper();

    const input = ".bg-red-500 { background: red; }";
    expect(await filterDuplicateStyles(input)).toBe(input);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns the input unchanged when the input css is unparsable", async () => {
    useBaseCss();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { filterDuplicateStyles } = await importHelper();

    const input = ".broken { color: red;";
    expect(await filterDuplicateStyles(input)).toBe(input);
    errorSpy.mockRestore();
  });

  it("parses the base stylesheet once across calls when the file is unchanged", async () => {
    useBaseCss();
    const { filterDuplicateStyles } = await importHelper();

    await filterDuplicateStyles(".bg-red-500 { background: red; }");
    await filterDuplicateStyles(".text-lg { font-size: 1.125rem; }");
    await filterDuplicateStyles(".p-4 { padding: 1rem; }");

    expect(mockReadFile).toHaveBeenCalledTimes(1);
    expect(mockStat).toHaveBeenCalledTimes(3);
  });

  it("re-parses the base stylesheet when the file changes on disk", async () => {
    useBaseCss(BASE_CSS, 1000);
    const { filterDuplicateStyles } = await importHelper();

    const first = await filterDuplicateStyles(".bg-red-500 { background: red; }");
    expect(first).not.toContain(".bg-red-500");

    // Base stylesheet no longer contains .bg-red-500, so the rule must survive.
    useBaseCss(".other { color: green; }", 2000);
    const second = await filterDuplicateStyles(".bg-red-500 { background: red; }");
    expect(second).toContain(".bg-red-500");
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });

  it("still filters correctly after a failed read once the file becomes readable", async () => {
    mockStat.mockRejectedValueOnce(new Error("ENOENT"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { filterDuplicateStyles } = await importHelper();

    expect(await filterDuplicateStyles(".bg-red-500 { background: red; }")).toContain(".bg-red-500");

    useBaseCss();
    expect(await filterDuplicateStyles(".bg-red-500 { background: red; }")).not.toContain(".bg-red-500");
    errorSpy.mockRestore();
  });
});

describe("getGlobalStylesFingerprint", () => {
  afterEach(() => {
    vi.resetModules();
    mockStat.mockReset();
    mockReadFile.mockReset();
  });

  it("returns a stable content hash for the same file", async () => {
    useBaseCss();
    const { getGlobalStylesFingerprint } = await importHelper();

    const first = await getGlobalStylesFingerprint();
    const second = await getGlobalStylesFingerprint();

    expect(first).toMatch(/^[0-9a-f]{12}$/);
    expect(second).toBe(first);
  });

  it("changes when the global stylesheet changes", async () => {
    useBaseCss(BASE_CSS, 1000);
    const { getGlobalStylesFingerprint } = await importHelper();
    const first = await getGlobalStylesFingerprint();

    useBaseCss(".other { color: green; }", 2000);
    const second = await getGlobalStylesFingerprint();

    expect(second).not.toBe(first);
  });

  it('returns "none" when the global stylesheet is missing', async () => {
    mockStat.mockRejectedValue(new Error("ENOENT"));
    const { getGlobalStylesFingerprint } = await importHelper();

    expect(await getGlobalStylesFingerprint()).toBe("none");
  });
});

describe("preloadBaseStyleSelectors", () => {
  afterEach(() => {
    vi.resetModules();
    mockStat.mockReset();
    mockReadFile.mockReset();
  });

  it("warms the selector cache so the next filter call skips the file read", async () => {
    useBaseCss();
    const { filterDuplicateStyles, preloadBaseStyleSelectors } = await importHelper();

    preloadBaseStyleSelectors();
    await vi.waitFor(() => expect(mockReadFile).toHaveBeenCalledTimes(1));

    const result = await filterDuplicateStyles(".bg-red-500 { background: red; }");
    expect(result).not.toContain(".bg-red-500");
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("swallows errors instead of rejecting", async () => {
    mockStat.mockRejectedValue(new Error("ENOENT"));
    const { preloadBaseStyleSelectors } = await importHelper();

    expect(() => preloadBaseStyleSelectors()).not.toThrow();
    // Give the swallowed rejection a tick to surface if it were unhandled.
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
});
