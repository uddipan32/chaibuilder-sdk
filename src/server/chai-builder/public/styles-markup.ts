import { getSplitChaiClasses } from "~/builder/hooks/get-split-classes";
import { STYLES_KEY } from "~/constants/STRINGS";
import type { ChaiBlock } from "~/types";

/**
 * Flatten `#styles:base,responsive…` strings into space-separated class
 * candidates for Tailwind scanning. Staging replaced every comma with a space;
 * that broke gradient commas inside `[]`. `getSplitChaiClasses` is bracket-safe
 * and matches how the renderer builds the DOM `class` attribute.
 */
export const blocksToStylesMarkup = (blocks: ChaiBlock[]): string => {
  return JSON.stringify(blocks).replace(/#styles:([^"]*)/g, (_match, content: string) => {
    const { baseClasses, classes } = getSplitChaiClasses(`${STYLES_KEY}${content}`);
    return [baseClasses, classes].filter(Boolean).join(" ");
  });
};
