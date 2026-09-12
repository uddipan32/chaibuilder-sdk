import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const darkModeAtom = atomWithStorage("darkMode", false);

/**
 * Wrapper hook around useAtom
 */
export const useDarkMode = () => {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  return [darkMode, setDarkMode] as const;
};
