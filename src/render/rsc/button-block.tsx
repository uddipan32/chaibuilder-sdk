import { get, isEmpty } from "lodash-es";
import Link from "next/link";
import * as React from "react";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types";

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

export const ButtonBlock = (props: ChaiBlockComponentProps<ButtonProps>) => {
  const { blockProps, iconSize, icon, content, styles, children, iconPos, link, prefetchLink } = props;
  const _icon = icon;

  const child = children || (
    <>
      {content && <span>{content}</span>}
      {_icon && (
        <div
          style={{ width: iconSize + "px" }}
          className={iconPos + " " + (content ? (iconPos === "order-first" ? "mr-2" : "ml-2") : "") || ""}
          dangerouslySetInnerHTML={{ __html: _icon }}
        />
      )}
    </>
  );

  // No aria-label from `content`: without children the content is already the
  // visible label, and with children it may be a stale schema default that
  // would override the real accessible name. Author-set aria-labels still
  // arrive via the blockProps/styles spreads.
  const button = React.createElement(
    "button",
    {
      ...blockProps,
      ...styles,
      type: "button",
    },
    child,
  );

  const hrefValue = get(link, "href");
  if (!isEmpty(hrefValue)) {
    const href = link?.type === "telephone" ? `tel:${formatTelephoneLink(hrefValue)}` : hrefValue;
    return (
      <Link
        aria-label={content}
        href={href || "/"}
        target={get(link, "target", "_self")}
        {...(prefetchLink ? { prefetch: true } : {})}>
        {button}
      </Link>
    );
  }

  return button;
};
