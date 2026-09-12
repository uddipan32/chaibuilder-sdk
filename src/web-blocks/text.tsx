import { SpaceBetweenVerticallyIcon } from "@radix-ui/react-icons";

import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type TextBlockProps = {
  styles: ChaiStyles;
  content: string;
  forceWrapper?: boolean;
};

const RawTextBlock = (props: ChaiBlockComponentProps<TextBlockProps>) => {
  if (props.inBuilder || props.forceWrapper) {
    return <span {...props.blockProps}>{props.content}</span>;
  }
  return `${props.content}`;
};

const Config = {
  type: "Text",
  description: "A text component with no styling",
  label: "Text",
  category: "core",
  group: "typography",
  blocks: () => [{ _id: "a", _type: "Text", _name: "Text", content: "" }],
  icon: SpaceBetweenVerticallyIcon,
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("text-black"),
      content: {
        title: "Content",
        type: "string",
        default: "",
      },
    },
  }),
  aiProps: ["content"],
  i18nProps: ["content"],
};

export { RawTextBlock as Component, Config };
