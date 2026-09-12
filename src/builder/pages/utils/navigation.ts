/**
 * Navigate with URL params update and popstate dispatch
 * @param params URLSearchParams to set
 * @param setQueryParams state setter function
 * @param useReplace whether to use replaceState instead of pushState
 */
export function navigateToPage(
  params: URLSearchParams,
  setQueryParams: (params: URLSearchParams) => void,
  useReplace = false,
) {
  const url = params.toString() ? `?${params.toString()}` : "/";

  if (useReplace) {
    window.history.replaceState(null, "", url);
  } else {
    window.history.pushState({}, "", url);
  }

  setQueryParams(params);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
