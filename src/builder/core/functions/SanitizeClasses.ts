import { filter, find, isEmpty, map } from "lodash-es";
import { ClassDerivedObject, constructClassObject } from "~/builder/core/functions/class-fn";

const breakpoints: string[] = ["xs", "sm", "md", "lg", "xl", "2xl"];
export const sanitizeClasses = (classes: string): string => {
  classes = classes.trim().replace(/ +(?= )/g, "");
  if (isEmpty(classes)) return "";

  const classesArray = map(classes.split(" "), constructClassObject) as ClassDerivedObject[];
  const toBeRemoved: string[] = [];
  // check for every class

  for (const classObj of classesArray) {
    const breakpoint = classObj.mq;

    /**
     * If the class is already marked for removal, skip it
     */
    if (toBeRemoved.includes(classObj.fullCls)) {
      continue;
    }

    /**
     * Start checking for breakpoints from current breakpoint + 1.
     * eg: sm, start check from md
     */
    for (let i = breakpoints.indexOf(breakpoint) + 1; i < breakpoints.length; i++) {
      /**
       * If another class with the same property and breakpoint is found but with different cls value, bail
       */
      const breakpointClass = find(classesArray, {
        property: classObj.property,
        mq: breakpoints[i],
      });
      if (breakpointClass && breakpointClass.cls !== classObj.cls) {
        break;
      }
      if (find(classesArray, { cls: classObj.cls, mq: breakpoints[i] })) {
        toBeRemoved.push(`${breakpoints[i]}:${classObj.cls}`);
      }
    }
  }
  return filter(
    map(classesArray, (cls: ClassDerivedObject) => {
      if (!toBeRemoved.includes(cls.fullCls)) {
        return cls.fullCls;
      }
      return null;
    }),
    (cls: string) => cls !== null,
  ).join(" ");
};
