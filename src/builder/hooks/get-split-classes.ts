import { STYLES_KEY } from "~/constants/STRINGS";

export const getSplitChaiClasses = (classesString: string): { baseClasses: string; classes: string } => {
  classesString = classesString.replace(STYLES_KEY, "");
  if (!classesString) return { baseClasses: "", classes: "" };

  // Split by comma, but not within square brackets
  const parts = classesString.split(/,(?![^\[]*\])/);

  // If there's only one part, return it as classes
  if (parts.length === 1) {
    return { baseClasses: "", classes: parts[0].trim() };
  }

  // First part is base classes, rest joined back for classes with commas (like gradients)
  const [baseClasses, ...rest] = parts;
  return {
    baseClasses: baseClasses.trim(),
    classes: rest
      .join(",")
      .trim()
      .replace(/ +(?= )/g, ""),
  };
};

if (import.meta.vitest) {
  describe("getSplitChaiClasses", () => {
    it("should return the base classes and the classes", () => {
      const classesMap = {
        [`,styles-2`]: { baseClasses: "", classes: "styles-2" },
        [`styles-1,styles-2`]: { baseClasses: "styles-1", classes: "styles-2" },
        [`,bg-[linear-gradient(-10deg,black,transparent_100%)]`]: {
          baseClasses: "",
          classes: "bg-[linear-gradient(-10deg,black,transparent_100%)]",
        },
        [`styles-1,bg-[linear-gradient(-10deg,black,transparent_100%)]`]: {
          baseClasses: "styles-1",
          classes: "bg-[linear-gradient(-10deg,black,transparent_100%)]",
        },
        ["someclass"]: {
          baseClasses: "",
          classes: "someclass",
        },
        [",bg-red-500 text-center   font-bold"]: {
          baseClasses: "",
          classes: "bg-red-500 text-center font-bold",
        },
        ["bg-[linear-gradient(-10deg,black,transparent_100%)], bg-[linear-gradient(-10deg,black,transparent_100%)]"]: {
          baseClasses: "bg-[linear-gradient(-10deg,black,transparent_100%)]",
          classes: "bg-[linear-gradient(-10deg,black,transparent_100%)]",
        },
      };
      for (const [key, expectedValue] of Object.entries(classesMap)) {
        const result = getSplitChaiClasses(`${STYLES_KEY}${key}`);
        expect(result).toEqual(expectedValue);
      }
    });
  });
}
