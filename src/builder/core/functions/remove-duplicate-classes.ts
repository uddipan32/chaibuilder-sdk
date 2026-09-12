import { ClassDerivedObject, constructClassObject } from "~/builder/core/functions/class-fn";

export function removeDuplicateClasses(classes: string): string {
  classes = classes.replace(/\s+/g, " ");
  if (!classes) return "";

  // breakpoint order
  const breakpointOrder = ["xs", "sm", "md", "lg", "xl", "2xl"];

  const classesArray: ClassDerivedObject[] = classes
    .split(" ")
    .map(constructClassObject)
    .filter((cls): cls is ClassDerivedObject => cls !== null);
  let filteredClasses: string = classes;
  if (classesArray.length === 1) return classesArray[0].fullCls;

  for (const cls of classesArray) {
    const property = cls.property;
    const order = breakpointOrder.indexOf(cls.mq);
    for (let i = order + 1; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      const clsObj = classesArray.find((cls) => cls.property === property && cls.mq === breakpoint);
      if (clsObj && clsObj.cls === cls.cls) {
        filteredClasses = filteredClasses.replace(clsObj.fullCls, "");
      } else if (clsObj && clsObj.cls !== cls.cls) {
        break;
      }
    }
  }
  return filteredClasses.replace(/\s+/g, " ").trim();
}

if (import.meta.vitest) {
  test("removeDuplicateClasses (tailwind classes) at higher breakpoints", () => {
    expect(removeDuplicateClasses("")).toBe("");
    expect(removeDuplicateClasses("bg-red-400")).toBe("bg-red-400");
    expect(removeDuplicateClasses("bg-red-400    sm:bg-red-500")).toBe("bg-red-400 sm:bg-red-500");
    expect(removeDuplicateClasses("bg-red-400 sm:bg-red-400")).toBe("bg-red-400");
    expect(removeDuplicateClasses("bg-red-400 sm:bg-red-400 lg:bg-red-400")).toBe("bg-red-400");
    expect(removeDuplicateClasses("p-4 sm:p-6 md:p-4")).toBe("p-4 sm:p-6 md:p-4");
    expect(removeDuplicateClasses("p-4 sm:p-6 md:p-4 lg:p-4")).toBe("p-4 sm:p-6 md:p-4");
    expect(removeDuplicateClasses("sm:bg-red-400 bg-red-400")).toBe("bg-red-400");
    expect(removeDuplicateClasses("w-[30%] sm:w-[30%]")).toBe("w-[30%]");
    expect(removeDuplicateClasses("w-[30%] sm:w-[30%] md:w-[40%]")).toBe("w-[30%] md:w-[40%]");
  });
}
