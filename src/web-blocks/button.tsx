import { ButtonIcon } from "@radix-ui/react-icons";
import { get, isEmpty } from "lodash-es";
import { createElement } from "react";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { useInnerHtml } from "~/web-blocks/use-inner-html";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type ButtonProps = {
  content: string;
  icon: string;
  iconSize: number;
  iconPos: "order-first" | "order-last";
  styles: ChaiStyles;
  link: {
    href: string;
    target: string;
  };
};

const Component = (props: ChaiBlockComponentProps<ButtonProps>) => {
  const { blockProps, iconSize, icon, content, styles, children, iconPos, link, inBuilder } = props;
  const _icon = icon;
  const iconHtml = useInnerHtml(_icon);

  const child = children || (
    <>
      {content && <span>{content}</span>}
      {_icon && (
        <div
          style={{ width: iconSize + "px" }}
          className={iconPos + " " + (content ? (iconPos === "order-first" ? "mr-2" : "ml-2") : "") || ""}
          dangerouslySetInnerHTML={iconHtml}
        />
      )}
    </>
  );

  const button = createElement(
    "button",
    {
      ...blockProps,
      ...styles,
      type: "button",
      "aria-label": content,
    },
    child,
  );

  if (!isEmpty(get(link, "href"))) {
    if (inBuilder) {
      return <span>{button}</span>;
    } else {
      return (
        <a aria-label={content} href={get(link, "href") || "/"} target={get(link, "target", "_self")}>
          {button}
        </a>
      );
    }
  }

  return button;
};

const Config = {
  type: "Button",
  description: "similar to a button element in HTML",
  label: "Button",
  category: "core",
  icon: ButtonIcon,
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp("dt#btn dt#btn-primary"),
      content: {
        type: "string",
        title: "Button label",
        default: "Button",
      },
      icon: {
        type: "string",
        title: "Icon",
        default: "",
        ui: { "ui:widget": "icon" },
      },
      iconSize: {
        type: "number",
        title: "Icon size",
        default: 16,
      },
      iconPos: {
        type: "string",
        title: "Icon position",
        default: "order-last",
        enum: ["order-first", "order-last"],
        enumNames: ["Left", "Right"],
      },
      link: {
        type: "object",
        properties: {
          type: { type: "string" },
          href: { type: "string" },
          target: { type: "string" },
        },
        default: {
          type: "url",
          href: "",
          target: "_self",
        },
        ui: { "ui:field": "link" },
      },
      prefetchLink: {
        type: "boolean",
        default: true,
        title: "Prefetch Link",
      },
    },
  }),
  i18nProps: ["content", "link"],
  aiProps: ["content"],
  childrenOverrideProps: ["content", "icon", "iconSize", "iconPos"],
};
export { Component, Config };
