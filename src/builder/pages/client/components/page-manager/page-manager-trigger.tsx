import { Files } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSavePage } from "~/builder/hooks/use-save-page";
import { useSetPageManagerAtom } from "~/builder/pages/atom/page-manager";
import { usePageLockStatus } from "~/builder/pages/client/realtime";
import { useIsPublishing } from "~/builder/pages/hooks/pages/mutations";
import Tooltip from "~/builder/pages/utils/tooltip";
import { Button } from "~/components/ui/button";

const PagesManagerTrigger = ({ children }: { children?: React.ReactNode }) => {
  const { t } = useTranslation();
  const setPageManager = useSetPageManagerAtom();
  const { savePage } = useSavePage();
  const { isLocked } = usePageLockStatus();
  // Publishing saves the current page first, so switching away mid-publish would
  // save and publish the wrong blocks. The manager is the only way to pick another
  // page, and its sheet is modal, so blocking it here keeps the list unreachable.
  const isPublishing = useIsPublishing();

  return (
    <Tooltip
      content={isPublishing ? t("Publishing…") : t("Open pages manager")}
      onClick={() => {
        if (isPublishing) return;
        if (!isLocked) savePage();
        setPageManager(true);
      }}>
      {children || (
        <Button variant="ghost" size="sm" disabled={isPublishing}>
          <Files />
          {t("Pages")}
        </Button>
      )}
    </Tooltip>
  );
};

export default PagesManagerTrigger;
