import { ChaiFont, ChaiFontBySrc } from "~/types/common";

const REGISTERED_FONTS: ChaiFont[] = [
  {
    family: "Arial",
    fallback: `Helvetica, sans-serif`,
  },
  {
    family: "Times New Roman",
    fallback: `Georgia, serif`,
  },
  {
    family: "Courier New",
    fallback: `Courier, monospace`,
  },
];

export const registerChaiFont = (family: string, font: Omit<ChaiFontBySrc, "family">) => {
  REGISTERED_FONTS.unshift({
    family,
    ...font,
  } as ChaiFont);
};

export const useRegisteredFonts = () => {
  return REGISTERED_FONTS;
};

export const getRegisteredFont = (family: string) => {
  return REGISTERED_FONTS.find((font) => font.family === family);
};

export const getAllRegisteredFonts = () => {
  return REGISTERED_FONTS;
};

export { getFontStyles } from "./font-helpers";
