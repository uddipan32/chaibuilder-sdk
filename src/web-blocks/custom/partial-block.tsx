import { FrameIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { registerChaiBlockProps } from "~/registry";
import { ChaiBlockComponentProps } from "~/types/blocks";

export type PartialBlockProps = {
  partialBlockId: string;
};

const Component = (props: ChaiBlockComponentProps<PartialBlockProps>) => {
  const { blockProps, inBuilder, children, partialBlockId } = props;
  if (inBuilder && !partialBlockId) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-y-1 rounded-lg bg-gray-100 py-4 dark:bg-gray-800"
        {...blockProps}>
        <h1>Partial Block - {partialBlockId}</h1>
        <p>Choose a block from the sidebar to add it to this page.</p>
      </div>
    );
  }
  return React.createElement("span", { ...blockProps }, children);
};

const Config = {
  type: "PartialBlock",
  description: "A partial block component. Partial blocks are global blocks that can be used in multiple pages.",
  label: "Partial Block",
  icon: FrameIcon,
  category: "core",
  group: "basic",
  hidden: true,
  props: registerChaiBlockProps({
    properties: {
      partialBlockId: {
        type: "string",
        title: "Partial Block",
        default: "",
        ui: { "ui:widget": "hidden" },
      },
    },
  }),
};

export { Component as PartialBlock, Config as PartialBlockConfig };
