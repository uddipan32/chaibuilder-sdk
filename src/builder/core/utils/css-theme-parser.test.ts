import { ChaiTheme } from "~/types/chaibuilder-editor-props";
import { parseToChaiThemeValues, validateChaiThemeValues, validateCssInput } from "./css-theme-parser";

const getValidMockTheme = (): ChaiTheme => ({
  fontFamily: { heading: "Arial", body: "Arial" },
  borderRadius: "8px",
  colors: {
    background: ["#ffffff", "#000000"],
    foreground: ["#000000", "#ffffff"],
    primary: ["#3b82f6", "#60a5fa"],
    "primary-foreground": ["#ffffff", "#1e293b"],
    secondary: ["#f1f5f9", "#334155"],
    "secondary-foreground": ["#0f172a", "#f8fafc"],
    muted: ["#f8fafc", "#1e293b"],
    "muted-foreground": ["#64748b", "#94a3b8"],
    accent: ["#f1f5f9", "#334155"],
    "accent-foreground": ["#0f172a", "#f8fafc"],
    destructive: ["#ef4444", "#f87171"],
    "destructive-foreground": ["#ffffff", "#1e293b"],
    border: ["#e2e8f0", "#475569"],
    input: ["#e2e8f0", "#475569"],
    ring: ["#3b82f6", "#60a5fa"],
    card: ["#ffffff", "#0f172a"],
    "card-foreground": ["#000000", "#f8fafc"],
    popover: ["#ffffff", "#0f172a"],
    "popover-foreground": ["#000000", "#f8fafc"],
  },
});

describe("css-theme-parser utilities", () => {
  describe("validateCssInput", () => {
    it("should return isValid: true for valid theme CSS", () => {
      const validCss = `
        :root {
          --background: #ffffff;
          --primary: #000000;
          --radius: 8px;
        }
        .dark {
          --background: #000000;
          --primary: #ffffff;
        }
      `;
      const result = validateCssInput(validCss);
      expect(result.isValid).toBe(true);
    });

    it("should return isValid: false for empty or null input", () => {
      expect(validateCssInput("").isValid).toBe(false);
      expect(validateCssInput("   ").isValid).toBe(false);

      // @ts-expect-error - testing invalid runtime input
      expect(validateCssInput(null).isValid).toBe(false);
    });

    it("should return isValid: false for input without braces", () => {
      const invalidCss = "--primary: #000;";
      const result = validateCssInput(invalidCss);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("block structure");
    });

    it("should return isValid: false for unmatched braces", () => {
      const invalidCss = ":root { --primary: #000; } }";
      const result = validateCssInput(invalidCss);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Unmatched braces");
    });

    it("should return isValid: false for input without CSS variables", () => {
      const invalidCss = ":root { background: white; }";
      const result = validateCssInput(invalidCss);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("variable definitions");
    });

    it("should return isValid: false for input without :root or .dark selectors", () => {
      const invalidCss = "body { --primary: #000; }";
      const result = validateCssInput(invalidCss);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain(":root or .dark");
    });
  });

  describe("parseToChaiThemeValues", () => {
    it("should correctly parse a full valid theme", () => {
      const css = `
        :root {
          --font-sans: "Arial", sans-serif;
          --radius: 0.5rem;
          --primary: #3b82f6;
          --background: #ffffff;
          --foreground: #000000;
          --primary-foreground: #ffffff;
        }
        .dark {
          --primary: #60a5fa;
          --background: #000000;
          --foreground: #ffffff;
          --primary-foreground: #1e293b;
        }
      `;
      const result = parseToChaiThemeValues(css);

      expect(result.fontFamily.heading).toBe("Arial");
      expect(result.borderRadius).toBe("8px");
      expect(result.colors.primary).toEqual(["#3b82f6", "#60a5fa"]);
      expect(result.colors.background).toEqual(["#ffffff", "#000000"]);
    });

    it("should handle space-separated HSL values", () => {
      const css = `
        :root {
          --primary: 221.2 83.2% 53.3%;
          --radius: 12px;
        }
        .dark {
          --primary: 217.2 91.2% 59.8%;
        }
      `;
      const result = parseToChaiThemeValues(css);
      expect(result.colors.primary[0]).toMatch(/^#[0-9a-fA-F]{6}$/i);
      expect(result.colors.primary[1]).toMatch(/^#[0-9a-fA-F]{6}$/i);
    });

    it("should handle various color formats (hex with alpha, named colors)", () => {
      const css = `
        :root {
          --primary: #3b82f6ff;
          --secondary: red;
        }
        .dark {
          --primary: #60a5fa;
          --secondary: #ff0000;
        }
      `;
      const result = parseToChaiThemeValues(css);
      expect(result.colors.primary[0]).toBe("#3b82f6");
      expect(result.colors.secondary[0]).toBe("#ff0000");
    });

    it("should gracefully capture malformed colors depending on implementation fallback", () => {
      const css = `
        :root {
          --primary: not-a-color;
        }
      `;
      const result = parseToChaiThemeValues(css);
      expect(result.colors.primary[0]).toBeDefined();
    });

    it("should convert rem and em to px", () => {
      const css = `
        :root {
          --radius: 1rem;
        }
        .dark {
          --radius: 1rem;
        }
      `;
      const result = parseToChaiThemeValues(css);
      expect(result.borderRadius).toBe("16px");

      const cssEm = `:root { --radius: 0.5em; } .dark { --radius: 0.5em; }`;
      expect(parseToChaiThemeValues(cssEm).borderRadius).toBe("8px");

      const cssPureNum = `:root { --radius: 10; } .dark { --radius: 10; }`;
      expect(parseToChaiThemeValues(cssPureNum).borderRadius).toBe("10px");
    });

    it("should use default theme fallback for malformed input", () => {
      const result = parseToChaiThemeValues("invalid css");
      expect(result.borderRadius).toBe("8px");
      expect(result.colors.background).toEqual(["#ffffff", "#000000"]);
    });

    it("should pick registered font family and ignore fallbacks", () => {
      const css = `:root { --font-sans: "Times New Roman", serif; } .dark {}`;
      const result = parseToChaiThemeValues(css);
      expect(result.fontFamily.heading).toBe("Times New Roman");
    });
  });

  describe("validateChaiThemeValues", () => {
    it("should return true for a correctly parsed full theme", () => {
      const theme = getValidMockTheme();
      expect(validateChaiThemeValues(theme)).toBe(true);
    });

    it("should return false if target colors are missing elements", () => {
      const theme = getValidMockTheme();

      // @ts-expect-error - testing invalid array length
      theme.colors.foreground = ["#000000"];
      expect(validateChaiThemeValues(theme)).toBe(false);
    });

    it("should return false if typography or radius is missing", () => {
      const theme = getValidMockTheme();
      theme.fontFamily.heading = ""; // Empty string evaluates to false
      expect(validateChaiThemeValues(theme)).toBe(false);
    });
  });
});
