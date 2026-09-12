import { LetterCaseToggleIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { useInnerHtml } from "~/web-blocks/use-inner-html";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type LabelProps = {
  content: string;
  styles: ChaiStyles;
};

export const LabelBlock = (props: ChaiBlockComponentProps<LabelProps>) => {
  const { blockProps, content, styles, children } = props;
  const innerHtml = useInnerHtml(content);
  const labelProps = { ...styles, ...blockProps };

  if (children) return React.createElement("label", labelProps, children);
  return React.createElement("label", {
    ...labelProps,
    dangerouslySetInnerHTML: innerHtml,
  });
};
const Config = {
  type: "Label",
  label: "Label",
  category: "core",
  icon: LetterCaseToggleIcon,
  group: "form",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("dt#label"),
      content: {
        type: "string",
        title: "Content",
        default: "",
      },
    },
  }),
  aiProps: ["content"],
  i18nProps: ["content"],
};

export { LabelBlock as Component, Config };
