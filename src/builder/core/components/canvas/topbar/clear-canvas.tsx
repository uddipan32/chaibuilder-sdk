import { EraserIcon } from "@radix-ui/react-icons";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBlocksStoreUndoableActions } from "~/builder/hooks/history/use-blocks-store-undoable-actions";
import { useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/builder/hooks/use-selected-styling-blocks";
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

export const ClearCanvas = ({ children }: { children?: React.ReactNode }) => {
  const { t } = useTranslation();
  const { setNewBlocks } = useBlocksStoreUndoableActions();
  const [, setIds] = useSelectedBlockIds();
  const [, setStyleIds] = useSelectedStylingBlocks();

  const clearCanvas = useCallback(() => {
    setNewBlocks([]);
    setIds([]);
    setStyleIds([]);
  }, [setNewBlocks, setIds, setStyleIds]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children || (
          <Button size="sm" variant="ghost" className="flex items-center">
            <EraserIcon />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className={"border-border"}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">{t("Clear whole canvas?")}</AlertDialogTitle>
          <AlertDialogDescription>{t("Are you sure you want to clear the page?")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-foreground">{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={clearCanvas}>{t("Yes")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
