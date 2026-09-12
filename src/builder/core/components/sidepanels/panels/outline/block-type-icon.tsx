import { BoxIcon } from "@radix-ui/react-icons";
import { get } from "lodash-es";
import React from "react";
import { useRegisteredChaiBlocks } from "~/registry";

type Props = {
  type: string;
};

const ICON_CLASS = "h-3 w-3 flex-shrink-0";

export const TypeIcon: React.FC<Props> = (props) => {
  const allChaiBlocks = useRegisteredChaiBlocks();
  const blockIcon: any = get(allChaiBlocks, [props.type, "icon"]);

  if (blockIcon) {
    return React.createElement(blockIcon, { className: ICON_CLASS });
  }

  // * Fallback Icon
  return <BoxIcon className={ICON_CLASS} />;
};
