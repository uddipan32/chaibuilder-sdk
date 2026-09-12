// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChaiTheme } from "~/types";
import { CssThemeVariables } from "./css-theme-var";

// Regression for the builder font flicker: React 19 re-assigns innerHTML on every
// render for an inline `dangerouslySetInnerHTML={{ __html }}` (new object identity),
// which replaces a <style>'s text node even when the CSS is unchanged. For the canvas
// @font-face sheet that resets every FontFace and paints one fallback frame per block
// selection. Rendering the CSS as a text child keeps the node untouched across renders.
describe("CssThemeVariables", () => {
  const theme = { fontFamily: { heading: "Poppins", body: "Poppins" }, colors: {} } as unknown as ChaiTheme;

  it("does not replace the <style> text node when re-rendered with equal CSS", () => {
    const { container, rerender } = render(<CssThemeVariables theme={theme} />);
    const style = container.querySelector("#chai-theme") as HTMLStyleElement;
    const textNode = style.firstChild;
    expect(textNode?.nodeType).toBe(Node.TEXT_NODE);

    // Same values, NEW object identity — what every editor render does via useTheme().
    rerender(<CssThemeVariables theme={{ ...theme }} />);
    rerender(<CssThemeVariables theme={{ ...theme }} />);

    expect(style.firstChild).toBe(textNode);
    expect(style.textContent).toContain("--font-heading");
  });

  it("does update when the CSS actually changes", () => {
    const { container, rerender } = render(<CssThemeVariables theme={theme} />);
    const style = container.querySelector("#chai-theme") as HTMLStyleElement;
    const before = style.textContent;
    rerender(<CssThemeVariables theme={{ ...theme, fontFamily: { heading: "Geist", body: "Geist" } } as unknown as ChaiTheme} />);
    expect(style.textContent).not.toBe(before);
    expect(style.textContent).toContain("Geist");
  });
});
