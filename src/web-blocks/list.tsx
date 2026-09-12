import { RowsIcon } from "@radix-ui/react-icons";
import { isEmpty } from "lodash-es";
import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";
import EmptySlot from "~/web-blocks/empty-slot";

export type ListBlockProps = {
  styles: ChaiStyles;
  tag?: string;
};

const ListBlock = (props: ChaiBlockComponentProps<ListBlockProps>) => {
  const { blockProps, children, styles, tag, inBuilder } = props;

  if (!children && isEmpty(styles?.className)) {
    return <EmptySlot inBuilder={inBuilder} />;
  }

  return React.createElement(tag ? tag : "ul", { ...blockProps, ...styles }, children);
};

const Config = {
  type: "List",
  description: "A list component",
  label: "List",
  icon: RowsIcon,
  category: "core",
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
    },
  }),
  canAcceptBlock: (blockType: string) => blockType === "ListItem",
  blocks: [
    { _type: "List", _id: "a", styles: "#styles:," },
    {
      _type: "ListItem",
      _id: "b",
      _parent: "a",
      styles: "#styles:,",
      content: "Item 1",
    },
    {
      _type: "ListItem",
      _id: "c",
      _parent: "a",
      styles: "#styles:,",
      content: "Item 2",
    },
    {
      _type: "ListItem",
      _id: "d",
      _parent: "a",
      styles: "#styles:,",
      content: "Item 3",
    },
  ],
};

export { ListBlock as Component, Config };
