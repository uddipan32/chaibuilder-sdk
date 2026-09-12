import { EyeClosedIcon } from "@radix-ui/react-icons";
import React, { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "~/builder/core/functions/common-functions";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { usePreviewMode } from "~/builder/hooks/use-preview-mode";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

export const PreviewScreen = () => {
  const [isPreviewOn, setPreviewMode] = usePreviewMode();
  const { t } = useTranslation();
  const previewComponent = useBuilderProp("previewComponent", null);
  if (!isPreviewOn) return null;
  return (
    <div className={cn("bg-surface fixed inset-0 z-[999]", isPreviewOn ? "block" : "hidden")}>
      <Button size="sm" className="absolute right-0 top-0 m-4 space-x-2" onClick={() => setPreviewMode(false)}>
        <EyeClosedIcon />
        <span>{t("Close Preview")}</span>
      </Button>
      <div>
        {previewComponent ? (
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>{React.createElement(previewComponent)}</Suspense>
        ) : null}
      </div>
    </div>
  );
};
