import { useMemo } from "react";

import { ChaiTheme } from "~/types";
import { getChaiThemeCssVariables } from "./canvas/static/chai-theme-helpers";

const useThemeVariables = (theme: ChaiTheme) => {
  return useMemo(() => {
    return getChaiThemeCssVariables({ theme });
  }, [theme]);
};

export const CssThemeVariables = ({ theme }: { theme: ChaiTheme }) => {
  const themeVariables = useThemeVariables(theme);
  // Text child, not dangerouslySetInnerHTML: React 19 re-assigns innerHTML on
  // every render for an inline `{ __html }` object (new identity each time), which
  // replaces the style's text node even when the CSS is unchanged. See head-tags.tsx.
  return <style id="chai-theme">{themeVariables}</style>;
};
