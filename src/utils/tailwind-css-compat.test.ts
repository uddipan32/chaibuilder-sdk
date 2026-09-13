import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("tailwindcss");
  vi.unstubAllEnvs();
});

describe("tailwind-css-compat", () => {
  it("extracts Tailwind candidates from markup-like content", async () => {
    const { extractTailwindCandidates } = await import("./tailwind-css-compat");

    expect(
      extractTailwindCandidates([
        `<div class="bg-red-500 text-white"></div>`,
        `{"styles":"bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"}`,
      ]),
    ).toEqual(
      expect.arrayContaining([
        "bg-red-500",
        "text-white",
        "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]",
        "bg-[size:24px_24px]",
      ]),
    );
  });

  it("merges safelist into extracted candidates", async () => {
    const { extractTailwindCandidates } = await import("./tailwind-css-compat");

    expect(extractTailwindCandidates([`<div class="p-4"></div>`], ["max-w-full", "prose"])).toEqual(
      expect.arrayContaining(["p-4", "max-w-full", "prose"]),
    );
  });

  it("uses the v4 compile API when available", async () => {
    const build = vi.fn(() => ".bg-red-500{}");
    const compile = vi.fn(async () => ({ build }));

    vi.doMock("tailwindcss", () => ({
      compile,
    }));

    const { compileTailwindCss } = await import("./tailwind-css-compat");
    const css = await compileTailwindCss({
      markupStrings: [`<div class="bg-red-500"></div>`],
      config: { darkMode: "class" },
    });

    expect(css).toBe(".bg-red-500{}");
    expect(compile).toHaveBeenCalledWith(
      expect.stringContaining(`@import "tailwindcss/theme";`),
      expect.objectContaining({
        loadModule: expect.any(Function),
        loadStylesheet: expect.any(Function),
      }),
    );
    expect(build).toHaveBeenCalledWith(expect.arrayContaining(["bg-red-500"]));
  });

  it("imports full Tailwind entry when includeBaseStyles is true on v4", async () => {
    const build = vi.fn(() => ".preflight{}");
    const compile = vi.fn(async (_css: string) => ({ build }));

    vi.doMock("tailwindcss", () => ({
      compile,
    }));

    const { compileTailwindCss } = await import("./tailwind-css-compat");
    await compileTailwindCss({
      markupStrings: [`<div class="text-sm"></div>`],
      includeBaseStyles: true,
      config: { darkMode: "class" },
    });

    expect(compile).toHaveBeenCalledWith(expect.stringMatching(/@import "tailwindcss";/), expect.any(Object));
    expect(compile.mock.calls[0]?.[0]).not.toContain(`@import "tailwindcss/theme";`);
  });

  it("passes safelist candidates to the v4 build step", async () => {
    const build = vi.fn(() => ".max-w-full{}");
    const compile = vi.fn(async () => ({ build }));

    vi.doMock("tailwindcss", () => ({
      compile,
    }));

    const { compileTailwindCss } = await import("./tailwind-css-compat");
    await compileTailwindCss({
      markupStrings: [`<div class="p-2"></div>`],
      safelist: ["max-w-full"],
      config: { darkMode: "class" },
    });

    expect(build).toHaveBeenCalledWith(expect.arrayContaining(["p-2", "max-w-full"]));
  });

  it("uses a fresh compiler per call so candidates never accumulate across pages", async () => {
    // v4 build() accumulates candidates on the compiler instance; reusing one across calls would
    // leak page A's utilities into page B's CSS. Each compiler must therefore build exactly once.
    const compilers: Array<{ build: ReturnType<typeof vi.fn> }> = [];
    const compile = vi.fn(async () => {
      const compiler = { build: vi.fn((candidates: string[]) => `css-${compilers.length}:${candidates.join(",")}`) };
      compilers.push(compiler);
      return compiler;
    });

    vi.doMock("tailwindcss", () => ({ compile }));
    const { compileTailwindCss } = await import("./tailwind-css-compat");
    const config = { darkMode: "class" };

    await compileTailwindCss({ markupStrings: [`<div class="p-1"></div>`], config });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await compileTailwindCss({ markupStrings: [`<div class="p-2"></div>`], config });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await compileTailwindCss({ markupStrings: [`<div class="p-3"></div>`], config });
    await new Promise((resolve) => setTimeout(resolve, 0));

    for (const compiler of compilers) {
      expect(compiler.build.mock.calls.length).toBeLessThanOrEqual(1);
    }
    const buildCalls = compilers.flatMap((c) => c.build.mock.calls.map((call) => call[0] as string[]));
    expect(buildCalls).toHaveLength(3);
    expect(buildCalls[0]).toContain("p-1");
    expect(buildCalls[1]).toContain("p-2");
    expect(buildCalls[2]).toContain("p-3");
    expect(buildCalls[1]).not.toContain("p-1");
    expect(buildCalls[2]).not.toContain("p-2");
  });

  it("serves the second call from the prewarmed compiler", async () => {
    let nextId = 0;
    const compile = vi.fn(async () => {
      const id = ++nextId;
      return { build: () => `css-from-${id}` };
    });

    vi.doMock("tailwindcss", () => ({ compile }));
    const { compileTailwindCss } = await import("./tailwind-css-compat");
    const config = { darkMode: "class" };

    const first = await compileTailwindCss({ markupStrings: [`<div class="p-1"></div>`], config });
    expect(first).toBe("css-from-1");

    // Let the background prewarm settle, then the next call must consume compiler #2 without
    // compiling on its own critical path.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(compile).toHaveBeenCalledTimes(2);

    const second = await compileTailwindCss({ markupStrings: [`<div class="p-2"></div>`], config });
    expect(second).toBe("css-from-2");
  });

  it("does not reuse a compiler prewarmed for a different config", async () => {
    const compile = vi.fn(
      async (
        _css: string,
        opts: { loadModule: (id: string, base: string, hint: "config") => Promise<{ module: { darkMode?: string } }> },
      ) => {
        const { module } = await opts.loadModule("virtual:chai-builder-tailwind-config", "", "config");
        return { build: () => `css-for-${module.darkMode}` };
      },
    );

    vi.doMock("tailwindcss", () => ({ compile }));
    const { compileTailwindCss } = await import("./tailwind-css-compat");

    const first = await compileTailwindCss({
      markupStrings: [`<div class="p-1"></div>`],
      config: { darkMode: "class" },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = await compileTailwindCss({
      markupStrings: [`<div class="p-1"></div>`],
      config: { darkMode: "media" },
    });

    expect(first).toBe("css-for-class");
    expect(second).toBe("css-for-media");
  });

  it("reuses the pool across equivalent configs built from fresh objects", async () => {
    let nextId = 0;
    const compile = vi.fn(async () => {
      const id = ++nextId;
      return { build: () => `css-from-${id}` };
    });

    vi.doMock("tailwindcss", () => ({ compile }));
    const { compileTailwindCss } = await import("./tailwind-css-compat");
    const plugin = () => {};

    const makeConfig = () => ({
      darkMode: "class",
      theme: { extend: { colors: { brand: "red" } } },
      plugins: [plugin],
    });

    await compileTailwindCss({ markupStrings: [`<div class="p-1"></div>`], config: makeConfig() });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = await compileTailwindCss({ markupStrings: [`<div class="p-2"></div>`], config: makeConfig() });

    expect(second).toBe("css-from-2");
  });

  it("recovers when a prewarmed compiler fails to compile", async () => {
    let calls = 0;
    const compile = vi.fn(async () => {
      calls += 1;
      if (calls === 2) {
        throw new Error("prewarm boom");
      }
      const id = calls;
      return { build: () => `css-from-${id}` };
    });

    vi.doMock("tailwindcss", () => ({ compile }));
    const { compileTailwindCss } = await import("./tailwind-css-compat");
    const config = { darkMode: "class" };

    expect(await compileTailwindCss({ markupStrings: [`<div class="p-1"></div>`], config })).toBe("css-from-1");
    await new Promise((resolve) => setTimeout(resolve, 0));
    // The prewarmed compiler (call 2) rejected; the next request must fall back to a fresh one.
    expect(await compileTailwindCss({ markupStrings: [`<div class="p-2"></div>`], config })).toBe("css-from-3");
  });

  it("serves Tailwind stylesheets from the vendored copies, never from disk", async () => {
    type LoadStylesheet = (id: string, base: string) => Promise<{ path: string; content: string }>;
    let loadStylesheet: LoadStylesheet | undefined;
    const compile = vi.fn(async (_css: string, opts: { loadStylesheet: LoadStylesheet }) => {
      loadStylesheet = opts.loadStylesheet;
      return { build: () => "" };
    });

    vi.doMock("tailwindcss", () => ({ compile }));
    const { compileTailwindCss } = await import("./tailwind-css-compat");
    await compileTailwindCss({ markupStrings: [`<div class="p-1"></div>`], config: { darkMode: "class" } });

    const theme = await loadStylesheet!("tailwindcss/theme", "virtual:tailwindcss");
    expect(theme.content).toContain("--color-red-500");
    expect(theme.path).toBe("virtual:tailwindcss/theme.css");

    const utilities = await loadStylesheet!("tailwindcss/utilities", "virtual:tailwindcss");
    expect(utilities.content).toContain("@tailwind utilities");

    // Relative imports between the vendored stylesheets resolve too.
    const relativeTheme = await loadStylesheet!("./theme.css", "virtual:tailwindcss");
    expect(relativeTheme.content).toBe(theme.content);

    await expect(loadStylesheet!("./not-a-tailwind-file.css", "virtual:tailwindcss")).rejects.toThrow(
      /Unsupported Tailwind stylesheet import/,
    );
  });

  it("sorts min-width @media ascending so larger breakpoints override smaller ones", async () => {
    const { sortMinWidthMediaQueries } = await import("./tailwind-css-compat");
    const css = [
      "@media (width >= 1900px) { .min-\\[1900px\\]\\:hidden { display: none; } }",
      "@media (width >= 64rem) { .lg\\:flex { display: flex; } }",
      "@media (width >= 40rem) { .sm\\:flex { display: flex; } }",
    ].join("\n");

    const sorted = sortMinWidthMediaQueries(css);
    const sm = sorted.indexOf("40rem");
    const lg = sorted.indexOf("64rem");
    const wide = sorted.indexOf("1900px");
    expect(sm).toBeGreaterThan(-1);
    expect(lg).toBeGreaterThan(sm);
    expect(wide).toBeGreaterThan(lg);
  });

  it("sorts @media without postcss (the serverless runtime has no postcss)", async () => {
    // postcss is not bundled into the serverless function, so the sort must be dependency-free.
    const { sortMinWidthMediaQueries } = await import("./tailwind-css-compat");
    const css = [
      ".flex { display: flex; }",
      "@media (width >= 1900px) { .min-\\[1900px\\]\\:hidden { display: none; } }",
      "@media (width >= 64rem) { .lg\\:flex { display: flex; } }",
    ].join("\n");

    const sorted = sortMinWidthMediaQueries(css);
    // lg (64rem) must precede the wider 1900px block so min-[1900px]:hidden wins at ≥1900px.
    expect(sorted.indexOf("64rem")).toBeLessThan(sorted.indexOf("1900px"));
    // Non-media rules are preserved.
    expect(sorted).toContain(".flex { display: flex; }");
    // Idempotent.
    expect(sortMinWidthMediaQueries(sorted)).toBe(sorted);
  });

  it("leaves CSS untouched when it has no @media blocks", async () => {
    const { sortMinWidthMediaQueries } = await import("./tailwind-css-compat");
    const css = ".flex { display: flex; } .hidden { display: none; }";
    expect(sortMinWidthMediaQueries(css)).toBe(css);
  });

  it("fails loudly when the resolved tailwindcss has no compile API", async () => {
    vi.doMock("tailwindcss", () => ({ compile: undefined }));

    const { compileTailwindCss } = await import("./tailwind-css-compat");
    await expect(
      compileTailwindCss({ markupStrings: [`<div class="p-1"></div>`], config: { darkMode: "class" } }),
    ).rejects.toThrow(/requires Tailwind v4/);
  });
});
