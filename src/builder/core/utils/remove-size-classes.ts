import { getSplitChaiClasses } from "~/builder/hooks/get-split-classes";
import { STYLES_KEY } from "~/constants/STRINGS";

/**
 * Removes w-full and h-full classes from a styles string when dimensions are provided.
 * This is useful for image blocks where default styles include w-full/h-full,
 * but should be removed when explicit width/height dimensions are set.
 *
 * @param styles - The styles string in Chai format (e.g., "#styles:base-classes,custom-classes")
 * @param width - Width dimension value. Only truthy values (>0) will trigger w-full removal.
 * @param height - Height dimension value. Only truthy values (>0) will trigger h-full removal.
 * @returns The modified styles string with w-full/h-full removed as appropriate
 *
 * @remarks
 * - A width or height of 0 will NOT trigger class removal (0 is falsy)
 * - Empty base classes section is valid in Chai format (e.g., "#styles:,custom-class")
 */
export function removeSizeClasses(styles: string, width?: number, height?: number): string {
  if (!styles) return styles;

  const { baseClasses, classes } = getSplitChaiClasses(styles);

  const removeClasses = (str: string) =>
    str
      .split(" ")
      .filter((cls: string) => cls && !(width && cls === "w-full") && !(height && cls === "h-full"))
      .join(" ");

  const newBaseClasses = removeClasses(baseClasses);
  const newClasses = removeClasses(classes);

  return `${STYLES_KEY}${newBaseClasses},${newClasses}`;
}
