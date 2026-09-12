import { useTranslation } from "react-i18next";
import { useUnpublishPage } from "~/builder/pages/hooks/pages/mutations";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

const UnpublishPage = ({ page, onClose }: { page: any; onClose: () => void }) => {
  const { t } = useTranslation();
  const { mutate: unpublishPage, isPending: isUnpublishing } = useUnpublishPage();

  const handleUnpublish = async () => {
    unpublishPage(page, { onSuccess: onClose });
  };

  return (
    <Dialog open={!!page} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Confirm action")}</DialogTitle>
          <DialogDescription>
            {t("Are you sure you want to unpublish")} <b>{page?.name ?? page?.slug}</b>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button variant="destructive" disabled={isUnpublishing} onClick={handleUnpublish}>
            {isUnpublishing ? t("Updating...") : t("Unpublish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnpublishPage;
