import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ACTIONS } from "~/builder/pages/constants/ACTIONS";
import { useCurrentActivePage } from "./pages/use-current-page";
import { useApiUrl } from "./project/use-builder-prop";
import { useFetch } from "./utils/use-fetch";

export const useUpdateActivePageMetadata = () => {
  const apiUrl = useApiUrl();
  const fetch = useFetch();
  const { data: currentPage } = useCurrentActivePage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (metadata: Record<string, any>) => {
      if (!currentPage?.id) {
        throw new Error("No active page found");
      }
      return await fetch(`${apiUrl}`, {
        action: ACTIONS.UPDATE_PAGE_METADATA,
        data: {
          id: currentPage.id,
          metadata,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ACTIONS.GET_BUILDER_PAGE_DATA],
      });
      queryClient.invalidateQueries({
        queryKey: [ACTIONS.GET_LANGUAGE_PAGES],
      });
    },
    onError: () => {
      console.error("Failed to update metadata");
    },
  });
};
