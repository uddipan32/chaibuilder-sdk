import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { usePagesProp } from "~/builder/pages/hooks/project/use-builder-prop";
import { useChangePassword } from "~/builder/pages/hooks/utils/use-change-password";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Loading } from "~/components/ui/loader";

type ChangePasswordModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const createPasswordSchema = (t: (key: string) => string) =>
  z
    .object({
      oldPassword: z.string().min(1, t("Current password is required")),
      newPassword: z
        .string()
        .min(8, t("Password must be at least 8 characters"))
        .max(128, t("Password must be less than 128 characters"))
        .regex(/[A-Z]/, t("Password must contain at least one uppercase letter"))
        .regex(/[a-z]/, t("Password must contain at least one lowercase letter"))
        .regex(/[0-9]/, t("Password must contain at least one number"))
        .regex(/[!@#$%^&*(),.?":{}|<>]/, t("Password must contain at least one special character")),
      confirmPassword: z.string().min(1, t("Confirm password is required")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("New password and confirm password do not match"),
      path: ["confirmPassword"],
    })
    .refine((data) => data.oldPassword !== data.newPassword, {
      message: t("New password must be different from current password"),
      path: ["newPassword"],
    });

export const ChangePasswordModal = ({ open, onOpenChange }: ChangePasswordModalProps) => {
  const { t } = useTranslation();
  const currentUser = usePagesProp<{ email?: string } | null>("currentUser", null);
  const { mutate: changePassword, isPending, isSuccess, reset } = useChangePassword();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    reset();
  }, [reset]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    },
    [onOpenChange, resetForm],
  );

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        handleOpenChange(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, handleOpenChange]);

  const handleChangePassword = () => {
    setError(null);

    const trimmedData = {
      oldPassword: oldPassword.trim(),
      newPassword: newPassword.trim(),
      confirmPassword: confirmPassword.trim(),
    };

    const schema = createPasswordSchema(t);
    const result = schema.safeParse(trimmedData);

    if (!result.success) {
      setError(result.error.issues[0]?.message || t("Validation failed"));
      return;
    }

    if (!currentUser?.email) {
      setError(t("User email not found"));
      return;
    }

    changePassword(
      {
        email: currentUser.email,
        oldPassword: result.data.oldPassword,
        newPassword: result.data.newPassword,
        confirmPassword: result.data.confirmPassword,
      },
      {
        onError: (err: any) => {
          setError(err?.message || t("Failed to change password"));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {isPending ? (
          <div className="flex h-[340px] items-center justify-center">
            <Loading />
          </div>
        ) : isSuccess ? (
          <div className="flex h-[340px] flex-col items-center justify-center gap-2">
            <div className="rounded-full bg-green-100 p-3">
              <svg className="text-success h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium">{t("Password updated successfully")}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("Change Password")}</DialogTitle>
              <DialogDescription>{t("Enter your current password and a new password.")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1">
                <Label htmlFor="old-password">{t("Current Password")}</Label>
                <Input
                  id="old-password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={t("Enter current password")}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="new-password">{t("New Password")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("Enter new password")}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="confirm-password">{t("Confirm Password")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("Confirm new password")}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                {t("Cancel")}
              </Button>
              <Button onClick={handleChangePassword} disabled={isPending}>
                {t("Change Password")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
