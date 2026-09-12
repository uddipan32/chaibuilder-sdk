import { isFunction, noop } from "lodash-es";
import { CircleUser, Moon, Sun } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBuilderTheme } from "~/builder/hooks/use-builder-theme";
import { usePagesProp } from "~/builder/pages/hooks/project/use-builder-prop";
import { useChaiAuth } from "~/builder/pages/hooks/use-chai-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { Loading } from "~/components/ui/loader";

const ChangePasswordModal = lazy(() =>
  import("./change-password-modal").then((mod) => ({
    default: mod.ChangePasswordModal,
  })),
);
export const userInfoPanelId = "user-info";

export const UserInfoButton = () => {
  const { t } = useTranslation();
  const { user, logout } = useChaiAuth();
  const onLogout = usePagesProp<() => void | undefined>("onLogout", noop);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [theme, setTheme] = useBuilderTheme();

  if (!user) return null;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 focus-within:bg-primary/30 hover:bg-primary/30 focus:bg-primary/30 active:bg-primary/30">
          <CircleUser className="h-5 w-5" />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto space-y-2 p-4">
        <div className="text-sm font-medium">{user.name ?? user.email}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? t("Light mode") : t("Dark mode")}
        </Button>

        <Button variant="outline" size="sm" className="w-full" onClick={() => setChangePasswordOpen(true)}>
          {t("Change Password")}
        </Button>

        {changePasswordOpen && (
          <Suspense
            fallback={
              <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <div className="flex h-[340px] items-center justify-center">
                    <Loading />
                  </div>
                </DialogContent>
              </Dialog>
            }>
            <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
          </Suspense>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              {t("Logout")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Are you sure you want to logout?")}</AlertDialogTitle>
              <AlertDialogDescription>{t("You will be redirected to the login page.")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  logout();
                  if (isFunction(onLogout)) {
                    onLogout();
                  }
                }}>
                {t("Logout")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </HoverCardContent>
    </HoverCard>
  );
};

export const userInfoPanel = {
  id: userInfoPanelId,
  label: "User Info",
  button: UserInfoButton,
  position: "bottom" as const,
};
