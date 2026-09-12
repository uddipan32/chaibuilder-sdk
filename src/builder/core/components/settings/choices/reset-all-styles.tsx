import { Cross2Icon, DotsVerticalIcon, ResetIcon } from "@radix-ui/react-icons";
import { isEmpty } from "lodash-es";
import { useTranslation } from "react-i18next";
import { useRemoveAllClassesForBlock } from "~/builder/hooks/use-remove-classes-from-blocks";
import { useResetBlockStyles } from "~/builder/hooks/use-reset-block-styles";
import { useSelectedBlock } from "~/builder/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/builder/hooks/use-selected-styling-blocks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export const ResetStylesButton = () => {
  const { resetAll } = useResetBlockStyles();
  const selectedBlock = useSelectedBlock();
  const [stylingBlocks] = useSelectedStylingBlocks();
  const removeAllClasses = useRemoveAllClassesForBlock();
  const { t } = useTranslation();

  if (!selectedBlock || isEmpty(stylingBlocks)) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="inline-flex rounded-sm p-0.5 hover:bg-gray-300" onClick={(e) => e.stopPropagation()}>
          <DotsVerticalIcon className="h-3 w-3" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" className="border-border text-xs">
        <DropdownMenuItem
          className="flex items-center gap-1 text-xs"
          onClick={() => {
            resetAll();
          }}>
          <ResetIcon className="h-3 w-3" />
          {t("Reset styles")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs"
          onClick={() => {
            if (selectedBlock) {
              removeAllClasses(selectedBlock, true);
            }
          }}>
          <Cross2Icon className="h-3 w-3" />
          {t("Clear styles")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
