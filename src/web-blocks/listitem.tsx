import { ColumnsIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { useInnerHtml } from "~/web-blocks/use-inner-html";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type ListItemBlockProps = {
  styles: ChaiStyles;
  content: string;
  tag?: string;
};

export const ListItemBlock = (props: ChaiBlockComponentProps<ListItemBlockProps>) => {
  const { blockProps, content, styles, children, tag } = props;
  const innerHtml = useInnerHtml(content);
  if (!children) {
    return React.createElement(tag || "li", {
      ...styles,
      ...blockProps,
      dangerouslySetInnerHTML: innerHtml,
    });
  }
  return React.createElement(tag || "li", { ...styles, ...blockProps }, children);
};

const Config = {
  type: "ListItem",
  description: "A list item component",
  label: "List Item",
  icon: ColumnsIcon,
  category: "core",
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      content: {
        type: "string",
        default: "List item",
        title: "Content",
        ui: {
          "ui:widget": "textarea",
        },
      },
    },
  }),
  i18nProps: ["content"],
  aiProps: ["content"],
  childrenOverrideProps: ["content"],
  canAcceptBlock: (type: string) => type !== "ListItem",
  canBeNested: (type: string) => type === "List" || type === "Repeater",
};

export { ListItemBlock as Component, Config };
