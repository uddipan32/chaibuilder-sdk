import { useCallback } from "react";
import { useSearchParams } from "./utils/use-search-params";

export const useChangePage = () => {
  const [, setQueryParams] = useSearchParams();
  return useCallback(
    (page: string, callback?: () => void) => {
      const params = new URLSearchParams(window.location.search);
      const lang = params.get("lang");
      const newParams = new URLSearchParams({ page });
      if (lang) newParams.set("lang", lang);

      window.history.pushState({}, "", `?${newParams.toString()}`);
      setQueryParams(newParams);
      window.dispatchEvent(new PopStateEvent("popstate"));
      callback?.();
    },
    [setQueryParams],
  );
};
