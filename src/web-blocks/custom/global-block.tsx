import { FrameIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { registerChaiBlockProps } from "~/registry";
import { ChaiBlockComponentProps } from "~/types/blocks";

export type GlobalBlockProps = {
  globalBlock: string;
};

const Component = (props: ChaiBlockComponentProps<GlobalBlockProps>) => {
  const { blockProps, inBuilder, children, globalBlock } = props;
  if (inBuilder && !globalBlock) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-y-1 rounded-lg bg-gray-100 py-4 dark:bg-gray-800"
        {...blockProps}>
        <h1>Global Block - {globalBlock}</h1>
        <p>Choose a block from the sidebar to add it to this page.</p>
      </div>
    );
  }
  return React.createElement("span", { ...blockProps }, children);
};

const Config = {
  type: "GlobalBlock",
  description: "A global block component",
  label: "Global Block",
  icon: FrameIcon,
  category: "core",
  group: "basic",
  hidden: true,
  props: registerChaiBlockProps({
    properties: {
      globalBlock: {
        type: "string",
        title: "Global Block",
        default: "",
        ui: { "ui:widget": "hidden" },
      },
    },
  }),
};

export { Component, Config };
