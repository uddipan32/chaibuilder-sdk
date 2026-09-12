import { useEffect, useState } from "react";

export function useSearchParams() {
  const [queryParams, setQueryParams] = useState(new URLSearchParams(window.location.search));
  useEffect(() => {
    const handleUrlChange = () => {
      setQueryParams(new URLSearchParams(window.location.search));
    };

    // Listen to popstate (browser navigation) or any URL changes
    window.addEventListener("popstate", handleUrlChange);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, []);

  return [queryParams, setQueryParams] as const;
}
