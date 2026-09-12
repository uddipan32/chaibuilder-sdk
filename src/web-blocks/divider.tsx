import { DividerHorizontalIcon } from "@radix-ui/react-icons";
import { createElement } from "react";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type DividerBlockProps = {
  styles: ChaiStyles;
};

const DividerBlock = (props: ChaiBlockComponentProps<DividerBlockProps>) => {
  const { blockProps, styles } = props;
  return createElement("hr", { ...styles, ...blockProps });
};

const Config = {
  type: "Divider",
  description: "A horizontal line component",
  label: "Divider",
  category: "core",
  icon: DividerHorizontalIcon,
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("dt#separator"),
    },
  }),
};

export { DividerBlock as Component, Config };
