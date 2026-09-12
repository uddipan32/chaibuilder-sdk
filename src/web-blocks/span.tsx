import * as React from "react";
import { useInnerHtml } from "~/web-blocks/use-inner-html";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type SpanProps = {
  styles: ChaiStyles;
  content: string;
  tag: string;
};

const SpanBlock = (props: ChaiBlockComponentProps<SpanProps>) => {
  const { blockProps, styles, content, children = null, tag } = props;
  const innerHtml = useInnerHtml(content || "");

  if (children) return React.createElement("span", { ...styles, ...blockProps }, children);

  return React.createElement(tag || "span", {
    ...styles,
    ...blockProps,
    dangerouslySetInnerHTML: innerHtml,
  });
};

const Config = {
  type: "Span",
  description: "A span component",
  label: "Span",
  category: "core",
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      content: {
        type: "string",
        title: "Content",
        default: "",
        ui: { "ui:widget": "textarea", "ui:autosize": true, "ui:rows": 3 },
      },
    },
  }),
  aiProps: ["content"],
  i18nProps: ["content"],
  childrenOverrideProps: ["content"],
  canAcceptBlock: () => true,
};

export { SpanBlock as Component, Config };
