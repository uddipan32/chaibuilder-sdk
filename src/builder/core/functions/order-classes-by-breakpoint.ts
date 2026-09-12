import { constructClassObject } from "~/builder/core/functions/class-fn";

export function orderClassesByBreakpoint(classes: string): string {
  //sanitize the classes
  classes = classes.replace(/\s+/g, " ");
  const classesArray = classes
    .split(" ")
    .map(constructClassObject)
    .filter((cls) => cls !== null);
  const breakpointOrder = ["xs", "sm", "md", "lg", "xl", "2xl"];
  return classesArray
    .sort((a, b) => {
      return breakpointOrder.indexOf(a.mq) - breakpointOrder.indexOf(b.mq);
    })
    .map((cls) => cls.fullCls)
    .join(" ");
}

if (import.meta.vitest) {
  test("orderClassesByBreakpoint", () => {
    expect(orderClassesByBreakpoint("bg-red-400 sm:bg-red-500")).toBe("bg-red-400 sm:bg-red-500");
    expect(orderClassesByBreakpoint("bg-red-400 sm:bg-red-500 md:bg-red-600")).toBe(
      "bg-red-400 sm:bg-red-500 md:bg-red-600",
    );
    expect(orderClassesByBreakpoint("xl:sticky block sm:absolute")).toBe("block sm:absolute xl:sticky");
    expect(orderClassesByBreakpoint("sm:bg-red-500 bg-red-400")).toBe("bg-red-400 sm:bg-red-500");
    expect(orderClassesByBreakpoint("sm:w-[30%] w-[30%]")).toBe("w-[30%] sm:w-[30%]");
    expect(orderClassesByBreakpoint("text-[30px]       sm:text-[20px]")).toBe("text-[30px] sm:text-[20px]");
  });
}
