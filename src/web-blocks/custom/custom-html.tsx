import { CodeIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";
import { useInnerHtml } from "~/web-blocks/use-inner-html";

const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

const CustomHTMLBlock = (props: ChaiBlockComponentProps<{ htmlCode: string; styles: ChaiStyles }>) => {
  const { blockProps, styles, htmlCode, inBuilder } = props;
  // In the builder, scripts are stripped from the preview; hooks run unconditionally.
  const innerHtml = useInnerHtml(inBuilder ? htmlCode.replace(SCRIPT_TAG_REGEX, "") : htmlCode);

  return inBuilder ? (
    <div className={"relative"} {...blockProps}>
      {inBuilder ? <div {...styles} className="absolute z-20 h-full w-full" /> : null}
      {React.createElement("div", {
        ...styles,
        dangerouslySetInnerHTML: innerHtml,
      })}
    </div>
  ) : (
    React.createElement("div", {
      ...blockProps,
      ...styles,
      dangerouslySetInnerHTML: innerHtml,
    })
  );
};

const Config = {
  type: "CustomHTML",
  description: "similar to a div or section elements in HTML",
  label: "Custom HTML",
  category: "core",
  icon: CodeIcon,
  group: "advanced",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      htmlCode: {
        type: "string",
        default: "<div><p>Enter your HTML code here...</p></div>",
        ui: { "ui:widget": "code" },
      },
    },
  }),
  i18nProps: ["htmlCode"],
};

export { CustomHTMLBlock as Component, Config };
export type CustomHTMLBlockProps = { htmlCode: string; styles: ChaiStyles };
