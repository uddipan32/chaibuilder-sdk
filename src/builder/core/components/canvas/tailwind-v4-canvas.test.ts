import { describe, expect, it } from "vitest";
import { getChaiThemeCssTheme } from "~/builder/core/components/canvas/static/chai-theme-helpers";
import { getIframeInitialContent } from "~/builder/core/components/canvas/IframeInitialContent";

const loadTailwindStylesheet = async (id: string) => {
  const { readFile } = await import("node:fs/promises");
  const { createRequire } = await import("node:module");
  const path = await import("node:path");
  const root = path.dirname(createRequire(import.meta.url).resolve("tailwindcss/package.json"));
  const file = id === "tailwindcss" ? "index.css" : `${id.replace("tailwindcss/", "")}.css`;
  const target = path.join(root, file);
  return { path: target, base: path.dirname(target), content: await readFile(target, "utf8") };
};

// Mirrors the browser build: concatenate every text/tailwindcss style in document order, then
// prepend the default import when the result carries none of its own.
const readTailwindStyles = (html: string) => {
  const css = Array.from(html.matchAll(/<style type="text\/tailwindcss"[^>]*>([\s\S]*?)<\/style>/g))
    .map((match) => match[1])
    .join("\n");

  return css.includes("@import") ? css : `@import "tailwindcss";${css}`;
};

describe("tailwind v4 canvas CSS", () => {
  it("compiles with real tailwind v4 and emits themed utilities", async () => {
    const themeOptions = {
      fontFamily: { "font-heading": "Heading", "font-body": "Body" },
      borderRadius: "0.5rem",
      colors: [{ group: "Base", items: { primary: "Primary", border: "Border", background: "Bg", foreground: "Fg" } }],
    } as never;

    const css = `${readTailwindStyles(getIframeInitialContent({ tailwindCSS: "4" }))}\n${getChaiThemeCssTheme(themeOptions)}`;

    const { compile } = (await import("tailwindcss")) as any;
    const compiler = await compile(css, { base: "/", loadStylesheet: loadTailwindStylesheet });

    const built = compiler.build([
      "bg-primary",
      "rounded-lg",
      "font-heading",
      "dark:bg-background",
      "text-2xl",
      "border-border",
      "animate-accordion-down",
    ]);

    expect(built).toContain("hsl(var(--primary))");
    expect(built).toContain("var(--radius)");
    expect(built).toContain("var(--chai-font-heading)");
    expect(built).toContain(".dark");
    expect(built).toContain("accordion-down 0.2s ease-out");
    expect(built).toContain("@keyframes accordion-down");
  });

  // `@theme inline` would resolve values into the utilities but never emit these variables,
  // leaving the base `border-color: var(--color-border, currentColor)` on its fallback.
  it("emits the --color-* variables the canvas base styles depend on", async () => {
    const themeOptions = {
      colors: [{ group: "Base", items: { border: "Border", primary: "Primary" } }],
    } as never;

    const css = `${readTailwindStyles(getIframeInitialContent({ tailwindCSS: "4" }))}\n${getChaiThemeCssTheme(themeOptions)}`;

    const { compile } = (await import("tailwindcss")) as any;
    const compiler = await compile(css, { base: "/", loadStylesheet: loadTailwindStylesheet });
    const built = compiler.build(["p-2"]);

    expect(built).toContain("--color-border: hsl(var(--border));");
    expect(built).toContain("--color-primary: hsl(var(--primary));");
  });
});
