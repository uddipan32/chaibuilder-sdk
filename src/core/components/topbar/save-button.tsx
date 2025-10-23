import { cn } from "@/core/functions/common-functions";
import { useSavePage } from "@/core/hooks";
import { Button } from "@/ui/shadcn/components/ui/button";
import { CheckIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";

export const SaveButton = () => {
  const { savePage, saveState } = useSavePage();
  const { t } = useTranslation();

  const button = (
    <Button
      disabled={saveState === "SAVING"}
      onClick={(e) => {
        e.preventDefault();
        savePage();
      }}
      className={cn(
        "flex h-auto w-fit items-center gap-x-2 p-1 px-2",
        // CHANGED sate
        "bg-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400",
        {
          "animate-pulse bg-gray-300 text-gray-900": saveState === "SAVING",
          "bg-green-500 text-white hover:bg-green-600 hover:text-white dark:bg-green-600 dark:text-white":
            saveState === "SAVED",
        },
      )}
      size="sm"
      variant="outline">
      <CheckIcon className={"h-4 w-4 text-sm text-white"} />
      <span className={"text-sm"}>
        {saveState === "SAVING" ? t("Saving") : saveState === "SAVED" ? t("Saved") : t("Unsaved")}
      </span>
    </Button>
  );
  return <div className="flex items-center">{button}</div>;
};
