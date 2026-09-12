import { usePagesProp } from "./project/use-builder-prop";

export const useChaiAuth = () => {
  const currentUser = usePagesProp("currentUser");
  const onLogout = usePagesProp("onLogout");

  return {
    isLoggedIn: !!currentUser,
    user: currentUser,
    logout: onLogout,
  } as const;
};
