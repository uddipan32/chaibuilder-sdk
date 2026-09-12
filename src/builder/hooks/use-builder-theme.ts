import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useLayoutEffect } from "react";

export {
  builderThemeCookieKey,
  builderThemeStorageKey,
  defaultBuilderTheme,
  parseBuilderTheme,
  readBuilderThemeCookie,
  writeBuilderThemeCookie,
  type ChaiBuilderTheme,
} from "~/theme/ui-theme";
import {
  builderThemeCookieKey,
  builderThemeStorageKey,
  defaultBuilderTheme,
  parseBuilderTheme,
  readBuilderThemeCookie,
  writeBuilderThemeCookie,
} from "~/theme/ui-theme";
import type { ChaiBuilderTheme } from "~/theme/ui-theme";

const builderThemeStorage = {
  getItem: (_key: string, initialValue: ChaiBuilderTheme) =>
    readBuilderThemeCookie() ??
    (typeof window === "undefined"
      ? initialValue
      : (() => {
          try {
            return parseBuilderTheme(window.localStorage.getItem(builderThemeStorageKey)) ?? initialValue;
          } catch {
            return initialValue;
          }
        })()),
  setItem: (key: string, value: ChaiBuilderTheme) => {
    writeBuilderThemeCookie(value);
    window.localStorage.setItem(key, JSON.stringify(value));
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key);
    document.cookie = `${builderThemeCookieKey}=; Max-Age=0; Path=/`;
  },
  subscribe: (key: string, callback: (value: ChaiBuilderTheme) => void) => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      const theme = readBuilderThemeCookie();
      if (theme) callback(theme);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  },
};

// `getOnInit` reads the cookie (then the localStorage migration value) before the
// first client render, so the Builder starts from the same preference as Payload.
export const builderThemeAtom = atomWithStorage<ChaiBuilderTheme>(
  builderThemeStorageKey,
  defaultBuilderTheme,
  builderThemeStorage,
  { getOnInit: true },
);

/**
 * Theme of the builder UI itself. Not the canvas: the page being edited has its own
 * dark mode, see useDarkMode.
 */
export const useBuilderTheme = () => {
  const [theme, setTheme] = useAtom(builderThemeAtom);
  return [theme, setTheme] as const;
};

/**
 * Puts the theme on <html>. Has to be the root element and not the builder container:
 * dialogs, popovers and hover cards portal to document.body.
 *
 * Layout effect, so the class lands before the browser paints — the builder is
 * client-only (`~/builder` throws on the server), so there is no SSR pass to warn about.
 */
export const useBuilderThemeEffect = () => {
  const [theme] = useBuilderTheme();
  useLayoutEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    writeBuilderThemeCookie(theme);

    return () => root.classList.remove("dark");
  }, [theme]);
};
