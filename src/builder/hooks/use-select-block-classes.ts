import { atom, useAtomValue } from "jotai";
import { filter, first, get as getProp, isNull, map, startsWith } from "lodash-es";
import { ClassDerivedObject, constructClassObject } from "~/builder/core/functions/class-fn";
import { getQueries } from "~/builder/core/utils/get-queries";
import { getSplitChaiClasses } from "~/builder/hooks/get-split-classes";
import { darkModeAtom } from "~/builder/hooks/use-dark-mode";
import { canvasBreakpointAtom } from "~/builder/hooks/use-screen-size-width";
import { selectedBlockAtom, styleStateAtom } from "~/builder/hooks/use-selected-blockIds";
import { selectedStylingBlocksAtom } from "~/builder/hooks/use-selected-styling-blocks";
import { STYLES_KEY } from "~/constants/STRINGS";

/**
 * Derived atom based on selected block classes
 */
export const selectedBlockAllClassesAtom = atom((get) => {
  const styleBlock = first(get(selectedStylingBlocksAtom));
  const selectedBlock = get(selectedBlockAtom);
  if (!styleBlock || styleBlock.blockId !== getProp(selectedBlock, "_id", null)) return [];
  const classesString: string = getProp(selectedBlock, styleBlock.prop, `${STYLES_KEY},`);
  const { classes } = getSplitChaiClasses(classesString);
  return filter(map(classes.trim().split(" "), constructClassObject), (cls) => !isNull(cls));
});

export const useSelectedBlockAllClasses = (): Array<ClassDerivedObject> =>
  useAtomValue(selectedBlockAllClassesAtom) as Array<ClassDerivedObject>;

/**
 * Derived state that holds the active classes based on
 * dark mode, media query and modifier
 */

const MQ: { [key: string]: number } = {
  xs: 0,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
  "2xl": 5,
};

export const selectedBlockCurrentClassesAtom = atom((get) => {
  const breakpoint: string = get(canvasBreakpointAtom); // get canvas breakpoint and not style breakpoint
  const modifier: string = get(styleStateAtom);
  const darkMode: boolean = get(darkModeAtom);
  const mQueries: Array<string> = getQueries(breakpoint);

  let classes = filter(get(selectedBlockAllClassesAtom), { mod: modifier });

  if (!startsWith(modifier, "_")) {
    classes = filter(classes, (cls: any) => mQueries.includes(cls.mq));
  }

  // sort classes by mq
  classes = classes.sort((a: any, b: any) => MQ[a.mq] - MQ[b.mq]);

  if (!darkMode) {
    classes = filter(classes, { dark: false });
  } else {
    // TODO: implementation pending
    // let darkClasses = filter(classes, {dark: true});
    // each(darkClasses, cls => {
    // })
  }
  return classes;
});

export const useSelectedBlockCurrentClasses = (): Array<ClassDerivedObject> =>
  useAtomValue(selectedBlockCurrentClassesAtom) as Array<ClassDerivedObject>;
