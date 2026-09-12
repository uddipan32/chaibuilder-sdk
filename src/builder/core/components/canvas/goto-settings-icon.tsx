import { GearIcon } from "@radix-ui/react-icons";
import { CHAI_BUILDER_EVENTS } from "~/builder/core/events";
import { pubsub } from "~/builder/core/pubsub";

interface GotoSettingsIconProps {
  blockId?: string;
  className?: string;
}

export const GotoSettingsIcon = ({ blockId, className }: GotoSettingsIconProps) => {
  const handleClick = () => {
    if (blockId) {
      pubsub.publish(CHAI_BUILDER_EVENTS.GOTO_BLOCK_SETTINGS, blockId);
    }
  };

  return <GearIcon className={className} onClick={handleClick} />;
};
