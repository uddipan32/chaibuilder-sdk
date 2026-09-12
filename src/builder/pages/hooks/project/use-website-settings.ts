import { useQuery } from "@tanstack/react-query";
import { defaultThemeValues } from "~/builder/hooks/default-theme-options";
import { ACTIONS } from "~/builder/pages/constants/ACTIONS";
import { useFetch } from "~/builder/pages/hooks/utils/use-fetch";
import { ChaiWebsiteSetting } from "~/types/actions";
import { useApiUrl } from "./use-builder-prop";

export const useWebsiteSetting = () => {
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  return useQuery<ChaiWebsiteSetting>({
    queryKey: [ACTIONS.GET_WEBSITE_DRAFT_SETTINGS],
    staleTime: 5 * 60 * 1000,
    placeholderData: {
      languages: [],
      theme: defaultThemeValues,
      appKey: "",
      fallbackLang: "",
      settings: {},
      designTokens: {},
    },
    queryFn: async () => {
      return (await fetchAPI(apiUrl, {
        action: ACTIONS.GET_WEBSITE_DRAFT_SETTINGS,
        data: { draft: true },
      })) as ChaiWebsiteSetting;
    },
  });
};
