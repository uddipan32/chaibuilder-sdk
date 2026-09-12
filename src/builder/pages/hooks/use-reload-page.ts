import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSavePage } from "~/builder/hooks/use-save-page";
import { usePageLockStatus } from "~/builder/pages/client/realtime";
import { ACTIONS } from "~/builder/pages/constants/ACTIONS";

export const useReloadPage = () => {
  const { savePageAsync } = useSavePage();
  const queryClient = useQueryClient();
  const { isLocked } = usePageLockStatus();
  return useCallback(async () => {
    if (!isLocked) await savePageAsync();
    queryClient.invalidateQueries({ queryKey: [ACTIONS.GET_PAGE_ALL_DATA] });
    queryClient.invalidateQueries({
      queryKey: [ACTIONS.GET_BUILDER_PAGE_DATA],
    });
  }, [savePageAsync, queryClient, isLocked]);
};

export const useClearAll = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.clear();
  }, [queryClient]);
};
