import { get, isEmpty } from "lodash-es";
import * as React from "react";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types";
import { useInnerHtml } from "~/web-blocks/use-inner-html";

type ButtonProps = {
  content: string;
  icon: string;
  iconSize: number;
  iconPos: "order-first" | "order-last";
  styles: ChaiStyles;
  link: {
    type: "page" | "pageType" | "url" | "email" | "telephone" | "element";
    href: string;
    target: string;
  };
  prefetchLink?: boolean;
};

const formatTelephoneLink = (href: string) => {
  return href.replace(/[^\d]/g, "");
};

export const GenericButtonBlock = (props: ChaiBlockComponentProps<ButtonProps>) => {
  const { blockProps, iconSize, icon, content, styles, children, iconPos, link } = props;
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

  const button = React.createElement(
    "button",
    {
      ...blockProps,
      ...styles,
      type: "button",
      "aria-label": content,
    },
    child,
  );

  const hrefValue = get(link, "href");
  if (!isEmpty(hrefValue)) {
    const href = link?.type === "telephone" ? `tel:${formatTelephoneLink(hrefValue)}` : hrefValue;
    const target = get(link, "target", "_self");
    return (
      <a
        aria-label={content}
        href={href || "/"}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}>
        {button}
      </a>
    );
  }

  return button;
};
