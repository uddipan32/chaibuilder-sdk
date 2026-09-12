export type ChaiBuilderTheme = "light" | "dark";

export const builderThemeStorageKey = "chai-builder-ui-theme";
export const builderThemeCookieKey = "payload-theme";
export const builderThemeCookieMaxAge = 60 * 60 * 24 * 365;
export const defaultBuilderTheme: ChaiBuilderTheme = "dark";

/** Accept both Jotai's JSON storage format and legacy raw values. */
export const parseBuilderTheme = (value: unknown): ChaiBuilderTheme | null => {
  if (typeof value !== "string") {
    return null;
  }

  if (value === "light" || value === "dark") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed === "light" || parsed === "dark" ? parsed : null;
  } catch {
    return null;
  }
};

export const parseBuilderThemeCookie = (cookie: string): ChaiBuilderTheme | null => {
  const value = cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${builderThemeCookieKey}=`))
    ?.slice(builderThemeCookieKey.length + 1);

  return parseBuilderTheme(value);
};

export const readBuilderThemeCookie = (): ChaiBuilderTheme | null =>
  typeof document === "undefined" ? null : parseBuilderThemeCookie(document.cookie);

export const writeBuilderThemeCookie = (theme: ChaiBuilderTheme): void => {
  document.cookie = `${builderThemeCookieKey}=${theme}; Max-Age=${builderThemeCookieMaxAge}; Path=/`;
};
