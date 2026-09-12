import { createElement } from "react";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type LineBreakProps = {
  styles: ChaiStyles;
};

const LineBreakBlock = (props: ChaiBlockComponentProps<LineBreakProps>) => {
  const { blockProps, styles } = props;

  return createElement("br", { ...blockProps, ...styles });
};

const Config = {
  type: "LineBreak",
  label: "Line Break",
  category: "core",
  group: "basic",
  hidden: true,
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
    },
  }),
};

export { LineBreakBlock as Component, Config };
