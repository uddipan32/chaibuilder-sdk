import { SketchLogoIcon } from "@radix-ui/react-icons";
import { isEmpty } from "lodash-es";
import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";
import EmptySlot from "~/web-blocks/empty-slot";
import { addForcedClasses } from "~/web-blocks/helper";
import { useInnerHtml } from "~/web-blocks/use-inner-html";

export type IconBlockProps = {
  styles: ChaiStyles;
  icon: string;
  width: number;
  height: number;
};

const IconBlock = (props: ChaiBlockComponentProps<IconBlockProps>) => {
  const { blockProps, icon, styles, width, inBuilder, height } = props;
  const iStyles = addForcedClasses(styles, "");
  const svg = isEmpty(icon) ? "" : icon.replace(/<svg /g, '<svg class="w-[inherit] h-[inherit]" ');
  const svgHtml = useInnerHtml(svg);

  if (isEmpty(icon)) {
    return <EmptySlot inBuilder={inBuilder} className="h-8 w-14" />;
  }

  return React.createElement("span", {
    ...blockProps,
    ...iStyles,
    style: {
      width: width ? `${width}px` : "auto",
      height: height ? `${height}px` : "auto",
    },
    dangerouslySetInnerHTML: svgHtml,
  });
};

const Config = {
  type: "Icon",
  label: "web_blocks.icon",
  category: "core",
  description: "Icon block is used to display an icon/svg.",
  icon: SketchLogoIcon,
  group: "media",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      icon: {
        type: "string",
        title: "Icon",
        default: `<svg xmlns="http://www.w3.org/2000/svg" class="chai-default-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-diamond-icon lucide-diamond"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/></svg>`,
        ui: { "ui:widget": "icon" },
      },
      width: {
        type: "number",
        default: 16,
        title: "Width",
      },
      height: {
        type: "number",
        default: 16,
        title: "Height",
      },
    },
  }),
};

export { IconBlock as Component, Config };
