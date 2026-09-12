import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";

const PageCreator = lazy(() => import("~/builder/pages/client/components/page-creator"));

const AddNewPage = ({
  addEditPage,
  setAddEditPage,
  closePanel,
}: {
  editPage: (page: string) => void;
  addEditPage: Partial<any>;
  setAddEditPage: any;
  closePanel: () => void;
}) => {
  const { t } = useTranslation();
  const edit = Boolean(addEditPage?.id);
  const isOpen = !!addEditPage;
  return (
    <Dialog open={isOpen} onOpenChange={() => setAddEditPage(undefined)}>
      {isOpen && (
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{edit ? t("Edit") : t("Add New")} </DialogTitle>
            <DialogDescription>
              {edit ? t("Update your page name") : t("Enter details to create a new page")}
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="min-h-40" />}>
            <PageCreator
              closePanel={closePanel}
              addEditPage={addEditPage as any}
              close={() => setAddEditPage(undefined)}
            />
          </Suspense>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default AddNewPage;
