import { PlusIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { useIsDragAndDropEnabled } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks";
import { CHAI_BUILDER_EVENTS } from "~/builder/core/events";
import { pubsub } from "~/builder/core/pubsub";
import { usePermissions } from "~/builder/hooks/use-permissions";
import { CHAI_PERMISSIONS } from "~/constants/PERMISSIONS";

export const AddBlockAtBottom = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canAddBlock = hasPermission(CHAI_PERMISSIONS["pages:update"]);
  const isDragAndDropEnabled = useIsDragAndDropEnabled();

  if (!canAddBlock) return null;

  return (
    <div id="add-block-bottom" className="group relative w-full cursor-pointer py-2">
      <br />
      {!isDragAndDropEnabled && (
        <div
          role="button"
          onClick={() => pubsub.publish(CHAI_BUILDER_EVENTS.OPEN_ADD_BLOCK)}
          className="block h-1 rounded bg-primary opacity-0 duration-200 group-hover:opacity-100">
          <div className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center gap-x-1 rounded-full bg-primary px-3 py-1 text-xs leading-tight text-white hover:bg-primary">
            <PlusIcon className="size-2.5 stroke-[3]" /> {t("Add block")}
          </div>
        </div>
      )}
      <br />
      <br />
      <br />
      <br />
    </div>
  );
};
