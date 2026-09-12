import { useMemo } from "react";
import { useWebsiteSetting } from "./project/use-website-settings";

export const useFallbackLang = () => {
  const { data: websiteConfig } = useWebsiteSetting();
  const fallbackLang = useMemo(() => websiteConfig?.fallbackLang || "en", [websiteConfig]);
  return fallbackLang;
};
