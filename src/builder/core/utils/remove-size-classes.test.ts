import { removeSizeClasses } from "./remove-size-classes";

describe("removeSizeClasses", () => {
  describe("default styles (no width/height)", () => {
    it("should not remove w-full or h-full when no dimensions are provided", () => {
      const styles = "#styles:w-full h-full,custom-class";
      const result = removeSizeClasses(styles);
      expect(result).toBe("#styles:w-full h-full,custom-class");
    });

    it("should handle empty styles string", () => {
      const styles = "";
      const result = removeSizeClasses(styles);
      expect(result).toBe("");
    });

    it("should preserve styles when no w-full or h-full exists", () => {
      const styles = "#styles:bg-red-500 text-center,custom-class";
      const result = removeSizeClasses(styles);
      expect(result).toBe("#styles:bg-red-500 text-center,custom-class");
    });
  });

  describe("width-only removal", () => {
    it("should remove w-full when width is provided", () => {
      const styles = "#styles:w-full h-full,custom-class";
      const result = removeSizeClasses(styles, 100);
      expect(result).toBe("#styles:h-full,custom-class");
    });

    it("should remove w-full from base classes only", () => {
      const styles = "#styles:w-full bg-red-500,custom-class";
      const result = removeSizeClasses(styles, 100);
      expect(result).toBe("#styles:bg-red-500,custom-class");
    });

    it("should remove w-full from custom classes only", () => {
      const styles = "#styles:bg-red-500,w-full custom-class";
      const result = removeSizeClasses(styles, 100);
      expect(result).toBe("#styles:bg-red-500,custom-class");
    });

    it("should remove w-full from both base and custom classes", () => {
      const styles = "#styles:w-full bg-red-500,w-full custom-class";
      const result = removeSizeClasses(styles, 100);
      expect(result).toBe("#styles:bg-red-500,custom-class");
    });

    it("should preserve h-full when only width is provided", () => {
      const styles = "#styles:w-full h-full,custom-class";
      const result = removeSizeClasses(styles, 100);
      expect(result).toBe("#styles:h-full,custom-class");
    });

    it("should handle width value of 0 (falsy but valid)", () => {
      const styles = "#styles:w-full h-full,custom-class";
      const result = removeSizeClasses(styles, 0);
      expect(result).toBe("#styles:w-full h-full,custom-class");
    });
  });

  describe("height-only removal", () => {
    it("should remove h-full when height is provided", () => {
      const styles = "#styles:w-full h-full,custom-class";
      const result = removeSizeClasses(styles, undefined, 200);
      expect(result).toBe("#styles:w-full,custom-class");
    });

    it("should remove h-full from base classes only", () => {
      const styles = "#styles:h-full bg-red-500,custom-class";
      const result = removeSizeClasses(styles, undefined, 200);
      expect(result).toBe("#styles:bg-red-500,custom-class");
    });

    it("should remove h-full from custom classes only", () => {
      const styles = "#styles:bg-red-500,h-full custom-class";
      const result = removeSizeClasses(styles, undefined, 200);
      expect(result).toBe("#styles:bg-red-500,custom-class");
    });

    it("should remove h-full from both base and custom classes", () => {
      const styles = "#styles:h-full bg-red-500,h-full custom-class";
      const result = removeSizeClasses(styles, undefined, 200);
      expect(result).toBe("#styles:bg-red-500,custom-class");
    });

    it("should preserve w-full when only height is provided", () => {
      const styles = "#styles:w-full h-full,custom-class";
      const result = removeSizeClasses(styles, undefined, 200);
      expect(result).toBe("#styles:w-full,custom-class");
    });

    it("should handle height value of 0 (falsy but valid)", () => {
      const styles = "#styles:w-full h-full,custom-class";
      const result = removeSizeClasses(styles, undefined, 0);
      expect(result).toBe("#styles:w-full h-full,custom-class");
    });
  });

  describe("both width and height removal", () => {
    it("should remove both w-full and h-full when both dimensions are provided", () => {
      const styles = "#styles:w-full h-full,custom-class";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:,custom-class");
    });

    it("should remove both w-full and h-full from base classes", () => {
      const styles = "#styles:w-full h-full bg-red-500,custom-class";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:bg-red-500,custom-class");
    });

    it("should remove both w-full and h-full from custom classes", () => {
      const styles = "#styles:bg-red-500,w-full h-full custom-class";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:bg-red-500,custom-class");
    });

    it("should remove both w-full and h-full from both base and custom classes", () => {
      const styles = "#styles:w-full h-full,w-full h-full custom-class";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:,custom-class");
    });

    it("should preserve other classes when removing w-full and h-full", () => {
      const styles = "#styles:w-full h-full bg-red-500 text-center,w-full h-full custom-class font-bold";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:bg-red-500 text-center,custom-class font-bold");
    });

    it("should handle complex styles with gradients", () => {
      const styles = "#styles:w-full h-full,bg-[linear-gradient(-10deg,black,transparent_100%)]";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:,bg-[linear-gradient(-10deg,black,transparent_100%)]");
    });
  });

  describe("edge cases", () => {
    it("should handle styles with only w-full", () => {
      const styles = "#styles:w-full,";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:,");
    });

    it("should handle styles with only h-full", () => {
      const styles = "#styles:h-full,";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:,");
    });

    it("should handle styles with multiple spaces", () => {
      const styles = "#styles:w-full  h-full  bg-red-500,custom-class";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:bg-red-500,custom-class");
    });

    it("should not remove partial matches (w-full-custom, h-full-custom)", () => {
      const styles = "#styles:w-full-custom h-full-custom,custom-class";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:w-full-custom h-full-custom,custom-class");
    });

    it("should handle styles with no custom classes", () => {
      const styles = "#styles:w-full h-full,";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:,");
    });

    it("should handle styles with no base classes", () => {
      const styles = "#styles:,w-full h-full custom-class";
      const result = removeSizeClasses(styles, 100, 200);
      expect(result).toBe("#styles:,custom-class");
    });
  });
});
