import { useWebsiteSetting } from "./use-website-settings";

export const useUnpublishedWebsiteSettings = () => {
  const { data, isLoading } = useWebsiteSetting();
  const changes = data?.appChanges;

  const hasUnpublishedTheme = changes?.includes("THEME");

  const hasUnpublishedDesignToken = changes?.includes("DESIGN_TOKENS");

  const hasUnpublishedSettings = hasUnpublishedTheme || hasUnpublishedDesignToken;

  return {
    hasUnpublishedSettings,
    hasUnpublishedTheme,
    hasUnpublishedDesignToken,
    isLoading,
  };
};
