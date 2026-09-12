import { DotsVerticalIcon } from "@radix-ui/react-icons";
import { find, get, isEmpty, map, startCase } from "lodash-es";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getSplitChaiClasses } from "~/builder/hooks/get-split-classes";
import { useRemoveClassesFromBlocks } from "~/builder/hooks/use-remove-classes-from-blocks";
import { useResetBlockStyles } from "~/builder/hooks/use-reset-block-styles";
import { useSelectedBlock, useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/builder/hooks/use-selected-styling-blocks";
import { CHAI_SLOT_IDS, ChaiSlot } from "~/builder/register-apis";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { StylingPropSelect } from "./styling-prop-select";

export const BlockStylingProps = () => {
  const selectedBlock = useSelectedBlock();
  const [stylingBlocks, setStylingBlocks] = useSelectedStylingBlocks();
  const removeClassesFromBlocks = useRemoveClassesFromBlocks();
  const [selectedIds] = useSelectedBlockIds();
  const { t } = useTranslation();
  const { reset } = useResetBlockStyles();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  if (!selectedBlock) return null;
  // find all styles props of selected block by checking for value of each prop as string and starts with #styles:
  const stylesProps = Object.keys(selectedBlock).filter(
    (prop) => typeof selectedBlock[prop] === "string" && selectedBlock[prop].startsWith("#styles:"),
  );
  const hasStyles = !isEmpty(stylesProps) && stylesProps.length > 1;
  if (!hasStyles) return null;

  const prop = get(selectedBlock, stylingBlocks[0]?.prop, "");
  const { classes: classesString = "" } = getSplitChaiClasses(prop) || {};
  const classes = classesString ? classesString.split(" ").filter((cls) => !isEmpty(cls)) : [];

  const isSelected = (prop: string) => {
    return find(stylingBlocks, (block) => block.prop === prop);
  };

  const currentSelectedProp = stylingBlocks[0]?.prop || stylesProps[0];

  return (
    <>
      <div className="flex items-center justify-between">
        <Badge
          variant="inactive"
          className="group relative mt-1 rounded-sm border-none bg-transparent px-0 pr-2 text-xs font-medium hover:bg-transparent">
          {t("Style Elements")}:
        </Badge>
        <span>
          <ChaiSlot slotId={CHAI_SLOT_IDS.BLOCK_STYLING_ELEMENTS} />
        </span>
      </div>
      <div className="flex flex-wrap gap-1 pb-2 pt-1">
        {stylesProps.length <= 2 ? (
          // Flex layout for 2 or fewer items
          map(stylesProps, (prop) => {
            const selected = isSelected(prop);
            return (
              <Badge
                key={prop}
                variant={selected ? "active" : "inactive"}
                className="group relative rounded-sm py-0 pl-2 pr-0"
                onClick={() => {
                  setStylingBlocks([
                    {
                      id: `${prop}-${selectedBlock._id}`,
                      blockId: selectedBlock._id,
                      prop,
                    },
                  ]);
                }}>
                {startCase(prop)}
                <DropdownMenu open={openDropdown === prop} onOpenChange={(open) => setOpenDropdown(open ? prop : null)}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => e.stopPropagation()}
                      className={`h-full w-max rounded rounded-l-none border-l px-0.5 duration-300 ${selected ? "bg-primary/10 text-primary-foreground hover:bg-primary" : "bg-background/20 hover:bg-background"}`}>
                      <DotsVerticalIcon className="!h-3 !w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" align="end">
                    <DropdownMenuGroup
                      className="line-clamp-1 max-w-32 px-2 py-1 text-xs text-muted"
                      aria-label={startCase(prop)}>
                      {startCase(prop)}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={() => {
                        reset(prop);
                        setOpenDropdown(null);
                      }}>
                      {t("Reset style")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={() => {
                        removeClassesFromBlocks(selectedIds, classes, true);
                        setOpenDropdown(null);
                      }}>
                      {t("Clear styles")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Badge>
            );
          })
        ) : (
          // Dropdown select for more than 2 items
          <StylingPropSelect
            value={currentSelectedProp}
            options={stylesProps}
            onValueChange={(value) => {
              setStylingBlocks([
                {
                  id: `${value}-${selectedBlock._id}`,
                  blockId: selectedBlock._id,
                  prop: value,
                },
              ]);
            }}
          />
        )}
      </div>
      <div className="mt-2 h-px w-full border-b bg-transparent" />
    </>
  );
};
