import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUnmarkAsTemplate } from "~/builder/pages/hooks/pages/mutations";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

const UnmarkAsTemplate = ({ page, onClose }: { page: any; onClose: () => void }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const unmarkAsTemplateMutation = useUnmarkAsTemplate();

  const handleAction = () => {
    setIsLoading(true);
    unmarkAsTemplateMutation.mutate(page, {
      onSuccess: () => {
        setIsLoading(false);
        onClose();
      },
      onError: () => {
        setIsLoading(false);
      },
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Unmark as template")}</DialogTitle>
          <DialogDescription className="space-y-1 py-2 text-xs text-muted-foreground">
            {t("Are you sure you want to unmark this page as a template?")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={isLoading ? "pointer-events-none" : ""}>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}>
            {t("Cancel")}
          </Button>
          <Button variant="default" size="sm" disabled={isLoading} onClick={handleAction}>
            {t("Unmark as template")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnmarkAsTemplate;
