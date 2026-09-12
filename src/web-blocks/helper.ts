import { cn } from "~/builder/core/functions/common-functions";
import { ChaiStyles } from "~/types/blocks";

export const addForcedClasses = (styles: ChaiStyles, ...classes: string[]) => {
  // get all the classes from the blockStateClasses if the value is true
  return {
    ...styles,
    className: cn(styles.className, ...classes),
  };
};
