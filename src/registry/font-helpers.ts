import { compact, filter, has, map, uniqBy } from "lodash-es";
import { getRegisteredFont } from "~/registry";
import { ChaiFont, ChaiFontBySrc } from "~/types";

const getThemeFontFaceCSS = (fonts: string[]) => {
  const fontdefintions = filter(compact(map(fonts, getRegisteredFont)), (font: ChaiFont) => has(font, "src"));
  return getThemeCustomFontFaceStyle(fontdefintions as ChaiFontBySrc[]);
};

const getThemeCustomFontFaceStyle = (fonts: ChaiFontBySrc[]) => {
  if (!fonts || fonts.length === 0) return "";

  return uniqBy(fonts, "family")
    .map((font: ChaiFontBySrc) =>
      font.src
        .map(
          (source) => `@font-face {
        font-family: "${font.family}";
        src: url("${source.url}") format("${source.format}");
        font-display: swap;
        font-optical-sizing: auto;
        ${source.fontWeight ? `font-weight: ${source.fontWeight};` : ""}
        ${source.fontStyle ? `font-style: ${source.fontStyle};` : ""}
        ${source.fontStretch ? `font-stretch: ${source.fontStretch};` : ""}
      }`,
        )
        .join("\n"),
    )
    .join("\n");
};

export const getFontStyles = async (
  headingFont: string,
  bodyFont: string,
): Promise<{ fontStyles: string; preloads: string[] }> => {
  const fontStyles = getThemeFontFaceCSS([headingFont, bodyFont]);

  const preloads: string[] = [];
  const fonts = [headingFont, ...(headingFont !== bodyFont ? [bodyFont] : [])];

  fonts.forEach((fontName) => {
    const font = getRegisteredFont(fontName) as ChaiFontBySrc | undefined;
    if (font && has(font, "src") && font.src && font.src.length > 0) {
      preloads.push(font.src[0].url);
    }
  });

  return { fontStyles, preloads: uniqBy(preloads, (url) => url) };
};
