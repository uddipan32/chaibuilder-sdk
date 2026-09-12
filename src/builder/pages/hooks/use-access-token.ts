import { useCallback } from "react";
import { usePagesProp } from "~/builder/pages/hooks/project/use-builder-prop";

export const useAccessToken = () => {
  const getAccessTokenFn = usePagesProp("getAccessToken");
  return {
    getAccessToken: useCallback(async () => {
      try {
        return await getAccessTokenFn();
      } catch {
        return "";
      }
    }, [getAccessTokenFn]),
  };
};
