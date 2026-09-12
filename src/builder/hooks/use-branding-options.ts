import { atom, useAtom } from "jotai";
import { isObject } from "lodash-es";
import { BRANDING_OPTIONS_DEFAULTS } from "~/constants/MODIFIERS";
import { ChaiBlock } from "~/types/common";

type BrandingOptions = {
  bodyBgDarkColor: string;
  bodyBgLightColor: string;
  bodyFont: string;
  bodyTextDarkColor: string;
  bodyTextLightColor: string;
  headingFont: string;
  primaryColor: string;
  roundedCorners: number;
  secondaryColor: string;
} & Record<string, string>;

export const brandingOptionsAtom = atom<any>(BRANDING_OPTIONS_DEFAULTS as BrandingOptions);
export const blocksContainerAtom = atom<ChaiBlock | null>(null);
/**
 * Wrapper around useAtom
 */
export const useBrandingOptions = () => {
  const [brandingOptions, setBrandingOptions] = useAtom(brandingOptionsAtom);
  return [
    isObject(brandingOptions) ? { ...BRANDING_OPTIONS_DEFAULTS, ...brandingOptions } : BRANDING_OPTIONS_DEFAULTS,
    setBrandingOptions,
  ] as const;
};

export const useBlocksContainer = () => {
  return useAtom(blocksContainerAtom);
};
