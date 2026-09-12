import { LightningBoltIcon } from "@radix-ui/react-icons";
import { useAtom } from "jotai";
import { isEmpty } from "lodash-es";
import { useTranslation } from "react-i18next";
import { usePageExternalData } from "~/builder/atoms/builder";
import { dataBindingActiveAtom } from "~/builder/atoms/ui";
import { cn } from "~/builder/core/functions/common-functions";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

export const DataBinding = () => {
  const pageExternalData = usePageExternalData();
  const dataBindingEnabled = useBuilderProp("flags.dataBinding", true);
  const [dataBindingActive, setDataBindingActive] = useAtom(dataBindingActiveAtom);
  const { t } = useTranslation();
  if (!dataBindingEnabled || isEmpty(pageExternalData)) return null;
  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="rounded-full" variant="ghost" onClick={() => setDataBindingActive(!dataBindingActive)}>
            <LightningBoltIcon className={cn("h-4 w-4", dataBindingActive ? "text-green-500" : "text-gray-500")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("Toggle Data Binding")}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
