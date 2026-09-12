import { LinkBreak2Icon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { useSelectedBlock } from "~/builder/hooks/use-selected-blockIds";
import { useUpdateBlocksProps } from "~/builder/hooks/use-update-blocks-props";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";

export const UnlinkLibraryBlock = ({ MenuItem = DropdownMenuItem }: { MenuItem?: React.ComponentType<any> }) => {
  const { t } = useTranslation();
  const selectedBlock = useSelectedBlock();
  const updateBlocksProps = useUpdateBlocksProps();

  const handleUnlink = () => {
    if (!selectedBlock) return;
    updateBlocksProps([selectedBlock._id], {
      _libBlockId: null,
    });
  };

  return (
    <MenuItem onClick={handleUnlink} className="flex items-center gap-x-2 text-xs">
      <LinkBreak2Icon className="h-4 w-4" /> {t("Unlink from library")}
    </MenuItem>
  );
};
