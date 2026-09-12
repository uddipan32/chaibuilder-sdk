import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
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

export interface DeleteDesignTokenProps {
  tokenName: string;
  tokenValue: string;
  onDelete: () => void;
  children: ReactNode;
}

const DeleteDesignToken = ({ tokenName, tokenValue, onDelete, children }: DeleteDesignTokenProps) => {
  const { t } = useTranslation();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">
            {t("Delete")} &quot;{tokenName}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-1 text-sm">
              <p className="text-muted-foreground">
                {t("This action cannot be undone. This will permanently remove the design token from your project.")}
              </p>
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="mb-1 text-xs font-medium text-foreground">{t("Token classes")}</p>
                <p className="font-mono text-xs text-muted-foreground">{tokenValue}</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-7 text-xs">{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="h-7 bg-destructive text-xs text-destructive-foreground hover:bg-destructive/90">
            {t("Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteDesignToken;
