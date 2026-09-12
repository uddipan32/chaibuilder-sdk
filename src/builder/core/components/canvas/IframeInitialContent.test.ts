import { describe, expect, it } from "vitest";
import { getIframeInitialContent, TAILWIND_CDN_URLS, TAILWIND_THEME_STYLE_ID } from "./IframeInitialContent";

describe("getIframeInitialContent", () => {
  it("defaults to Tailwind v4 CDN", () => {
    const html = getIframeInitialContent();

    expect(html).toContain(TAILWIND_CDN_URLS["4"]);
    expect(html).toContain(`src="${TAILWIND_CDN_URLS["4"]}"`);
    expect(html).not.toContain("__TAILWIND_CDN__");
    expect(html).not.toContain("__HTML_DIR__");
  });

  it("uses the v3 CDN when tailwindCSS is 3", () => {
    const html = getIframeInitialContent({ tailwindCSS: "3" });

    expect(html).toContain(TAILWIND_CDN_URLS["3"]);
    expect(html).toContain("cdn.tailwindcss.com");
    expect(html).not.toContain(TAILWIND_CDN_URLS["4"]);
  });

  it("sets html dir for rtl layouts", () => {
    const html = getIframeInitialContent({ htmlDir: "rtl", tailwindCSS: "4" });

    expect(html).toContain('dir="rtl"');
    expect(html).toContain(TAILWIND_CDN_URLS["4"]);
  });

  it("exposes distinct CDN URLs for v3 and v4", () => {
    expect(TAILWIND_CDN_URLS["3"]).toContain("cdn.tailwindcss.com");
    expect(TAILWIND_CDN_URLS["4"]).toContain("@tailwindcss/browser");
    expect(TAILWIND_CDN_URLS["3"]).not.toBe(TAILWIND_CDN_URLS["4"]);
  });

  it("keeps the config-driven @apply base rule on v3", () => {
    const html = getIframeInitialContent({ tailwindCSS: "3" });

    expect(html).toContain("@apply border-border;");
    expect(html).not.toContain("__TAILWIND_STYLE__");
  });

  // The v4 browser build drops the whole sheet when one utility is unknown.
  it("compiles standalone on v4 without theme-dependent utilities in base", () => {
    const html = getIframeInitialContent({ tailwindCSS: "4" });

    expect(html).toContain("@custom-variant dark (&:where(.dark, .dark *));");
    expect(html).toContain("border-color: var(--color-border, currentColor);");
    expect(html).not.toContain("@apply border-border;");
    expect(html).not.toContain("__TAILWIND_STYLE__");
  });

  // Spelling out the import makes the browser resolve "tailwindcss" as a relative URL and 404;
  // the build injects it for us when the concatenated CSS has no @import of its own.
  it("leaves the tailwindcss import to the v4 browser build", () => {
    expect(getIframeInitialContent({ tailwindCSS: "4" })).not.toContain("@import");
  });

  it("ships an empty theme placeholder on v4 for TailwindV4Theme to fill", () => {
    const html = getIframeInitialContent({ tailwindCSS: "4" });

    expect(html).toContain(`<style type="text/tailwindcss" id="${TAILWIND_THEME_STYLE_ID}"></style>`);
    expect(getIframeInitialContent({ tailwindCSS: "3" })).not.toContain(TAILWIND_THEME_STYLE_ID);
  });

  it("ships the rte utilities on both versions", () => {
    for (const tailwindCSS of ["3", "4"] as const) {
      const html = getIframeInitialContent({ tailwindCSS });

      expect(html).toContain('<style type="text/tailwindcss">');
      expect(html).toContain("@apply list-disc pl-6 text-base;");
    }
  });
});
