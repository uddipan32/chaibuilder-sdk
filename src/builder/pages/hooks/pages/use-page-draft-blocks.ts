import { useQuery } from "@tanstack/react-query";
import { ACTIONS } from "~/builder/pages/constants/ACTIONS";
import { useCurrentActivePage, usePrimaryPage } from "~/builder/pages/hooks/pages/use-current-page";
import { useApiUrl } from "~/builder/pages/hooks/project/use-builder-prop";
import { useFallbackLang } from "~/builder/pages/hooks/use-fallback-lang";
import { useFetch } from "~/builder/pages/hooks/utils/use-fetch";
import { useBuilderPageProps } from "./use-builder-page-props";
import { useDynamicPageSlug } from "./use-dynamic-page-selector";

export const useBuilderPageData = () => {
  const { data: currentPage } = usePrimaryPage();
  const { data: activePage } = useCurrentActivePage();
  const apiUrl = useApiUrl();
  const fetchAPI = useFetch();
  const fallbackLang = useFallbackLang();
  const dynamicPageSlug = useDynamicPageSlug();
  const pageProps = useBuilderPageProps();

  return useQuery({
    queryKey: [ACTIONS.GET_BUILDER_PAGE_DATA, activePage?.id, dynamicPageSlug],
    staleTime: Infinity,
    gcTime: 0,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      return fetchAPI(apiUrl, {
        action: ACTIONS.GET_BUILDER_PAGE_DATA,
        data: {
          pageType: currentPage?.pageType,
          lang: activePage?.lang || fallbackLang,
          dynamic: currentPage?.dynamic,
          pageProps,
        },
      });
    },
    enabled: !!currentPage?.pageType && !!activePage.id,
  });
};
